from pydantic import BaseModel, EmailStr, field_validator, Field, model_validator
from typing import Optional, List
from datetime import date
from decimal import Decimal


class HouseholdOnboardingSchema(BaseModel):
    """Schema for creating a household during onboarding"""
    name: str = Field(..., min_length=1, max_length=255)
    # Accept either a single address field or detailed address components
    address: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

    @field_validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Household name cannot be empty')
        return v.strip()

    def model_post_init(self, __context):
        """Construct full address from components if not provided"""
        if not self.address:
            # Build address from components
            components = []
            if self.street_address:
                components.append(self.street_address)
            if self.city:
                components.append(self.city)
            if self.postal_code:
                components.append(self.postal_code)
            if self.country:
                components.append(self.country)

            if not components:
                raise ValueError('Either address or address components (street_address, city, etc.) must be provided')

            self.address = ', '.join(components)

        # Validate final address
        if not self.address or not self.address.strip():
            raise ValueError('Address cannot be empty')

        self.address = self.address.strip()


class LandlordUpdateSchema(BaseModel):
    """Schema for updating landlord information"""
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
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
    """Schema for extracted tenant data from AI (legacy single tenant)"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')

    class Config:
        from_attributes = True


class RenterExtractedSchema(BaseModel):
    """Schema for a single extracted renter from AI"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')
    is_primary: bool = False

    class Config:
        from_attributes = True


class TenancyExtractedSchema(BaseModel):
    """Schema for complete extracted tenancy data from AI"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    monthly_rent: Optional[Decimal] = Field(None, ge=0)
    deposit: Optional[Decimal] = Field(None, ge=0)
    renters: List[RenterExtractedSchema] = []
    # Backward compatibility fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None

    @field_validator('start_date', 'end_date', mode='before')
    def parse_date(cls, v):
        """Parse date from various string formats"""
        if v is None or isinstance(v, date):
            return v
        if isinstance(v, str):
            from dateutil import parser
            try:
                return parser.parse(v).date()
            except:
                return None
        return v

    @model_validator(mode='after')
    def validate_dates(self):
        """Validate that end_date is after start_date if both present"""
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValueError('End date must be after start date')
        return self

    class Config:
        from_attributes = True


class TenancyConfirmSchema(BaseModel):
    """Schema for confirming tenancy creation with user input"""
    tenancy_agreement_id: int = Field(..., gt=0)
    tenancy_name: str = Field(..., min_length=1, max_length=255)
    start_date: date
    end_date: Optional[date] = None
    monthly_rent: Decimal = Field(..., ge=0)
    deposit: Decimal = Field(default=Decimal('0.00'), ge=0)
    # Renters will be created separately in Step 4

    @field_validator('tenancy_name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Tenancy name cannot be empty')
        return v.strip()

    @model_validator(mode='after')
    def validate_dates(self):
        """Validate that end_date is after start_date"""
        if self.end_date and self.end_date <= self.start_date:
            raise ValueError('End date must be after start date')
        return self

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


class InvitationVerifySchema(BaseModel):
    """Schema for verifying an invitation token"""
    token: str = Field(..., min_length=1, max_length=64)

    @field_validator('token')
    def validate_token(cls, v):
        if not v or not v.strip():
            raise ValueError('Token cannot be empty')
        return v.strip()


class InvitationAcceptSchema(BaseModel):
    """Schema for accepting an invitation"""
    token: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)
    password_confirm: str = Field(..., min_length=8, max_length=128)
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    phone_number: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')

    @field_validator('token')
    def validate_token(cls, v):
        if not v or not v.strip():
            raise ValueError('Token cannot be empty')
        return v.strip()

    @field_validator('password', 'password_confirm')
    def validate_password(cls, v):
        if not v or len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

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

    def validate_passwords_match(self):
        """Validate that passwords match"""
        if self.password != self.password_confirm:
            raise ValueError('Passwords do not match')


class InvitationCreateSchema(BaseModel):
    """Schema for creating a tenant invitation"""
    email: EmailStr
    household_id: int = Field(..., gt=0)

    @field_validator('household_id')
    def validate_household_id(cls, v):
        if v <= 0:
            raise ValueError('Invalid household ID')
        return v


class InvitationResponseSchema(BaseModel):
    """Schema for invitation response data"""
    id: int
    email: str
    household: int
    household_name: str
    invited_by: int
    invited_by_name: str
    token: str
    created_at: str
    expires_at: str
    accepted_at: Optional[str] = None
    is_valid: bool

    class Config:
        from_attributes = True


# ==================== Tenancy Schemas ====================

class RenterSchema(BaseModel):
    """Schema for adding a renter to a tenancy"""
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    is_primary: bool = False

    @field_validator('first_name', 'last_name')
    def validate_names(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty if provided')
        return v.strip() if v else None


class TenancyCreateSchema(BaseModel):
    """Schema for creating a new tenancy"""
    household_id: int = Field(..., gt=0)
    start_date: date
    end_date: Optional[date] = None
    monthly_rent: Decimal = Field(default=Decimal('0.00'), ge=0)
    deposit: Decimal = Field(default=Decimal('0.00'), ge=0)
    status: str = Field(default='future')
    # Optional: Add renters during creation
    renters: Optional[List[RenterSchema]] = None

    @field_validator('status')
    def validate_status(cls, v):
        valid_statuses = ['future', 'active', 'moving_out', 'moved_out']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

    @model_validator(mode='after')
    def validate_dates(self):
        """Validate that end_date is after start_date"""
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValueError('End date must be after start date')
        return self


class TenancyUpdateSchema(BaseModel):
    """Schema for updating a tenancy"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    monthly_rent: Optional[Decimal] = Field(None, ge=0)
    deposit: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = None

    @field_validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['future', 'active', 'moving_out', 'moved_out']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

    @model_validator(mode='after')
    def validate_dates(self):
        """Validate that end_date is after start_date if both provided"""
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValueError('End date must be after start date')
        return self


class AddRenterSchema(BaseModel):
    """Schema for adding a renter to an existing tenancy"""
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    is_primary: bool = False

    @field_validator('first_name', 'last_name')
    def validate_names(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty if provided')
        return v.strip() if v else None


class StartMoveoutSchema(BaseModel):
    """Schema for starting the move-out process"""
    end_date: date

    @field_validator('end_date')
    def validate_end_date(cls, v):
        if v < date.today():
            raise ValueError('End date cannot be in the past')
        return v


# ==================== Password Management Schemas ====================

class PasswordChangeSchema(BaseModel):
    """Schema for changing password"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters long')
        return v

    @model_validator(mode='after')
    def validate_passwords_match(self):
        """Validate that new passwords match"""
        if self.new_password != self.confirm_password:
            raise ValueError('New passwords do not match')
        return self
