import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from users.models import Household, HouseholdMembership

User = get_user_model()


@pytest.mark.django_db
class TestHouseholdViewSet:
    """Test suite for HouseholdViewSet"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def landlord_user(self):
        return User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            role='landlord',
            first_name='John',
            last_name='Doe'
        )

    @pytest.fixture
    def tenant_user(self):
        return User.objects.create_user(
            email='tenant@example.com',
            password='testpass123',
            role='tenant',
            first_name='Jane',
            last_name='Smith'
        )

    @pytest.fixture
    def admin_user(self):
        return User.objects.create_superuser(
            email='admin@example.com',
            password='testpass123'
        )

    @pytest.fixture
    def household(self, landlord_user):
        return Household.objects.create(
            name='Test Apartment',
            address='123 Main St, City, 12345',
            landlord=landlord_user
        )

    def test_list_households_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list households"""
        response = api_client.get('/api/users/households/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_households_as_landlord(self, api_client, landlord_user, household):
        """Test that landlords can list their own households"""
        api_client.force_authenticate(user=landlord_user)
        response = api_client.get('/api/users/households/')

        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Test Apartment'

    def test_list_households_as_regular_user(self, api_client):
        """Test that regular users with no memberships get empty list"""
        user = User.objects.create_user(
            email='user@example.com',
            password='testpass123',
            role='user'
        )
        api_client.force_authenticate(user=user)
        response = api_client.get('/api/users/households/')

        # Regular users are authenticated, so they get 200 with empty results
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) == 0

    def test_create_household(self, api_client, landlord_user):
        """Test creating a new household"""
        api_client.force_authenticate(user=landlord_user)
        data = {
            'name': 'New Apartment',
            'address': '456 Oak Ave, Town, 67890'
        }
        response = api_client.post('/api/users/households/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Apartment'
        assert response.data['landlord']['id'] == landlord_user.id
        assert response.data['landlord']['email'] == landlord_user.email

        # Verify household was created in database
        assert Household.objects.filter(name='New Apartment').exists()

    def test_retrieve_household_with_members(self, api_client, landlord_user, household, tenant_user):
        """Test retrieving a household with member details"""
        # Add a member to the household
        HouseholdMembership.objects.create(
            household=household,
            tenant=tenant_user,
            role='tenant',
            invited_by=landlord_user
        )

        api_client.force_authenticate(user=landlord_user)
        response = api_client.get(f'/api/users/households/{household.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Apartment'
        assert 'members' in response.data
        assert len(response.data['members']) == 1
        assert response.data['members'][0]['tenant']['email'] == 'tenant@example.com'

    def test_update_household(self, api_client, landlord_user, household):
        """Test updating a household"""
        api_client.force_authenticate(user=landlord_user)
        data = {'name': 'Updated Apartment Name'}
        response = api_client.patch(f'/api/users/households/{household.id}/', data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Apartment Name'

        # Verify update in database
        household.refresh_from_db()
        assert household.name == 'Updated Apartment Name'

    def test_delete_household(self, api_client, landlord_user, household):
        """Test deleting a household"""
        api_client.force_authenticate(user=landlord_user)
        response = api_client.delete(f'/api/users/households/{household.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Household.objects.filter(id=household.id).exists()

    def test_add_member_to_household(self, api_client, landlord_user, household):
        """Test adding a new member to household (creates invitation for new user)"""
        api_client.force_authenticate(user=landlord_user)
        data = {
            'email': 'newmember@example.com',
            'first_name': 'New',
            'last_name': 'Member',
            'phone_number': '+31612345678'
        }
        response = api_client.post(f'/api/users/households/{household.id}/add_member/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == 'newmember@example.com'
        assert response.data['invitation_sent'] is True
        assert 'invitation_id' in response.data

        # Verify inactive user was created
        assert User.objects.filter(email='newmember@example.com').exists()
        new_user = User.objects.get(email='newmember@example.com')
        assert new_user.role == 'tenant'
        assert new_user.is_active is False  # Inactive until they accept invitation

        # Verify membership is NOT created yet (only created when invitation is accepted)
        assert not HouseholdMembership.objects.filter(
            household=household,
            tenant=new_user
        ).exists()

    def test_add_existing_member_to_household(self, api_client, landlord_user, household, tenant_user):
        """Test adding an existing user to household"""
        api_client.force_authenticate(user=landlord_user)
        data = {
            'email': tenant_user.email,
            'first_name': 'Jane',
            'last_name': 'Smith'
        }
        response = api_client.post(f'/api/users/households/{household.id}/add_member/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['tenant']['email'] == tenant_user.email

    def test_add_duplicate_member(self, api_client, landlord_user, household, tenant_user):
        """Test that adding a member twice fails"""
        # Add member first time
        HouseholdMembership.objects.create(
            household=household,
            tenant=tenant_user,
            role='tenant',
            invited_by=landlord_user
        )

        # Try to add again
        api_client.force_authenticate(user=landlord_user)
        data = {'email': tenant_user.email}
        response = api_client.post(f'/api/users/households/{household.id}/add_member/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already a member' in response.data['error'].lower()

    def test_remove_member_from_household(self, api_client, landlord_user, household, tenant_user):
        """Test removing a member from household"""
        # Add member first
        membership = HouseholdMembership.objects.create(
            household=household,
            tenant=tenant_user,
            role='tenant',
            invited_by=landlord_user
        )

        api_client.force_authenticate(user=landlord_user)
        response = api_client.delete(
            f'/api/users/households/{household.id}/members/{tenant_user.id}/'
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify member was deactivated (soft delete)
        membership.refresh_from_db()
        assert membership.is_active is False

    def test_landlord_cannot_access_other_household(self, api_client, landlord_user):
        """Test that landlords cannot access other landlords' households"""
        other_landlord = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            role='landlord'
        )
        other_household = Household.objects.create(
            name='Other Apartment',
            address='789 Pine St',
            landlord=other_landlord
        )

        api_client.force_authenticate(user=landlord_user)
        response = api_client.get(f'/api/users/households/{other_household.id}/')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_can_access_all_households(self, api_client, admin_user, household):
        """Test that admins can access all households"""
        api_client.force_authenticate(user=admin_user)
        response = api_client.get(f'/api/users/households/{household.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Apartment'

    def test_get_household_members(self, api_client, landlord_user, household, tenant_user):
        """Test getting all members of a household"""
        HouseholdMembership.objects.create(
            household=household,
            tenant=tenant_user,
            role='tenant',
            invited_by=landlord_user
        )

        api_client.force_authenticate(user=landlord_user)
        response = api_client.get(f'/api/users/households/{household.id}/members/')

        assert response.status_code == status.HTTP_200_OK
        assert 'members' in response.data
        assert len(response.data['members']) == 1
        assert response.data['members'][0]['tenant']['email'] == tenant_user.email
