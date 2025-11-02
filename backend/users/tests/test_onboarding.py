import pytest
import os
from io import BytesIO
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from users.models import Household, HouseholdMembership, TenancyAgreement

User = get_user_model()


@pytest.mark.django_db
class TestOnboardingCreateHouseholdEndpoint:
    """Test suite for onboarding household creation endpoint"""

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
    def tenant(self):
        return User.objects.create_user(
            email='tenant@example.com',
            password='testpass123',
            role='tenant'
        )

    def test_create_household_success(self, api_client, landlord):
        """Test successful household creation during onboarding"""
        api_client.force_authenticate(user=landlord)

        data = {
            'name': 'Test Apartment',
            'street_address': '123 Main St',
            'city': 'Amsterdam',
            'postal_code': '1012 AB',
            'country': 'Netherlands'
        }

        response = api_client.post('/api/users/onboarding/household/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Apartment'
        assert 'Amsterdam' in response.data['address']

        # Verify household was created
        household = Household.objects.get(name='Test Apartment')
        assert household.landlord == landlord

        # Verify onboarding step was updated
        landlord.refresh_from_db()
        assert landlord.onboarding_step >= 1

    def test_create_household_with_full_address(self, api_client, landlord):
        """Test creating household with single address field"""
        api_client.force_authenticate(user=landlord)

        data = {
            'name': 'Test Apartment',
            'address': '123 Main St, Amsterdam, 1012 AB, Netherlands'
        }

        response = api_client.post('/api/users/onboarding/household/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['address'] == '123 Main St, Amsterdam, 1012 AB, Netherlands'

    def test_create_household_missing_name(self, api_client, landlord):
        """Test creating household without name fails"""
        api_client.force_authenticate(user=landlord)

        data = {
            'address': '123 Main St'
        }

        response = api_client.post('/api/users/onboarding/household/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_household_missing_address(self, api_client, landlord):
        """Test creating household without address fails"""
        api_client.force_authenticate(user=landlord)

        data = {
            'name': 'Test Apartment'
        }

        response = api_client.post('/api/users/onboarding/household/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_household_unauthenticated(self, api_client):
        """Test creating household without authentication fails"""
        data = {
            'name': 'Test Apartment',
            'address': '123 Main St'
        }

        response = api_client.post('/api/users/onboarding/household/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_household_as_tenant(self, api_client, tenant):
        """Test that tenants cannot create households"""
        api_client.force_authenticate(user=tenant)

        data = {
            'name': 'Test Apartment',
            'address': '123 Main St'
        }

        response = api_client.post('/api/users/onboarding/household/', data)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestOnboardingUpdateLandlordEndpoint:
    """Test suite for onboarding landlord update endpoint"""

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

    def test_update_landlord_info(self, api_client, landlord):
        """Test updating landlord information"""
        api_client.force_authenticate(user=landlord)

        data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone_number': '+31612345678'
        }

        response = api_client.patch('/api/users/onboarding/landlord/', data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Jane'
        assert response.data['last_name'] == 'Smith'
        assert response.data['phone_number'] == '+31612345678'

        # Verify database was updated
        landlord.refresh_from_db()
        assert landlord.first_name == 'Jane'
        assert landlord.last_name == 'Smith'
        assert landlord.phone_number == '+31612345678'

        # Verify onboarding step was updated
        assert landlord.onboarding_step >= 2

    def test_update_landlord_partial(self, api_client, landlord):
        """Test partial update of landlord info"""
        api_client.force_authenticate(user=landlord)

        data = {
            'first_name': 'Jane'
        }

        response = api_client.patch('/api/users/onboarding/landlord/', data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Jane'
        assert response.data['last_name'] == 'Doe'  # Unchanged

    def test_update_landlord_invalid_phone(self, api_client, landlord):
        """Test updating with invalid phone number"""
        api_client.force_authenticate(user=landlord)

        data = {
            'phone_number': 'invalid-phone'
        }

        response = api_client.patch('/api/users/onboarding/landlord/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_landlord_unauthenticated(self, api_client):
        """Test updating without authentication fails"""
        data = {
            'first_name': 'Jane'
        }

        response = api_client.patch('/api/users/onboarding/landlord/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestOnboardingTenancyUploadEndpoint:
    """Test suite for onboarding tenancy agreement upload endpoint"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def landlord(self):
        return User.objects.create_user(
            email='landlord@example.com',
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

    def test_upload_tenancy_pdf(self, api_client, landlord, household):
        """Test uploading a PDF tenancy agreement"""
        api_client.force_authenticate(user=landlord)

        # Create a simple PDF file mock
        pdf_content = b'%PDF-1.4 fake pdf content'
        pdf_file = SimpleUploadedFile('tenancy.pdf', pdf_content, content_type='application/pdf')

        data = {
            'household_id': household.id,
            'file': pdf_file
        }

        response = api_client.post('/api/users/onboarding/tenancy/upload/', data, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        assert 'file' in response.data
        assert response.data['status'] == 'pending'

        # Verify TenancyAgreement was created
        agreement = TenancyAgreement.objects.get(household=household)
        assert agreement.file_name == 'tenancy.pdf'
        assert agreement.status == 'pending'

    def test_upload_tenancy_missing_file(self, api_client, landlord, household):
        """Test uploading without file fails"""
        api_client.force_authenticate(user=landlord)

        data = {
            'household_id': household.id
        }

        response = api_client.post('/api/users/onboarding/tenancy/upload/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'file' in response.data['error'].lower()

    def test_upload_tenancy_missing_household(self, api_client, landlord):
        """Test uploading without household_id fails"""
        api_client.force_authenticate(user=landlord)

        pdf_file = SimpleUploadedFile('tenancy.pdf', b'pdf content', content_type='application/pdf')

        data = {
            'file': pdf_file
        }

        response = api_client.post('/api/users/onboarding/tenancy/upload/', data, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_tenancy_wrong_household(self, api_client, landlord):
        """Test uploading to another landlord's household fails"""
        api_client.force_authenticate(user=landlord)

        other_landlord = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            role='landlord'
        )
        other_household = Household.objects.create(
            name='Other Apartment',
            address='456 Oak St',
            landlord=other_landlord
        )

        pdf_file = SimpleUploadedFile('tenancy.pdf', b'pdf content', content_type='application/pdf')

        data = {
            'household_id': other_household.id,
            'file': pdf_file
        }

        response = api_client.post('/api/users/onboarding/tenancy/upload/', data, format='multipart')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_upload_tenancy_invalid_file_type(self, api_client, landlord, household):
        """Test uploading invalid file type fails"""
        api_client.force_authenticate(user=landlord)

        exe_file = SimpleUploadedFile('virus.exe', b'malicious content', content_type='application/x-msdownload')

        data = {
            'household_id': household.id,
            'file': exe_file
        }

        response = api_client.post('/api/users/onboarding/tenancy/upload/', data, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'type not supported' in response.data['error'].lower()


@pytest.mark.django_db
class TestOnboardingAddTenantEndpoint:
    """Test suite for onboarding add tenant endpoint"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def landlord(self):
        return User.objects.create_user(
            email='landlord@example.com',
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

    def test_add_tenant_manually(self, api_client, landlord, household):
        """Test manually adding a tenant"""
        api_client.force_authenticate(user=landlord)

        data = {
            'household_id': household.id,
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'tenant@example.com',
            'phone_number': '+31612345678'
        }

        response = api_client.post('/api/users/onboarding/tenant/add/', data)

        assert response.status_code == status.HTTP_201_CREATED

        # Verify membership was created
        membership = HouseholdMembership.objects.get(household=household)
        assert membership.tenant.email == 'tenant@example.com'
        assert membership.tenant.first_name == 'Jane'
        assert membership.tenant.last_name == 'Smith'

    def test_add_tenant_missing_email(self, api_client, landlord, household):
        """Test adding tenant without email fails"""
        api_client.force_authenticate(user=landlord)

        data = {
            'household_id': household.id,
            'first_name': 'Jane',
            'last_name': 'Smith'
        }

        response = api_client.post('/api/users/onboarding/tenant/add/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_add_tenant_invalid_email(self, api_client, landlord, household):
        """Test adding tenant with invalid email fails"""
        api_client.force_authenticate(user=landlord)

        data = {
            'household_id': household.id,
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'invalid-email'
        }

        response = api_client.post('/api/users/onboarding/tenant/add/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestOnboardingCompleteEndpoint:
    """Test suite for onboarding complete endpoint"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def landlord(self):
        return User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            role='landlord'
        )

    def test_complete_onboarding(self, api_client, landlord):
        """Test completing onboarding"""
        api_client.force_authenticate(user=landlord)

        assert landlord.is_onboarded is False

        response = api_client.post('/api/users/onboarding/complete/', {})

        assert response.status_code == status.HTTP_200_OK

        # Verify user is onboarded
        landlord.refresh_from_db()
        assert landlord.is_onboarded is True

    def test_complete_onboarding_unauthenticated(self, api_client):
        """Test completing onboarding without authentication fails"""
        response = api_client.post('/api/users/onboarding/complete/', {})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestOnboardingStatusEndpoint:
    """Test suite for onboarding status endpoint"""

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

    def test_get_onboarding_status_new_user(self, api_client, landlord):
        """Test getting onboarding status for new user"""
        api_client.force_authenticate(user=landlord)

        response = api_client.get('/api/users/onboarding/status/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_onboarded'] is False
        assert response.data['onboarding_step'] == 0
        assert response.data['household_created'] is False
        assert response.data['landlord_info_complete'] is False
        assert response.data['tenants_added'] is False

    def test_get_onboarding_status_with_household(self, api_client, landlord, household):
        """Test getting onboarding status with household created"""
        api_client.force_authenticate(user=landlord)

        response = api_client.get('/api/users/onboarding/status/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['household_created'] is True

    def test_get_onboarding_status_with_info(self, api_client, landlord):
        """Test getting onboarding status with complete landlord info"""
        landlord.first_name = 'John'
        landlord.last_name = 'Doe'
        landlord.phone_number = '+31612345678'
        landlord.save()

        api_client.force_authenticate(user=landlord)

        response = api_client.get('/api/users/onboarding/status/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['landlord_info_complete'] is True

    def test_get_onboarding_status_completed(self, api_client, landlord):
        """Test getting onboarding status for completed onboarding"""
        landlord.is_onboarded = True
        landlord.save()

        api_client.force_authenticate(user=landlord)

        response = api_client.get('/api/users/onboarding/status/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_onboarded'] is True

    def test_get_onboarding_status_unauthenticated(self, api_client):
        """Test getting onboarding status without authentication fails"""
        response = api_client.get('/api/users/onboarding/status/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
