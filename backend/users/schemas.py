from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional


class HouseholdOnboardingSchema(BaseModel):
    """Schema for creating a household during onboarding"""
    name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1)

    @field_validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Household name cannot be empty')
        return v.strip()

    @field_validator('address')
    def validate_address(cls, v):
        if not v or not v.strip():
            raise ValueError('Address cannot be empty')
        return v.strip()


class LandlordUpdateSchema(BaseModel):
    """Schema for updating landlord information"""
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    phone_number: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')

    @field_validator('first_name', 'last_name')
    def validate_names(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty if provided')
        return v.strip() if v else None

    @field_validator('phone_number')
    def validate_phone_number(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Phone number cannot be empty if provided')
        return v.strip() if v else None


class TenancyUploadSchema(BaseModel):
    """Schema for validating tenancy agreement upload"""
    household_id: int = Field(..., gt=0)

    @field_validator('household_id')
    def validate_household_id(cls, v):
        if v <= 0:
            raise ValueError('Invalid household ID')
        return v


class TenantExtractedSchema(BaseModel):
    """Schema for extracted tenant data from AI"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')

    class Config:
        from_attributes = True


class TenantManualAddSchema(BaseModel):
    """Schema for manually adding a tenant"""
    household_id: int = Field(..., gt=0)
    first_name: str = Field(..., min_length=1, max_length=150)
    last_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    phone_number: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')

    @field_validator('first_name', 'last_name')
    def validate_names(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @field_validator('phone_number')
    def validate_phone_number(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Phone number cannot be empty if provided')
        return v.strip() if v else None


class OnboardingStatusSchema(BaseModel):
    """Schema for onboarding status response"""
    is_onboarded: bool
    onboarding_step: int
    household_created: bool
    landlord_info_complete: bool
    tenants_added: bool

    class Config:
        from_attributes = True
