from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.core.exceptions import ValidationError as DjangoValidationError
from pydantic import ValidationError as PydanticValidationError

from ..models import Tenancy, Renter, Household, User, TenantInvitation
from ..serializers import (
    TenancySerializer,
    TenancyListSerializer,
    RenterSerializer,
)
from ..schemas import (
    TenancyCreateSchema,
    TenancyUpdateSchema,
    AddRenterSchema,
    StartMoveoutSchema,
)
from .households import send_invitation_email


class TenancyViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tenancies."""

    serializer_class = TenancySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return tenancies based on user role."""
        user = self.request.user

        if user.is_admin():
            # Admins see all tenancies
            return Tenancy.objects.all()
        elif user.is_landlord():
            # Landlords see tenancies for their households
            return Tenancy.objects.filter(household__landlord=user)
        else:
            # Tenants see only tenancies they're part of
            return Tenancy.objects.filter(renters__user=user).distinct()

    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return TenancyListSerializer
        return TenancySerializer

    def list(self, request, *args, **kwargs):
        """List tenancies with optional filtering."""
        queryset = self.get_queryset()

        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by household if provided
        household_id = request.query_params.get('household')
        if household_id:
            queryset = queryset.filter(household_id=household_id)

        # Search by household name or renter name
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(household__name__icontains=search) |
                models.Q(renters__user__first_name__icontains=search) |
                models.Q(renters__user__last_name__icontains=search) |
                models.Q(renters__user__email__icontains=search)
            ).distinct()

        queryset = queryset.select_related('household').prefetch_related('renters__user')

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'results': serializer.data
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new tenancy."""
        try:
            # Validate with Pydantic
            data_dict = request.data.copy()
            create_schema = TenancyCreateSchema(**data_dict)

            # Check household exists and user has permission
            household = get_object_or_404(Household, id=create_schema.household_id)

            if not request.user.is_admin() and household.landlord != request.user:
                return Response({
                    'success': False,
                    'error': 'You do not have permission to create tenancies for this household.'
                }, status=status.HTTP_403_FORBIDDEN)

            # Create tenancy
            tenancy_data = {
                'household': household,
                'start_date': create_schema.start_date,
                'end_date': create_schema.end_date,
                'monthly_rent': create_schema.monthly_rent,
                'deposit': create_schema.deposit,
                'status': create_schema.status,
            }

            tenancy = Tenancy(**tenancy_data)

            # Validate (includes checking active constraint)
            try:
                tenancy.full_clean()
            except DjangoValidationError as e:
                return Response({
                    'success': False,
                    'error': str(e.message_dict) if hasattr(e, 'message_dict') else str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

            tenancy.save()

            # Add initial renters if provided
            if create_schema.renters:
                for renter_data in create_schema.renters:
                    self._add_renter_to_tenancy(
                        tenancy=tenancy,
                        email=renter_data.email,
                        first_name=renter_data.first_name,
                        last_name=renter_data.last_name,
                        is_primary=renter_data.is_primary,
                        invited_by=request.user
                    )

            serializer = TenancySerializer(tenancy)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)

        except PydanticValidationError as e:
            return Response({
                'success': False,
                'errors': e.errors()
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single tenancy with renters."""
        tenancy = self.get_object()
        serializer = self.get_serializer(tenancy)
        return Response({
            'success': True,
            'data': serializer.data
        })

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update a tenancy."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to update this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            # Validate with Pydantic
            update_schema = TenancyUpdateSchema(**request.data)

            # Update fields
            if update_schema.start_date is not None:
                tenancy.start_date = update_schema.start_date
            if update_schema.end_date is not None:
                tenancy.end_date = update_schema.end_date
            if update_schema.monthly_rent is not None:
                tenancy.monthly_rent = update_schema.monthly_rent
            if update_schema.deposit is not None:
                tenancy.deposit = update_schema.deposit
            if update_schema.status is not None:
                tenancy.status = update_schema.status

            # Validate
            try:
                tenancy.full_clean()
            except DjangoValidationError as e:
                return Response({
                    'success': False,
                    'error': str(e.message_dict) if hasattr(e, 'message_dict') else str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

            tenancy.save()

            serializer = TenancySerializer(tenancy)
            return Response({
                'success': True,
                'data': serializer.data
            })

        except PydanticValidationError as e:
            return Response({
                'success': False,
                'errors': e.errors()
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a tenancy (soft delete by setting inactive)."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to delete this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Change status to moved_out instead of hard delete
        tenancy.status = 'moved_out'
        tenancy.save()

        return Response({
            'success': True,
            'message': 'Tenancy marked as moved out.'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def add_renter(self, request, pk=None):
        """Add a renter to a tenancy."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to add renters to this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            # Validate with Pydantic
            renter_schema = AddRenterSchema(**request.data)

            # Add renter
            renter = self._add_renter_to_tenancy(
                tenancy=tenancy,
                email=renter_schema.email,
                first_name=renter_schema.first_name,
                last_name=renter_schema.last_name,
                is_primary=renter_schema.is_primary,
                invited_by=request.user
            )

            serializer = RenterSerializer(renter)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Renter added successfully.'
            }, status=status.HTTP_201_CREATED)

        except PydanticValidationError as e:
            return Response({
                'success': False,
                'errors': e.errors()
            }, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='renters/(?P<renter_id>[^/.]+)')
    def remove_renter(self, request, pk=None, renter_id=None):
        """Remove a renter from a tenancy."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to remove renters from this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get and delete renter
        renter = get_object_or_404(Renter, id=renter_id, tenancy=tenancy)
        renter.delete()

        return Response({
            'success': True,
            'message': 'Renter removed successfully.'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a tenancy (change status to active)."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to activate this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if another active tenancy exists
        existing_active = Tenancy.objects.filter(
            household=tenancy.household,
            status='active'
        ).exclude(pk=tenancy.pk)

        if existing_active.exists():
            return Response({
                'success': False,
                'error': f'Household "{tenancy.household.name}" already has an active tenancy. '
                         'Please move out the current tenancy before activating a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)

        tenancy.status = 'active'
        tenancy.save()

        serializer = TenancySerializer(tenancy)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Tenancy activated successfully.'
        })

    @action(detail=True, methods=['post'])
    def start_moveout(self, request, pk=None):
        """Start the move-out process (change status to moving_out and set end_date)."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to start move-out for this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            # Validate with Pydantic
            moveout_schema = StartMoveoutSchema(**request.data)

            tenancy.status = 'moving_out'
            tenancy.end_date = moveout_schema.end_date
            tenancy.save()

            serializer = TenancySerializer(tenancy)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Move-out process started.'
            })

        except PydanticValidationError as e:
            return Response({
                'success': False,
                'errors': e.errors()
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def mark_moved_out(self, request, pk=None):
        """Mark tenancy as moved out (change status to moved_out)."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to mark this tenancy as moved out.'
            }, status=status.HTTP_403_FORBIDDEN)

        tenancy.status = 'moved_out'
        tenancy.save()

        serializer = TenancySerializer(tenancy)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Tenancy marked as moved out.'
        })

    @action(detail=True, methods=['post'])
    def upload_proof(self, request, pk=None):
        """Upload proof document for a tenancy."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to upload proof for this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get file from request
        file = request.FILES.get('file')
        if not file:
            return Response({
                'success': False,
                'error': 'No file provided.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Save file
        tenancy.proof_document = file
        tenancy.save()

        serializer = TenancySerializer(tenancy)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Proof document uploaded successfully.'
        })

    @action(detail=True, methods=['post'])
    def upload_inventory_report(self, request, pk=None):
        """Upload inventory report for a tenancy."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to upload inventory report for this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get file from request
        file = request.FILES.get('file')
        if not file:
            return Response({
                'success': False,
                'error': 'No file provided.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Save file
        tenancy.inventory_report = file
        tenancy.save()

        serializer = TenancySerializer(tenancy)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Inventory report uploaded successfully.'
        })

    @action(detail=True, methods=['post'])
    def upload_checkout_reading(self, request, pk=None):
        """Upload checkout reading for a tenancy."""
        tenancy = self.get_object()

        # Check permissions
        if not request.user.is_admin() and tenancy.household.landlord != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to upload checkout reading for this tenancy.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get file from request
        file = request.FILES.get('file')
        if not file:
            return Response({
                'success': False,
                'error': 'No file provided.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Save file
        tenancy.checkout_reading = file
        tenancy.save()

        serializer = TenancySerializer(tenancy)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Checkout reading uploaded successfully.'
        })

    def _add_renter_to_tenancy(self, tenancy, email, first_name, last_name, is_primary, invited_by):
        """Helper method to add a renter to a tenancy."""
        # Check if user exists
        try:
            user = User.objects.get(email=email)

            # Check if user is already a renter in this tenancy
            if Renter.objects.filter(tenancy=tenancy, user=user).exists():
                raise ValueError(f'User {email} is already a renter in this tenancy.')

            # Add as renter
            renter = Renter.objects.create(
                tenancy=tenancy,
                user=user,
                is_primary=is_primary
            )

            return renter

        except User.DoesNotExist:
            # User doesn't exist - create inactive user and send invitation
            # Create inactive user
            user = User.objects.create(
                email=email,
                first_name=first_name or '',
                last_name=last_name or '',
                is_active=False,
                role='tenant'
            )

            # Create renter record
            renter = Renter.objects.create(
                tenancy=tenancy,
                user=user,
                is_primary=is_primary
            )

            # Create invitation
            invitation = TenantInvitation.objects.create(
                email=email,
                household=tenancy.household,
                invited_by=invited_by
            )

            # Send invitation email
            send_invitation_email(invitation)

            return renter
