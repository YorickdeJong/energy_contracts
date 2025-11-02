from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
import secrets
from datetime import timedelta


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError('The Email field must be set')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model using email as the unique identifier."""

    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('landlord', 'Landlord'),
        ('tenant', 'Tenant'),
        ('user', 'Regular User'),
    ]

    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )

    # Primary fields
    email = models.EmailField(
        verbose_name='email address',
        max_length=255,
        unique=True,
        db_index=True,
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)

    # Additional fields
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=17,
        blank=True,
        null=True
    )
    profile_picture = models.URLField(max_length=500, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='tenant'
    )

    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Onboarding fields
    is_onboarded = models.BooleanField(default=False)
    onboarding_step = models.IntegerField(default=0)  # 0-4 tracking progress

    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Email is already required by USERNAME_FIELD

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email

    def get_full_name(self):
        """Return the first_name and last_name, with a space in between."""
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return full_name or self.email

    def get_short_name(self):
        """Return the first_name."""
        return self.first_name or self.email

    def is_landlord(self):
        return self.role == 'landlord'

    def is_admin(self):
        return self.role == 'admin' or self.is_superuser

    def is_tenant(self):
        return self.role == 'tenant'


class Household(models.Model):
    """A household/property managed by a landlord with multiple tenants."""

    name = models.CharField(max_length=255)  # e.g., "123 Main Street Apt 2"
    address = models.TextField()
    landlord = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_households'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'household'
        verbose_name_plural = 'households'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.landlord.email}"

    @property
    def member_count(self):
        return self.memberships.filter(is_active=True).count()


class HouseholdMembership(models.Model):
    """Represents a tenant's membership in a household."""

    MEMBERSHIP_ROLES = [
        ('landlord', 'Landlord'),
        ('tenant', 'Tenant'),
    ]

    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    tenant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='household_memberships'
    )
    role = models.CharField(max_length=20, choices=MEMBERSHIP_ROLES, default='tenant')
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invited_memberships'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'household membership'
        verbose_name_plural = 'household memberships'
        ordering = ['-joined_at']
        unique_together = [['household', 'tenant']]

    def __str__(self):
        return f"{self.tenant.email} in {self.household.name}"


class TenancyAgreement(models.Model):
    """Tenancy agreement file with AI-extracted tenant data"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
    ]

    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name='tenancy_agreements'
    )
    tenant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tenancy_agreements'
    )
    file = models.FileField(upload_to='tenancy_agreements/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    extracted_data = models.JSONField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'tenancy agreement'
        verbose_name_plural = 'tenancy agreements'

    def __str__(self):
        return f"Tenancy Agreement for {self.household.name} - {self.status}"


class Tenancy(models.Model):
    """A tenancy period for a household with specific start/end dates and status"""

    STATUS_CHOICES = [
        ('future', 'Future'),           # Scheduled for future
        ('active', 'Active'),           # Currently active
        ('moving_out', 'Moving Out'),   # Notice given, end date set
        ('moved_out', 'Moved Out'),     # Past tenancy
    ]

    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name='tenancies'
    )
    name = models.CharField(max_length=255, default='Unnamed Tenancy')  # e.g., "2024-2025 Lease"
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='future',
        db_index=True
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    monthly_rent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    proof_document = models.FileField(
        upload_to='tenancy_proofs/%Y/%m/',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'tenancy'
        verbose_name_plural = 'tenancies'
        ordering = ['-start_date']
        constraints = [
            # Ensure only one active tenancy per household
            models.UniqueConstraint(
                fields=['household'],
                condition=models.Q(status='active'),
                name='one_active_tenancy_per_household'
            )
        ]

    def __str__(self):
        return f"{self.household.name} - {self.get_status_display()} ({self.start_date})"

    @property
    def renter_count(self):
        """Return the number of renters in this tenancy"""
        return self.renters.count()

    @property
    def primary_renter(self):
        """Return the primary renter for this tenancy"""
        return self.renters.filter(is_primary=True).first()

    def clean(self):
        """Validate model data"""
        from django.core.exceptions import ValidationError

        # Validate end_date is after start_date
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValidationError('End date must be after start date')

        # Validate only one active tenancy per household
        if self.status == 'active':
            existing_active = Tenancy.objects.filter(
                household=self.household,
                status='active'
            ).exclude(pk=self.pk)
            if existing_active.exists():
                raise ValidationError(
                    f'Household "{self.household.name}" already has an active tenancy. '
                    'Please move out the current tenancy before activating a new one.'
                )


class Renter(models.Model):
    """A person who is part of a specific tenancy period"""

    tenancy = models.ForeignKey(
        Tenancy,
        on_delete=models.CASCADE,
        related_name='renters'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='renter_tenancies'
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='Primary contact for this tenancy'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'renter'
        verbose_name_plural = 'renters'
        ordering = ['-is_primary', 'joined_at']
        unique_together = [['tenancy', 'user']]  # User can only be in tenancy once

    def __str__(self):
        primary = ' (Primary)' if self.is_primary else ''
        return f"{self.user.get_full_name()}{primary} - {self.tenancy}"

    def save(self, *args, **kwargs):
        """Ensure only one primary renter per tenancy"""
        if self.is_primary:
            # Set all other renters in this tenancy to non-primary
            Renter.objects.filter(
                tenancy=self.tenancy,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class TenantInvitation(models.Model):
    """Invitation for a tenant to join a household"""

    email = models.EmailField(db_index=True)
    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'tenant invitation'
        verbose_name_plural = 'tenant invitations'
        unique_together = [['email', 'household']]  # One invitation per email per household

    def save(self, *args, **kwargs):
        # Auto-generate token if not set
        if not self.token:
            self.token = secrets.token_urlsafe(32)

        # Auto-set expiration if not set (7 days from now)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)

        super().save(*args, **kwargs)

    def is_valid(self):
        """Check if invitation is still valid"""
        return (
            self.accepted_at is None and
            timezone.now() < self.expires_at
        )

    def accept(self):
        """Mark invitation as accepted"""
        self.accepted_at = timezone.now()
        self.save()

    def __str__(self):
        return f"Invitation to {self.email} for {self.household.name}"
