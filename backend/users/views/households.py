from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from ..models import Household, HouseholdMembership, User
from ..serializers import HouseholdSerializer, HouseholdMembershipSerializer, UserSerializer
from ..permissions import IsLandlordOrAdmin, IsHouseholdLandlord


class HouseholdViewSet(viewsets.ModelViewSet):
    """ViewSet for managing households."""
    serializer_class = HouseholdSerializer
    permission_classes = [IsAuthenticated, IsLandlordOrAdmin]

    def get_queryset(self):
        """Return households owned by the current user."""
        user = self.request.user
        if user.is_admin():
            return Household.objects.all()
        return Household.objects.filter(landlord=user)

    def perform_create(self, serializer):
        """Set the landlord to the current user when creating a household."""
        serializer.save(landlord=self.request.user)

    def list(self, request, *args, **kwargs):
        """List all households for the current user with member details."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Add member details to each household
        data = serializer.data
        for household_data in data:
            household = Household.objects.get(id=household_data['id'])
            memberships = HouseholdMembership.objects.filter(
                household=household,
                is_active=True
            ).select_related('tenant')

            members = []
            for membership in memberships:
                if membership.tenant:
                    members.append({
                        'id': membership.id,
                        'tenant': UserSerializer(membership.tenant).data,
                        'role': membership.role,
                        'joined_at': membership.joined_at,
                        'is_active': membership.is_active,
                    })
            household_data['members'] = members

        return Response({'results': data})

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific household with member details."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Add member details
        memberships = HouseholdMembership.objects.filter(
            household=instance,
            is_active=True
        ).select_related('tenant')

        members = []
        for membership in memberships:
            if membership.tenant:
                members.append({
                    'id': membership.id,
                    'tenant': UserSerializer(membership.tenant).data,
                    'role': membership.role,
                    'joined_at': membership.joined_at,
                    'is_active': membership.is_active,
                })
        data['members'] = members

        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def members(self, request, pk=None):
        """Get all members of a household."""
        household = self.get_object()
        memberships = HouseholdMembership.objects.filter(
            household=household,
            is_active=True
        ).select_related('tenant')

        members = []
        for membership in memberships:
            if membership.tenant:
                members.append({
                    'id': membership.id,
                    'tenant': UserSerializer(membership.tenant).data,
                    'role': membership.role,
                    'joined_at': membership.joined_at,
                    'is_active': membership.is_active,
                })

        return Response({'members': members})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHouseholdLandlord])
    def add_member(self, request, pk=None):
        """Add a member to the household."""
        household = self.get_object()
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        phone_number = request.data.get('phone_number')

        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try to find existing user
        try:
            tenant = User.objects.get(email=email)
        except User.DoesNotExist:
            # Create new user if doesn't exist
            tenant = User.objects.create_user(
                email=email,
                first_name=first_name or '',
                last_name=last_name or '',
                phone_number=phone_number or '',
                role='tenant'
            )

        # Check if already a member
        if HouseholdMembership.objects.filter(household=household, tenant=tenant).exists():
            return Response(
                {'error': 'User is already a member of this household'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add as member
        membership = HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            role='tenant',
            invited_by=request.user
        )

        return Response({
            'id': membership.id,
            'tenant': UserSerializer(tenant).data,
            'role': membership.role,
            'joined_at': membership.joined_at,
            'is_active': membership.is_active,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[^/.]+)',
            permission_classes=[IsAuthenticated, IsHouseholdLandlord])
    def remove_member(self, request, pk=None, user_id=None):
        """Remove a member from the household."""
        household = self.get_object()

        try:
            membership = HouseholdMembership.objects.get(
                household=household,
                tenant_id=user_id,
                is_active=True
            )
            membership.is_active = False
            membership.save()

            return Response(status=status.HTTP_204_NO_CONTENT)
        except HouseholdMembership.DoesNotExist:
            return Response(
                {'error': 'Member not found in this household'},
                status=status.HTTP_404_NOT_FOUND
            )
