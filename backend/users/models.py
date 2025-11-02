from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator


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
