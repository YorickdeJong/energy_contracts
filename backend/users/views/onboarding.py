import os
import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from pydantic import ValidationError as PydanticValidationError

from ..models import User, Household, HouseholdMembership, TenancyAgreement, Tenancy, Renter
from ..serializers import (
    HouseholdSerializer,
    TenancyAgreementSerializer,
    UserSerializer,
)
from ..emails import send_welcome_email
from ..schemas import (
    HouseholdOnboardingSchema,
    LandlordUpdateSchema,
    TenancyUploadSchema,
    TenantManualAddSchema,
    OnboardingStatusSchema,
    TenancyConfirmSchema,
)

logger = logging.getLogger(__name__)


class IsLandlordOrAdmin(IsAuthenticated):
    """Custom permission to only allow landlords or admins"""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.is_landlord() or request.user.is_admin()


class OnboardingViewSet(viewsets.ViewSet):
    """ViewSet for landlord onboarding process"""
    permission_classes = [IsLandlordOrAdmin]

    @action(detail=False, methods=['post'], url_path='household')
    def create_household(self, request):
        """
        Create a household for the landlord

        POST /api/users/onboarding/household/
        {
            "name": "123 Main Street Apt 2",
            "address": "123 Main Street, Apartment 2, Amsterdam, 1012 AB"
        }
        """
        try:
            # Validate with Pydantic
            household_data = HouseholdOnboardingSchema(**request.data)

            # Create household
            household = Household.objects.create(
                name=household_data.name,
                address=household_data.address,
                landlord=request.user
            )

            # Update onboarding step
            if request.user.onboarding_step < 1:
                request.user.onboarding_step = 1
                request.user.save(update_fields=['onboarding_step'])

            serializer = HouseholdSerializer(household)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except PydanticValidationError as e:
            return Response(
                {'errors': e.errors()},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error creating household: {str(e)}")
            return Response(
                {'error': 'Failed to create household'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['patch'], url_path='landlord')
    def update_landlord(self, request):
        """
        Update landlord information

        PATCH /api/users/onboarding/landlord/
        {
            "first_name": "John",
            "last_name": "Doe",
            "email": "landlord@example.com",
            "phone_number": "+31612345678"
        }
        """
        try:
            # Validate with Pydantic
            landlord_data = LandlordUpdateSchema(**request.data)

            # Update user fields
            if landlord_data.first_name is not None:
                request.user.first_name = landlord_data.first_name
            if landlord_data.last_name is not None:
                request.user.last_name = landlord_data.last_name
            if landlord_data.email is not None:
                request.user.email = landlord_data.email
            if landlord_data.phone_number is not None:
                request.user.phone_number = landlord_data.phone_number

            request.user.save()

            # Update onboarding step
            if request.user.onboarding_step < 2:
                request.user.onboarding_step = 2
                request.user.save(update_fields=['onboarding_step'])

            serializer = UserSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except PydanticValidationError as e:
            return Response(
                {'errors': e.errors()},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error updating landlord: {str(e)}")
            return Response(
                {'error': 'Failed to update landlord information'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='tenancy/upload', parser_classes=[MultiPartParser, FormParser])
    def upload_tenancy(self, request):
        """
        Upload tenancy agreement file

        POST /api/users/onboarding/tenancy/upload/
        Content-Type: multipart/form-data
        {
            "household_id": 1,
            "file": <file>
        }
        """
        try:
            # Validate household_id with Pydantic
            upload_data = TenancyUploadSchema(household_id=request.data.get('household_id'))

            # Get household and verify ownership
            try:
                household = Household.objects.get(
                    id=upload_data.household_id,
                    landlord=request.user
                )
            except Household.DoesNotExist:
                # Check if household exists at all
                if Household.objects.filter(id=upload_data.household_id).exists():
                    return Response(
                        {'error': 'You do not have permission to upload files for this household'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                else:
                    return Response(
                        {'error': f'Household with ID {upload_data.household_id} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Validate file
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            uploaded_file = request.FILES['file']

            # Check file size (10MB max)
            from django.conf import settings
            max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 10485760)
            if uploaded_file.size > max_size:
                return Response(
                    {'error': f'File size exceeds maximum allowed size of {max_size / 1024 / 1024}MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check file type
            allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.docx', '.doc']
            file_ext = os.path.splitext(uploaded_file.name)[1].lower()
            if file_ext not in allowed_extensions:
                return Response(
                    {'error': f'File type not supported. Allowed types: {", ".join(allowed_extensions)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create TenancyAgreement record
            tenancy_agreement = TenancyAgreement.objects.create(
                household=household,
                file=uploaded_file,
                status='processing'  # Set to processing immediately
            )

            # Automatically trigger AI extraction
            try:
                from ai_services.providers import GeminiProvider
                provider = GeminiProvider()

                file_path = tenancy_agreement.file.path
                extracted_data = provider.extract_tenant_data(file_path)

                # Update with extracted data
                tenancy_agreement.extracted_data = extracted_data
                tenancy_agreement.status = 'processed'
                tenancy_agreement.save(update_fields=['extracted_data', 'status'])

                logger.info(f"Successfully extracted data from tenancy agreement {tenancy_agreement.id}")

            except Exception as extraction_error:
                logger.error(f"Error extracting tenant data: {str(extraction_error)}")
                tenancy_agreement.status = 'failed'
                tenancy_agreement.save(update_fields=['status'])
                # Don't fail the upload, just mark as failed extraction

            serializer = TenancyAgreementSerializer(tenancy_agreement)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except PydanticValidationError as e:
            return Response(
                {'errors': e.errors()},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error uploading tenancy agreement: {str(e)}")
            return Response(
                {'error': 'Failed to upload tenancy agreement'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='process')
    def process_tenancy(self, request, pk=None):
        """
        Trigger AI extraction for tenancy agreement

        POST /api/users/onboarding/tenancy/{id}/process/
        """
        try:
            # Get tenancy agreement and verify ownership
            tenancy_agreement = get_object_or_404(
                TenancyAgreement,
                id=pk,
                household__landlord=request.user
            )

            # Check if already processed
            if tenancy_agreement.status == 'processed':
                return Response(
                    {'message': 'Tenancy agreement already processed'},
                    status=status.HTTP_200_OK
                )

            # Update status to processing
            tenancy_agreement.status = 'processing'
            tenancy_agreement.save(update_fields=['status'])

            try:
                # Lazy import AI provider (only when needed)
                try:
                    from ai_services.providers import GeminiProvider
                    provider = GeminiProvider()
                except ImportError:
                    raise Exception("AI service dependencies not installed. Please install google-generativeai.")

                file_path = tenancy_agreement.file.path
                extracted_data = provider.extract_tenant_data(file_path)

                # Update tenancy agreement with extracted data
                tenancy_agreement.extracted_data = extracted_data
                tenancy_agreement.status = 'processed'
                tenancy_agreement.save(update_fields=['extracted_data', 'status'])

                # Update onboarding step
                if request.user.onboarding_step < 3:
                    request.user.onboarding_step = 3
                    request.user.save(update_fields=['onboarding_step'])

                serializer = TenancyAgreementSerializer(tenancy_agreement)
                return Response(serializer.data, status=status.HTTP_200_OK)

            except Exception as extraction_error:
                logger.error(f"Error extracting tenant data: {str(extraction_error)}")
                tenancy_agreement.status = 'failed'
                tenancy_agreement.save(update_fields=['status'])
                return Response(
                    {'error': f'Failed to extract tenant data: {str(extraction_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"Error processing tenancy agreement: {str(e)}")
            return Response(
                {'error': 'Failed to process tenancy agreement'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='tenancy/confirm')
    def confirm_tenancy(self, request):
        """
        Confirm and create/update tenancy from extracted data (idempotent)

        If a tenancy already exists for this tenancy agreement, it will be updated.
        Otherwise, a new tenancy will be created.

        POST /api/users/onboarding/tenancy/confirm/
        {
            "tenancy_agreement_id": 1,
            "tenancy_name": "2024-2025 Lease",
            "start_date": "2024-01-15",
            "end_date": "2025-01-14",
            "monthly_rent": 1500.00,
            "deposit": 3000.00
        }

        Returns: Tenancy object (HTTP 200 for both create and update)
        """
        try:
            # Validate with Pydantic
            confirm_data = TenancyConfirmSchema(**request.data)

            # Get tenancy agreement and verify ownership + processed status
            tenancy_agreement = get_object_or_404(
                TenancyAgreement,
                id=confirm_data.tenancy_agreement_id,
                household__landlord=request.user,
                status='processed'
            )

            # Check if tenancy already exists for this tenancy agreement
            from ..models import Tenancy
            existing_tenancy = Tenancy.objects.filter(
                proof_document=tenancy_agreement.file
            ).first()

            if existing_tenancy:
                # UPDATE existing tenancy
                existing_tenancy.name = confirm_data.tenancy_name
                existing_tenancy.start_date = confirm_data.start_date
                existing_tenancy.end_date = confirm_data.end_date
                existing_tenancy.monthly_rent = confirm_data.monthly_rent
                existing_tenancy.deposit = confirm_data.deposit
                existing_tenancy.status = 'active' if confirm_data.start_date <= timezone.now().date() else 'future'
                existing_tenancy.save()

                logger.info(f"Updated existing tenancy {existing_tenancy.id} for household {existing_tenancy.household.id}")
                tenancy = existing_tenancy
            else:
                # CREATE new tenancy
                tenancy = Tenancy.objects.create(
                    household=tenancy_agreement.household,
                    name=confirm_data.tenancy_name,
                    start_date=confirm_data.start_date,
                    end_date=confirm_data.end_date,
                    monthly_rent=confirm_data.monthly_rent,
                    deposit=confirm_data.deposit,
                    status='active' if confirm_data.start_date <= timezone.now().date() else 'future',
                    proof_document=tenancy_agreement.file  # Link the proof document
                )
                logger.info(f"Created new tenancy {tenancy.id} for household {tenancy.household.id}")

            # Return tenancy data
            from ..serializers import TenancySerializer
            serializer = TenancySerializer(tenancy)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except PydanticValidationError as e:
            return Response(
                {'errors': e.errors()},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error confirming tenancy: {str(e)}")
            return Response(
                {'error': f'Failed to create tenancy: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='tenant/add')
    def add_tenant(self, request):
        """
        Manually add a tenant to household

        POST /api/users/onboarding/tenant/add/
        {
            "household_id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone_number": "+31612345678"
        }
        """
        try:
            # Validate with Pydantic
            tenant_data = TenantManualAddSchema(**request.data)

            # Get household and verify ownership
            household = get_object_or_404(
                Household,
                id=tenant_data.household_id,
                landlord=request.user
            )

            # Track if this is a new user to send welcome email
            is_new_user = False
            temporary_password = None

            with transaction.atomic():
                # Check if user already exists
                try:
                    tenant = User.objects.get(email=tenant_data.email)
                    # Update tenant info if provided
                    tenant.first_name = tenant_data.first_name
                    tenant.last_name = tenant_data.last_name
                    if tenant_data.phone_number:
                        tenant.phone_number = tenant_data.phone_number
                    tenant.save()
                except User.DoesNotExist:
                    # Create new tenant user
                    is_new_user = True
                    temporary_password = User.objects.make_random_password(length=16)

                    tenant = User.objects.create_user(
                        email=tenant_data.email,
                        password=temporary_password,
                        first_name=tenant_data.first_name,
                        last_name=tenant_data.last_name,
                        phone_number=tenant_data.phone_number,
                        role='tenant'
                    )

                # Create or update household membership
                membership, created = HouseholdMembership.objects.get_or_create(
                    household=household,
                    tenant=tenant,
                    defaults={
                        'role': 'tenant',
                        'invited_by': request.user
                    }
                )

                if not created:
                    membership.is_active = True
                    membership.save()

                # Update onboarding step
                if request.user.onboarding_step < 3:
                    request.user.onboarding_step = 3
                    request.user.save(update_fields=['onboarding_step'])

            # Send welcome email to new tenants (outside transaction)
            if is_new_user and temporary_password:
                landlord_name = request.user.get_full_name() or request.user.email
                send_welcome_email(tenant, temporary_password, landlord_name)

            tenant_serializer = UserSerializer(tenant)
            return Response(tenant_serializer.data, status=status.HTTP_201_CREATED)

        except PydanticValidationError as e:
            return Response(
                {'errors': e.errors()},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error adding tenant: {str(e)}")
            return Response(
                {'error': 'Failed to add tenant'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='complete')
    def complete_onboarding(self, request):
        """
        Mark onboarding as complete

        POST /api/users/onboarding/complete/

        Minimum requirements:
        - Has at least one household
        - Has at least one tenancy OR household members (for backward compatibility)
        """
        try:
            # Check if all required steps are completed
            has_household = Household.objects.filter(landlord=request.user).exists()

            # Check for tenancies (new system)
            has_tenancy = Tenancy.objects.filter(
                household__landlord=request.user
            ).exists()

            # Check for household memberships (legacy system - backward compatibility)
            has_household_members = HouseholdMembership.objects.filter(
                household__landlord=request.user,
                is_active=True
            ).exists()

            if not has_household:
                return Response(
                    {'error': 'Please create a household first'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Must have either a tenancy (new system) or household members (legacy)
            if not has_tenancy and not has_household_members:
                return Response(
                    {'error': 'Please create a tenancy agreement or add household members'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Mark onboarding as complete
            request.user.is_onboarded = True
            request.user.onboarding_step = 4
            request.user.save(update_fields=['is_onboarded', 'onboarding_step'])

            logger.info(f"User {request.user.email} completed onboarding successfully")

            serializer = UserSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error completing onboarding: {str(e)}")
            return Response(
                {'error': 'Failed to complete onboarding'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='status')
    def get_status(self, request):
        """
        Get onboarding progress status

        GET /api/users/onboarding/status/
        """
        try:
            has_household = Household.objects.filter(landlord=request.user).exists()
            landlord_info_complete = bool(
                request.user.first_name and
                request.user.last_name and
                request.user.phone_number
            )
            has_tenants = HouseholdMembership.objects.filter(
                household__landlord=request.user,
                is_active=True
            ).exists()

            status_data = {
                'is_onboarded': request.user.is_onboarded,
                'onboarding_step': request.user.onboarding_step,
                'household_created': has_household,
                'landlord_info_complete': landlord_info_complete,
                'tenants_added': has_tenants,
            }

            return Response(status_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error getting onboarding status: {str(e)}")
            return Response(
                {'error': 'Failed to get onboarding status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
