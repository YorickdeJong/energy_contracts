import pytest
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.utils import IntegrityError
from users.models import Household, HouseholdMembership, TenantInvitation, TenancyAgreement

User = get_user_model()


@pytest.mark.django_db
class TestTenantInvitationModel:
    """Test suite for TenantInvitation model"""

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
            address='123 Main St, City, 12345',
            landlord=landlord
        )

    def test_create_invitation(self, household, landlord):
        """Test creating a tenant invitation"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

        assert invitation.email == 'tenant@example.com'
        assert invitation.household == household
        assert invitation.invited_by == landlord
        assert invitation.token is not None
        assert len(invitation.token) > 0
        assert invitation.expires_at is not None
        assert invitation.accepted_at is None

    def test_token_auto_generation(self, household, landlord):
        """Test that token is automatically generated"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

        assert invitation.token is not None
        assert len(invitation.token) > 20  # Token should be substantial length

    def test_token_is_unique(self, household, landlord):
        """Test that each invitation gets a unique token"""
        invitation1 = TenantInvitation.objects.create(
            email='tenant1@example.com',
            household=household,
            invited_by=landlord
        )
        invitation2 = TenantInvitation.objects.create(
            email='tenant2@example.com',
            household=household,
            invited_by=landlord
        )

        assert invitation1.token != invitation2.token

    def test_expiration_auto_set(self, household, landlord):
        """Test that expiration is automatically set to 7 days from creation"""
        now = timezone.now()
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

        # Should expire in approximately 7 days
        expected_expiry = now + timedelta(days=7)
        time_diff = abs((invitation.expires_at - expected_expiry).total_seconds())
        assert time_diff < 5  # Within 5 seconds

    def test_is_valid_for_new_invitation(self, household, landlord):
        """Test is_valid() returns True for new, unexpired invitation"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

        assert invitation.is_valid() is True

    def test_is_valid_for_expired_invitation(self, household, landlord):
        """Test is_valid() returns False for expired invitation"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )
        # Manually set expiration to past
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()

        assert invitation.is_valid() is False

    def test_is_valid_for_accepted_invitation(self, household, landlord):
        """Test is_valid() returns False for already accepted invitation"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )
        invitation.accepted_at = timezone.now()
        invitation.save()

        assert invitation.is_valid() is False

    def test_accept_invitation(self, household, landlord):
        """Test accepting an invitation"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

        assert invitation.accepted_at is None
        invitation.accept()

        assert invitation.accepted_at is not None
        assert isinstance(invitation.accepted_at, type(timezone.now()))

    def test_str_representation(self, household, landlord):
        """Test string representation of invitation"""
        invitation = TenantInvitation.objects.create(
            email='tenant@example.com',
            household=household,
            invited_by=landlord
        )

        str_repr = str(invitation)
        assert 'tenant@example.com' in str_repr
        assert household.name in str_repr


@pytest.mark.django_db
class TestHouseholdModel:
    """Test suite for Household model"""

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
            role='tenant',
            first_name='Jane',
            last_name='Smith'
        )

    def test_create_household(self, landlord):
        """Test creating a household"""
        household = Household.objects.create(
            name='Test Apartment',
            address='123 Main St, City, 12345',
            landlord=landlord
        )

        assert household.name == 'Test Apartment'
        assert household.address == '123 Main St, City, 12345'
        assert household.landlord == landlord
        assert household.created_at is not None

    def test_household_str_representation(self, landlord):
        """Test string representation of household"""
        household = Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

        assert str(household) == 'Test Apartment - landlord@example.com'

    def test_member_count_property(self, landlord, tenant):
        """Test member_count property returns correct count"""
        household = Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

        # Initially should be 0
        assert household.member_count == 0

        # Add a member
        HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord
        )

        # Should now be 1
        assert household.member_count == 1

    def test_member_count_with_inactive_members(self, landlord, tenant):
        """Test member_count excludes inactive members"""
        household = Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

        # Add an active member
        HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord,
            is_active=True
        )

        # Add an inactive member
        another_tenant = User.objects.create_user(
            email='tenant2@example.com',
            password='testpass123',
            role='tenant'
        )
        HouseholdMembership.objects.create(
            household=household,
            tenant=another_tenant,
            invited_by=landlord,
            is_active=False
        )

        # Should only count active member
        assert household.member_count == 1


@pytest.mark.django_db
class TestHouseholdMembershipModel:
    """Test suite for HouseholdMembership model"""

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
            role='tenant',
            first_name='Jane',
            last_name='Smith'
        )

    @pytest.fixture
    def household(self, landlord):
        return Household.objects.create(
            name='Test Apartment',
            address='123 Main St',
            landlord=landlord
        )

    def test_create_membership(self, household, tenant, landlord):
        """Test creating a household membership"""
        membership = HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord
        )

        assert membership.household == household
        assert membership.tenant == tenant
        assert membership.invited_by == landlord
        assert membership.role == 'tenant'
        assert membership.is_active is True
        assert membership.joined_at is not None

    def test_membership_unique_constraint(self, household, tenant, landlord):
        """Test that same tenant cannot be added twice to same household"""
        HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord
        )

        # Attempting to create duplicate should raise IntegrityError
        with pytest.raises(IntegrityError):
            HouseholdMembership.objects.create(
                household=household,
                tenant=tenant,
                invited_by=landlord
            )

    def test_membership_default_role(self, household, tenant, landlord):
        """Test that default role is 'tenant'"""
        membership = HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord
        )

        assert membership.role == 'tenant'

    def test_membership_custom_role(self, household, tenant, landlord):
        """Test creating membership with custom role"""
        membership = HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord,
            role='landlord'
        )

        assert membership.role == 'landlord'

    def test_soft_delete_membership(self, household, tenant, landlord):
        """Test soft deleting a membership with is_active flag"""
        membership = HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord
        )

        assert membership.is_active is True

        # Soft delete
        membership.is_active = False
        membership.save()

        # Membership still exists but is inactive
        assert HouseholdMembership.objects.filter(id=membership.id).exists()
        assert membership.is_active is False

    def test_str_representation(self, household, tenant, landlord):
        """Test string representation of membership"""
        membership = HouseholdMembership.objects.create(
            household=household,
            tenant=tenant,
            invited_by=landlord
        )

        str_repr = str(membership)
        assert tenant.email in str_repr
        assert household.name in str_repr


@pytest.mark.django_db
class TestTenancyAgreementModel:
    """Test suite for TenancyAgreement model"""

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

    def test_create_tenancy_agreement(self, household):
        """Test creating a tenancy agreement"""
        agreement = TenancyAgreement.objects.create(
            household=household,
            file='agreements/test.pdf'
        )

        assert agreement.household == household
        assert 'test.pdf' in str(agreement.file)
        assert agreement.status == 'pending'
        assert agreement.extracted_data is None
        assert agreement.uploaded_at is not None

    def test_status_transitions(self, household):
        """Test status transitions of tenancy agreement"""
        agreement = TenancyAgreement.objects.create(
            household=household,
            file='agreements/test.pdf'
        )

        # Initial status
        assert agreement.status == 'pending'

        # Move to processing
        agreement.status = 'processing'
        agreement.save()
        assert agreement.status == 'processing'

        # Move to processed
        agreement.status = 'processed'
        agreement.save()
        assert agreement.status == 'processed'

    def test_extracted_data_storage(self, household):
        """Test storing extracted tenant data"""
        agreement = TenancyAgreement.objects.create(
            household=household,
            file='agreements/test.pdf'
        )

        # Initially null
        assert agreement.extracted_data is None

        # Store extracted data
        extracted_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'phone_number': '+31612345678'
        }
        agreement.extracted_data = extracted_data
        agreement.status = 'processed'
        agreement.save()

        # Reload from database
        agreement.refresh_from_db()
        assert agreement.extracted_data == extracted_data
        assert agreement.extracted_data['first_name'] == 'John'

    def test_failed_processing(self, household):
        """Test failed processing status"""
        agreement = TenancyAgreement.objects.create(
            household=household,
            file='agreements/test.pdf'
        )

        agreement.status = 'failed'
        agreement.save()

        assert agreement.status == 'failed'
        assert agreement.extracted_data is None

    def test_str_representation(self, household):
        """Test string representation of tenancy agreement"""
        agreement = TenancyAgreement.objects.create(
            household=household,
            file='agreements/test.pdf'
        )

        str_repr = str(agreement)
        assert household.name in str_repr
        assert agreement.status in str_repr
