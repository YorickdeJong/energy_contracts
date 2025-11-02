"""
Tests for user profile endpoints.

Tests the /api/users/me/ endpoint for viewing and updating user profiles
with RBAC considerations for different user roles (tenant, landlord, admin).
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestProfileView:
    """Test cases for the profile view endpoint."""

    def test_get_profile_authenticated(self, authenticated_client, user):
        """Test authenticated user can retrieve their profile."""
        response = authenticated_client.get('/api/users/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
        assert response.data['first_name'] == user.first_name
        assert response.data['last_name'] == user.last_name
        assert 'id' in response.data
        assert 'role' in response.data

    def test_get_profile_unauthenticated(self, api_client):
        """Test unauthenticated user cannot access profile."""
        response = api_client.get('/api/users/me/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile_basic_fields(self, authenticated_client, user):
        """Test user can update their basic profile fields."""
        update_data = {
            'first_name': 'UpdatedFirst',
            'last_name': 'UpdatedLast',
            'phone_number': '+31612345678'
        }

        response = authenticated_client.patch('/api/users/me/', update_data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'UpdatedFirst'
        assert response.data['last_name'] == 'UpdatedLast'
        assert response.data['phone_number'] == '+31612345678'

        # Verify changes persisted
        user.refresh_from_db()
        assert user.first_name == 'UpdatedFirst'
        assert user.last_name == 'UpdatedLast'
        assert user.phone_number == '+31612345678'

    def test_update_profile_partial(self, authenticated_client, user):
        """Test user can update individual profile fields."""
        response = authenticated_client.patch(
            '/api/users/me/',
            {'first_name': 'OnlyFirstName'}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'OnlyFirstName'
        # Last name should remain unchanged
        assert response.data['last_name'] == user.last_name

    def test_cannot_update_email(self, authenticated_client, user):
        """Test user cannot change their email address."""
        original_email = user.email

        response = authenticated_client.patch(
            '/api/users/me/',
            {'email': 'newemail@example.com'}
        )

        # Email should not change (it's in read_only_fields)
        user.refresh_from_db()
        assert user.email == original_email

    def test_cannot_update_read_only_fields(self, authenticated_client, user):
        """Test user cannot modify read-only fields."""
        original_id = user.id
        original_date_joined = user.date_joined

        response = authenticated_client.patch('/api/users/me/', {
            'id': 999999,
            'date_joined': '2020-01-01T00:00:00Z',
            'is_verified': True
        })

        user.refresh_from_db()
        assert user.id == original_id
        assert user.date_joined == original_date_joined
        # is_verified is read-only, should not change
        assert user.is_verified == False

    def test_invalid_phone_number_format(self, authenticated_client):
        """Test validation fails for invalid phone number format."""
        response = authenticated_client.patch('/api/users/me/', {
            'phone_number': 'invalid-phone'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_tenant_can_view_own_profile(self, api_client, db):
        """Test tenant role can view their own profile."""
        tenant = User.objects.create_user(
            email='tenant@example.com',
            password='testpass123',
            first_name='Tenant',
            last_name='User',
            role='tenant'
        )
        api_client.force_authenticate(user=tenant)

        response = api_client.get('/api/users/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == tenant.email
        assert response.data['role'] == 'tenant'

    def test_landlord_can_view_own_profile(self, api_client, db):
        """Test landlord role can view their own profile."""
        landlord = User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            first_name='Landlord',
            last_name='User',
            role='landlord'
        )
        api_client.force_authenticate(user=landlord)

        response = api_client.get('/api/users/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == landlord.email
        assert response.data['role'] == 'landlord'

    def test_admin_can_view_own_profile(self, authenticated_client, admin_user, api_client):
        """Test admin role can view their own profile."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.get('/api/users/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == admin_user.email
        assert response.data['role'] == 'admin'

    def test_user_cannot_change_own_role(self, authenticated_client, user):
        """Test user cannot change their own role."""
        original_role = user.role

        response = authenticated_client.patch('/api/users/me/', {
            'role': 'admin'
        })

        user.refresh_from_db()
        # Role should not change to admin
        assert user.role == original_role

    def test_profile_picture_url_update(self, authenticated_client, user):
        """Test user can update profile picture URL."""
        new_picture_url = 'https://example.com/profile.jpg'

        response = authenticated_client.patch('/api/users/me/', {
            'profile_picture': new_picture_url
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['profile_picture'] == new_picture_url

        user.refresh_from_db()
        assert user.profile_picture == new_picture_url

    def test_response_excludes_password(self, authenticated_client, user):
        """Test profile response does not include password."""
        response = authenticated_client.get('/api/users/me/')

        assert response.status_code == status.HTTP_200_OK
        assert 'password' not in response.data

    def test_multiple_profile_updates(self, authenticated_client, user):
        """Test multiple sequential profile updates work correctly."""
        # First update
        response1 = authenticated_client.patch('/api/users/me/', {
            'first_name': 'First'
        })
        assert response1.status_code == status.HTTP_200_OK
        assert response1.data['first_name'] == 'First'

        # Second update
        response2 = authenticated_client.patch('/api/users/me/', {
            'last_name': 'Last'
        })
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data['first_name'] == 'First'  # Should persist
        assert response2.data['last_name'] == 'Last'

        # Third update
        response3 = authenticated_client.patch('/api/users/me/', {
            'phone_number': '+31612345678'
        })
        assert response3.status_code == status.HTTP_200_OK
        assert response3.data['first_name'] == 'First'  # Should persist
        assert response3.data['last_name'] == 'Last'  # Should persist
        assert response3.data['phone_number'] == '+31612345678'
