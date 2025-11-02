import pytest
from pydantic import ValidationError
from users.schemas import (
    HouseholdOnboardingSchema,
    LandlordUpdateSchema,
    TenancyUploadSchema,
    TenantExtractedSchema,
    TenantManualAddSchema,
    OnboardingStatusSchema,
)


class TestHouseholdOnboardingSchema:
    """Test suite for HouseholdOnboardingSchema"""

    def test_valid_household_data(self):
        """Test valid household creation data"""
        data = {
            'name': 'Test Apartment',
            'address': '123 Main St, City, 12345'
        }
        schema = HouseholdOnboardingSchema(**data)
        assert schema.name == 'Test Apartment'
        assert schema.address == '123 Main St, City, 12345'

    def test_household_name_whitespace_trimmed(self):
        """Test that household name whitespace is trimmed"""
        data = {
            'name': '  Test Apartment  ',
            'address': '123 Main St'
        }
        schema = HouseholdOnboardingSchema(**data)
        assert schema.name == 'Test Apartment'

    def test_household_empty_name_fails(self):
        """Test that empty household name fails validation"""
        with pytest.raises(ValidationError):
            HouseholdOnboardingSchema(name='', address='123 Main St')

    def test_household_whitespace_only_name_fails(self):
        """Test that whitespace-only name fails validation"""
        with pytest.raises(ValidationError):
            HouseholdOnboardingSchema(name='   ', address='123 Main St')

    def test_household_empty_address_fails(self):
        """Test that empty address fails validation"""
        with pytest.raises(ValidationError):
            HouseholdOnboardingSchema(name='Test', address='')

    def test_household_missing_required_fields(self):
        """Test that missing required fields fail validation"""
        with pytest.raises(ValidationError):
            HouseholdOnboardingSchema(name='Test')


class TestLandlordUpdateSchema:
    """Test suite for LandlordUpdateSchema"""

    def test_valid_landlord_update(self):
        """Test valid landlord data update"""
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '+31612345678'
        }
        schema = LandlordUpdateSchema(**data)
        assert schema.first_name == 'John'
        assert schema.last_name == 'Doe'
        assert schema.phone_number == '+31612345678'

    def test_landlord_optional_fields(self):
        """Test that all fields are optional"""
        schema = LandlordUpdateSchema()
        assert schema.first_name is None
        assert schema.last_name is None
        assert schema.phone_number is None

    def test_landlord_partial_update(self):
        """Test updating only some fields"""
        data = {'first_name': 'John'}
        schema = LandlordUpdateSchema(**data)
        assert schema.first_name == 'John'
        assert schema.last_name is None

    def test_landlord_name_whitespace_trimmed(self):
        """Test that names are trimmed"""
        data = {'first_name': '  John  ', 'last_name': '  Doe  '}
        schema = LandlordUpdateSchema(**data)
        assert schema.first_name == 'John'
        assert schema.last_name == 'Doe'

    def test_landlord_invalid_phone_format(self):
        """Test that invalid phone numbers fail validation"""
        with pytest.raises(ValidationError):
            LandlordUpdateSchema(phone_number='invalid')

    def test_landlord_valid_phone_formats(self):
        """Test various valid phone number formats"""
        valid_phones = [
            '+31612345678',
            '31612345678',
            '0612345678',
            '+1234567890'
        ]
        for phone in valid_phones:
            schema = LandlordUpdateSchema(phone_number=phone)
            assert schema.phone_number == phone


class TestTenancyUploadSchema:
    """Test suite for TenancyUploadSchema"""

    def test_valid_tenancy_upload(self):
        """Test valid tenancy upload data"""
        data = {'household_id': 1}
        schema = TenancyUploadSchema(**data)
        assert schema.household_id == 1

    def test_tenancy_upload_zero_id_fails(self):
        """Test that household_id of 0 fails"""
        with pytest.raises(ValidationError):
            TenancyUploadSchema(household_id=0)

    def test_tenancy_upload_negative_id_fails(self):
        """Test that negative household_id fails"""
        with pytest.raises(ValidationError):
            TenancyUploadSchema(household_id=-1)

    def test_tenancy_upload_missing_id_fails(self):
        """Test that missing household_id fails"""
        with pytest.raises(ValidationError):
            TenancyUploadSchema()


class TestTenantExtractedSchema:
    """Test suite for TenantExtractedSchema"""

    def test_valid_extracted_tenant(self):
        """Test valid extracted tenant data"""
        data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane@example.com',
            'phone_number': '+31612345678'
        }
        schema = TenantExtractedSchema(**data)
        assert schema.first_name == 'Jane'
        assert schema.last_name == 'Smith'
        assert schema.email == 'jane@example.com'
        assert schema.phone_number == '+31612345678'

    def test_extracted_tenant_all_optional(self):
        """Test that all fields are optional (AI might not find them)"""
        schema = TenantExtractedSchema()
        assert schema.first_name is None
        assert schema.last_name is None
        assert schema.email is None
        assert schema.phone_number is None

    def test_extracted_tenant_partial_data(self):
        """Test with only some fields extracted"""
        data = {'first_name': 'Jane', 'email': 'jane@example.com'}
        schema = TenantExtractedSchema(**data)
        assert schema.first_name == 'Jane'
        assert schema.email == 'jane@example.com'
        assert schema.last_name is None

    def test_extracted_tenant_invalid_email(self):
        """Test that invalid email fails validation"""
        with pytest.raises(ValidationError):
            TenantExtractedSchema(email='not-an-email')

    def test_extracted_tenant_invalid_phone(self):
        """Test that invalid phone fails validation"""
        with pytest.raises(ValidationError):
            TenantExtractedSchema(phone_number='invalid-phone')


class TestTenantManualAddSchema:
    """Test suite for TenantManualAddSchema"""

    def test_valid_manual_tenant(self):
        """Test valid manual tenant addition"""
        data = {
            'household_id': 1,
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'phone_number': '+31612345678'
        }
        schema = TenantManualAddSchema(**data)
        assert schema.household_id == 1
        assert schema.first_name == 'John'
        assert schema.last_name == 'Doe'
        assert schema.email == 'john@example.com'
        assert schema.phone_number == '+31612345678'

    def test_manual_tenant_without_phone(self):
        """Test that phone number is optional"""
        data = {
            'household_id': 1,
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com'
        }
        schema = TenantManualAddSchema(**data)
        assert schema.phone_number is None

    def test_manual_tenant_missing_required_fields(self):
        """Test that required fields cannot be missing"""
        with pytest.raises(ValidationError):
            TenantManualAddSchema(
                household_id=1,
                first_name='John'
                # missing last_name and email
            )

    def test_manual_tenant_empty_names_fail(self):
        """Test that empty names fail validation"""
        with pytest.raises(ValidationError):
            TenantManualAddSchema(
                household_id=1,
                first_name='',
                last_name='Doe',
                email='john@example.com'
            )

    def test_manual_tenant_names_trimmed(self):
        """Test that names are trimmed"""
        data = {
            'household_id': 1,
            'first_name': '  John  ',
            'last_name': '  Doe  ',
            'email': 'john@example.com'
        }
        schema = TenantManualAddSchema(**data)
        assert schema.first_name == 'John'
        assert schema.last_name == 'Doe'

    def test_manual_tenant_invalid_email(self):
        """Test that invalid email fails validation"""
        with pytest.raises(ValidationError):
            TenantManualAddSchema(
                household_id=1,
                first_name='John',
                last_name='Doe',
                email='invalid-email'
            )


class TestOnboardingStatusSchema:
    """Test suite for OnboardingStatusSchema"""

    def test_valid_onboarding_status(self):
        """Test valid onboarding status"""
        data = {
            'is_onboarded': True,
            'onboarding_step': 4,
            'household_created': True,
            'landlord_info_complete': True,
            'tenants_added': True
        }
        schema = OnboardingStatusSchema(**data)
        assert schema.is_onboarded is True
        assert schema.onboarding_step == 4
        assert schema.household_created is True
        assert schema.landlord_info_complete is True
        assert schema.tenants_added is True

    def test_onboarding_status_incomplete(self):
        """Test incomplete onboarding status"""
        data = {
            'is_onboarded': False,
            'onboarding_step': 2,
            'household_created': True,
            'landlord_info_complete': True,
            'tenants_added': False
        }
        schema = OnboardingStatusSchema(**data)
        assert schema.is_onboarded is False
        assert schema.onboarding_step == 2
        assert schema.tenants_added is False

    def test_onboarding_status_from_attributes(self):
        """Test that Config.from_attributes works"""
        # This simulates loading from ORM models
        class MockUser:
            is_onboarded = True
            onboarding_step = 4
            household_created = True
            landlord_info_complete = True
            tenants_added = True

        schema = OnboardingStatusSchema.model_validate(MockUser())
        assert schema.is_onboarded is True
        assert schema.onboarding_step == 4
