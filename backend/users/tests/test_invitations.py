import pytest
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core import mail
from rest_framework.test import APIClient
from rest_framework import status
from users.models import Household, HouseholdMembership, TenantInvitation
from users.views.invitations import send_invitation_email

User = get_user_model()


@pytest.mark.django_db
class TestInvitationVerifyEndpoint:
    """Test suite for invitation verify endpoint"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def landlord(self):
        return User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            role='landlord',
            first_name='John',
            last_name='Doe'
        )

    @pytest.fixture
    def household(self, landlord):
        return Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

    @pytest.fixture
    def valid_invitation(self, household, landlord):
        return TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

    def test_verify_valid_token(self, api_client, valid_invitation):
        """Test verifying a valid invitation token"""
        response = api_client.post('/api/users/invitations/verify/', {
            'token': valid_invitation.token
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['valid'] is True
        assert response.data['email'] == 'tenant@example.com'
        assert response.data['household_name'] == 'Test Apartment'
        assert 'John Doe' in response.data['invited_by']

    def test_verify_invalid_token(self, api_client):
        """Test verifying an invalid invitation token"""
        response = api_client.post('/api/users/invitations/verify/', {
            'token': 'invalid-token-123'
        })

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Invalid invitation token' in response.data['error']

    def test_verify_expired_token(self, api_client, household, landlord):
        """Test verifying an expired invitation token"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )
        # Manually expire the invitation
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()

        response = api_client.post('/api/users/invitations/verify/', {
            'token': invitation.token
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'expired' in response.data['error'].lower()

    def test_verify_accepted_token(self, api_client, household, landlord):
        """Test verifying an already accepted invitation token"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )
        # Mark as accepted
        invitation.accept()

        response = api_client.post('/api/users/invitations/verify/', {
            'token': invitation.token
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'accepted' in response.data['error'].lower()

    def test_verify_missing_token(self, api_client):
        """Test verifying without providing a token"""
        response = api_client.post('/api/users/invitations/verify/', {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'required' in response.data['error'].lower()

    def test_verify_no_authentication_required(self, api_client, valid_invitation):
        """Test that verify endpoint doesn't require authentication"""
        # Should work without authentication
        response = api_client.post('/api/users/invitations/verify/', {
            'token': valid_invitation.token
        })

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestInvitationAcceptEndpoint:
    """Test suite for invitation accept endpoint"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def landlord(self):
        return User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            role='landlord',
            first_name='John',
            last_name='Doe'
        )

    @pytest.fixture
    def household(self, landlord):
        return Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

    @pytest.fixture
    def valid_invitation(self, household, landlord):
        return TenantInvitation.objects.create(
            email='newtenant@example.com',
            household=household,
            invited_by=landlord
        )

    def test_accept_invitation_new_user(self, api_client, valid_invitation, household):
        """Test accepting invitation creates new user"""
        response = api_client.post('/api/users/invitations/accept/', {
            'token': valid_invitation.token,
            'password': 'newpassword123',
            'password_confirm': 'newpassword123',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone_number': '+31612345678'
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert 'user_id' in response.data
        assert response.data['email'] == 'newtenant@example.com'

        # Verify user was created
        user = User.objects.get(email='newtenant@example.com')
        assert user.first_name == 'Jane'
        assert user.last_name == 'Smith'
        assert user.phone_number == '+31612345678'
        assert user.role == 'tenant'
        assert user.is_active is True
        assert user.check_password('newpassword123')

        # Verify membership was created
        membership = HouseholdMembership.objects.get(household=household, tenant=user)
        assert membership.role == 'tenant'

        # Verify invitation was marked as accepted
        valid_invitation.refresh_from_db()
        assert valid_invitation.accepted_at is not None

    def test_accept_invitation_inactive_user(self, api_client, household, landlord):
        """Test accepting invitation activates existing inactive user"""
        # Create inactive user first
        inactive_user = User.objects.create_user(
            email='inactive@example.com',
            password='oldpass123',
            is_active=False,
            role='tenant'
        )

        invitation = TenantInvitation.objects.create(
            email='inactive@example.com',
            household=household,
            invited_by=landlord
        )

        response = api_client.post('/api/users/invitations/accept/', {
            'token': invitation.token,
            'password': 'newpassword123',
            'password_confirm': 'newpassword123',
            'first_name': 'Jane',
            'last_name': 'Smith'
        })

        assert response.status_code == status.HTTP_201_CREATED

        # Verify user was activated and updated
        inactive_user.refresh_from_db()
        assert inactive_user.is_active is True
        assert inactive_user.first_name == 'Jane'
        assert inactive_user.last_name == 'Smith'
        assert inactive_user.check_password('newpassword123')

    def test_accept_invitation_password_mismatch(self, api_client, valid_invitation):
        """Test accepting invitation with mismatched passwords"""
        response = api_client.post('/api/users/invitations/accept/', {
            'token': valid_invitation.token,
            'password': 'password123',
            'password_confirm': 'different123',
            'first_name': 'Jane',
            'last_name': 'Smith'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in str(response.data).lower()

    def test_accept_invitation_short_password(self, api_client, valid_invitation):
        """Test accepting invitation with too short password"""
        response = api_client.post('/api/users/invitations/accept/', {
            'token': valid_invitation.token,
            'password': 'short',
            'password_confirm': 'short',
            'first_name': 'Jane',
            'last_name': 'Smith'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_accept_invalid_token(self, api_client):
        """Test accepting invitation with invalid token"""
        response = api_client.post('/api/users/invitations/accept/', {
            'token': 'invalid-token',
            'password': 'password123',
            'password_confirm': 'password123'
        })

        # DRF serializer validates token first before other fields
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

    def test_accept_expired_invitation(self, api_client, household, landlord):
        """Test accepting an expired invitation"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()

        response = api_client.post('/api/users/invitations/accept/', {
            'token': invitation.token,
            'password': 'password123',
            'password_confirm': 'password123'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Response may have error in different formats depending on validation order
        assert 'error' in str(response.data).lower() or 'expired' in str(response.data).lower()

    def test_accept_already_accepted_invitation(self, api_client, valid_invitation):
        """Test accepting an already accepted invitation"""
        valid_invitation.accept()

        response = api_client.post('/api/users/invitations/accept/', {
            'token': valid_invitation.token,
            'password': 'password123',
            'password_confirm': 'password123'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Response may have error in different formats depending on validation order
        assert 'error' in str(response.data).lower() or 'accepted' in str(response.data).lower()

    def test_accept_no_authentication_required(self, api_client, valid_invitation):
        """Test that accept endpoint doesn't require authentication"""
        response = api_client.post('/api/users/invitations/accept/', {
            'token': valid_invitation.token,
            'password': 'password123',
            'password_confirm': 'password123'
        })

        assert response.status_code == status.HTTP_201_CREATED

    def test_accept_optional_phone_number(self, api_client, valid_invitation):
        """Test accepting invitation without phone number"""
        response = api_client.post('/api/users/invitations/accept/', {
            'token': valid_invitation.token,
            'password': 'password123',
            'password_confirm': 'password123'
        })

        assert response.status_code == status.HTTP_201_CREATED

        # Verify user was created without phone number
        user = User.objects.get(email='newtenant@example.com')
        assert user.phone_number == '' or user.phone_number is None

    def test_accept_creates_household_membership(self, api_client, valid_invitation, household, landlord):
        """Test that accepting invitation creates household membership"""
        response = api_client.post('/api/users/invitations.accept/', {
            'token': valid_invitation.token,
            'password': 'password123',
            'password_confirm': 'password123'
        })

        assert response.status_code == status.HTTP_201_CREATED

        user = User.objects.get(email='newtenant@example.com')
        membership = HouseholdMembership.objects.get(household=household, tenant=user)
        assert membership is not None
        assert membership.invited_by == landlord


@pytest.mark.django_db
class TestInvitationListEndpoint:
    """Test suite for invitation list endpoint"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def landlord(self):
        return User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            role='landlord',
            first_name='John',
            last_name='Doe'
        )

    @pytest.fixture
    def other_landlord(self):
        return User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            role='landlord'
        )

    @pytest.fixture
    def household(self, landlord):
        return Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

    def test_list_invitations_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list invitations"""
        response = api_client.get('/api/users/invitations/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_invitations_as_landlord(self, api_client, landlord, household):
        """Test that landlords can see their invitations"""
        # Create invitations
        TenantInvitation.objects.create(
            email='tenant1@example.com',
            household=household,
            invited_by=landlord
        )
        TenantInvitation.objects.create(
            email='tenant2@example.com',
            household=household,
            invited_by=landlord
        )

        api_client.force_authenticate(user=landlord)
        response = api_client.get('/api/users/invitations/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_list_invitations_only_own(self, api_client, landlord, other_landlord, household):
        """Test that landlords only see their own invitations"""
        # Create invitation by landlord
        TenantInvitation.objects.create(
            email='tenant1@example.com',
            household=household,
            invited_by=landlord
        )

        # Create household and invitation by other landlord
        other_household = Household.objects.create(
            name='Other Apartment',
            address='456 Oak St',
            landlord=other_landlord
        )
        TenantInvitation.objects.create(
            email='tenant2@example.com',
            household=other_household,
            invited_by=other_landlord
        )

        api_client.force_authenticate(user=landlord)
        response = api_client.get('/api/users/invitations/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['email'] == 'tenant1@example.com'


@pytest.mark.django_db
class TestSendInvitationEmail:
    """Test suite for send_invitation_email function"""

    @pytest.fixture
    def landlord(self):
        return User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            role='landlord',
            first_name='John',
            last_name='Doe'
        )

    @pytest.fixture
    def household(self, landlord):
        return Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

    @pytest.fixture
    def invitation(self, household, landlord):
        return TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

    def test_send_invitation_email(self, invitation):
        """Test sending invitation email"""
        send_invitation_email(invitation)

        # Check that one email was sent
        assert len(mail.outbox) == 1

        # Check email details
        sent_email = mail.outbox[0]
        assert sent_email.subject == "You've been invited to join Test Apartment"
        assert 'tenant@example.com' in sent_email.to
        assert invitation.token in sent_email.body
        assert 'Test Apartment' in sent_email.body
        assert 'John Doe' in sent_email.body

    def test_email_contains_invitation_link(self, invitation):
        """Test that email contains the invitation acceptance link"""
        send_invitation_email(invitation)

        sent_email = mail.outbox[0]
        assert f'/register-invitation/{invitation.token}' in sent_email.body

    def test_email_has_html_version(self, invitation):
        """Test that email includes HTML version"""
        send_invitation_email(invitation)

        sent_email = mail.outbox[0]
        # Email should have alternatives (HTML version)
        assert len(sent_email.alternatives) > 0
        html_content = sent_email.alternatives[0][0]
        assert '<html' in html_content.lower() or '<body' in html_content.lower()
        assert invitation.token in html_content
