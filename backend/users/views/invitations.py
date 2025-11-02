from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

from ..models import TenantInvitation, User, HouseholdMembership
from ..serializers import TenantInvitationSerializer, InvitationAcceptSerializer
from ..permissions import IsLandlordOrAdmin


class InvitationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenant invitations.
    """
    serializer_class = TenantInvitationSerializer
    permission_classes = [IsAuthenticated, IsLandlordOrAdmin]

    def get_queryset(self):
        """Return invitations for households owned by the current user."""
        user = self.request.user
        if user.is_admin():
            return TenantInvitation.objects.all()
        return TenantInvitation.objects.filter(invited_by=user)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def verify(self, request):
        """
        Verify if an invitation token is valid.

        POST /api/users/invitations/verify/
        {
            "token": "invitation_token"
        }
        """
        token = request.data.get('token')
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            invitation = TenantInvitation.objects.get(token=token)

            if not invitation.is_valid():
                return Response(
                    {'error': 'This invitation has expired or has already been accepted'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({
                'valid': True,
                'email': invitation.email,
                'household_name': invitation.household.name,
                'invited_by': invitation.invited_by.get_full_name(),
            })
        except TenantInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid invitation token'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def accept(self, request):
        """
        Accept an invitation and create user account.

        POST /api/users/invitations/accept/
        {
            "token": "invitation_token",
            "password": "newpassword",
            "password_confirm": "newpassword",
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "+31612345678"
        }
        """
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']

        try:
            invitation = TenantInvitation.objects.get(token=token)

            if not invitation.is_valid():
                return Response(
                    {'error': 'This invitation has expired or has already been accepted'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user already exists
            user_exists = User.objects.filter(email=invitation.email).exists()

            if user_exists:
                user = User.objects.get(email=invitation.email)
                # If user exists but is inactive, activate and set password
                if not user.is_active:
                    user.set_password(serializer.validated_data['password'])
                    user.is_active = True
                    user.first_name = serializer.validated_data.get('first_name', user.first_name)
                    user.last_name = serializer.validated_data.get('last_name', user.last_name)
                    user.phone_number = serializer.validated_data.get('phone_number', user.phone_number)
                    user.save()
            else:
                # Create new user
                user = User.objects.create_user(
                    email=invitation.email,
                    password=serializer.validated_data['password'],
                    first_name=serializer.validated_data.get('first_name', ''),
                    last_name=serializer.validated_data.get('last_name', ''),
                    phone_number=serializer.validated_data.get('phone_number', ''),
                    role='tenant',
                    is_active=True,
                )

            # Create household membership if it doesn't exist
            HouseholdMembership.objects.get_or_create(
                household=invitation.household,
                tenant=user,
                defaults={
                    'role': 'tenant',
                    'invited_by': invitation.invited_by,
                }
            )

            # Mark invitation as accepted
            invitation.accept()

            return Response({
                'message': 'Invitation accepted successfully',
                'user_id': user.id,
                'email': user.email,
            }, status=status.HTTP_201_CREATED)

        except TenantInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid invitation token'},
                status=status.HTTP_404_NOT_FOUND
            )


def send_invitation_email(invitation):
    """
    Send invitation email to tenant.

    Args:
        invitation: TenantInvitation instance
    """
    invitation_url = f"{settings.FRONTEND_URL}/register-invitation/{invitation.token}"

    context = {
        'household_name': invitation.household.name,
        'landlord_name': invitation.invited_by.get_full_name(),
        'invitation_url': invitation_url,
    }

    # Render email templates
    html_message = render_to_string('emails/tenant_invitation.html', context)
    plain_message = render_to_string('emails/tenant_invitation.txt', context)

    # Send email
    send_mail(
        subject=f"You've been invited to join {invitation.household.name}",
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invitation.email],
        html_message=html_message,
        fail_silently=False,
    )
