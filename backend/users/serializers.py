from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, Household, HouseholdMembership, TenancyAgreement, TenantInvitation, Tenancy, Renter


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data."""

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'phone_number',
            'profile_picture',
            'role',
            'is_active',
            'is_verified',
            'is_onboarded',
            'onboarding_step',
            'date_joined',
        )
        read_only_fields = ('id', 'email', 'role', 'is_active', 'is_verified', 'is_onboarded', 'onboarding_step', 'date_joined')


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    role = serializers.ChoiceField(
        choices=['landlord', 'tenant'],
        required=False,
        default='tenant'
    )

    class Meta:
        model = User
        fields = (
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone_number',
            'role',
        )

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields did not match.'
            })
        return attrs

    def create(self, validated_data):
        """Create a new user."""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer that includes user data."""
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        """Add custom claims to token."""
        token = super().get_token(user)

        # Add custom claims
        token['email'] = user.email
        token['role'] = user.role
        token['is_verified'] = user.is_verified

        return token

    def validate(self, attrs):
        """Validate and return token with user data."""
        data = super().validate(attrs)

        # Add user data to response
        data['user'] = UserSerializer(self.user).data

        return data


class LandlordSerializer(serializers.ModelSerializer):
    """Simplified user serializer for landlord data."""

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number')
        read_only_fields = fields


class HouseholdSerializer(serializers.ModelSerializer):
    """Serializer for Household model."""
    member_count = serializers.ReadOnlyField()
    landlord = LandlordSerializer(read_only=True)

    class Meta:
        model = Household
        fields = (
            'id',
            'name',
            'address',
            'landlord',
            'created_at',
            'updated_at',
            'is_active',
            'member_count',
        )
        read_only_fields = ('id', 'landlord', 'created_at', 'updated_at')


class HouseholdMembershipSerializer(serializers.ModelSerializer):
    """Serializer for HouseholdMembership model."""
    tenant_email = serializers.EmailField(source='tenant.email', read_only=True)
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)

    class Meta:
        model = HouseholdMembership
        fields = (
            'id',
            'household',
            'tenant',
            'tenant_email',
            'tenant_name',
            'role',
            'joined_at',
            'invited_by',
            'is_active',
        )
        read_only_fields = ('id', 'joined_at')


class TenancyAgreementSerializer(serializers.ModelSerializer):
    """Serializer for TenancyAgreement model."""
    tenant_email = serializers.EmailField(source='tenant.email', read_only=True, allow_null=True)
    household_name = serializers.CharField(source='household.name', read_only=True)

    class Meta:
        model = TenancyAgreement
        fields = (
            'id',
            'household',
            'household_name',
            'tenant',
            'tenant_email',
            'file',
            'uploaded_at',
            'extracted_data',
            'status',
        )
        read_only_fields = ('id', 'uploaded_at', 'extracted_data', 'status')


class TenantInvitationSerializer(serializers.ModelSerializer):
    """Serializer for TenantInvitation model."""
    household_name = serializers.CharField(source='household.name', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = TenantInvitation
        fields = (
            'id',
            'email',
            'household',
            'household_name',
            'invited_by',
            'invited_by_name',
            'token',
            'created_at',
            'expires_at',
            'accepted_at',
            'is_valid',
        )
        read_only_fields = ('id', 'token', 'created_at', 'expires_at', 'accepted_at')

    def get_is_valid(self, obj):
        return obj.is_valid()


class InvitationAcceptSerializer(serializers.Serializer):
    """Serializer for accepting an invitation."""
    token = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields did not match.'
            })
        return attrs


# ==================== Tenancy Serializers ====================

class RenterUserSerializer(serializers.ModelSerializer):
    """Simplified user serializer for renter data."""

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number')
        read_only_fields = fields


class RenterSerializer(serializers.ModelSerializer):
    """Serializer for Renter model."""
    user = RenterUserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Renter
        fields = (
            'id',
            'tenancy',
            'user',
            'user_id',
            'is_primary',
            'joined_at',
        )
        read_only_fields = ('id', 'joined_at')


class TenancySerializer(serializers.ModelSerializer):
    """Serializer for Tenancy model."""
    household_name = serializers.CharField(source='household.name', read_only=True)
    renter_count = serializers.ReadOnlyField()
    renters = RenterSerializer(many=True, read_only=True)
    primary_renter = serializers.SerializerMethodField()

    class Meta:
        model = Tenancy
        fields = (
            'id',
            'household',
            'household_name',
            'name',
            'status',
            'start_date',
            'end_date',
            'monthly_rent',
            'deposit',
            'proof_document',
            'inventory_report',
            'checkout_reading',
            'renter_count',
            'renters',
            'primary_renter',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_primary_renter(self, obj):
        """Get the primary renter for this tenancy."""
        primary = obj.primary_renter
        if primary:
            return RenterUserSerializer(primary.user).data
        return None

    def validate(self, attrs):
        """Validate tenancy data."""
        # Validate dates
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        end_date = attrs.get('end_date')

        if end_date and start_date and end_date <= start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })

        # Validate only one active tenancy per household
        if attrs.get('status') == 'active' or (self.instance and self.instance.status == 'active'):
            household = attrs.get('household') or (self.instance.household if self.instance else None)

            if household:
                existing_active = Tenancy.objects.filter(
                    household=household,
                    status='active'
                )

                # Exclude current instance if updating
                if self.instance:
                    existing_active = existing_active.exclude(pk=self.instance.pk)

                if existing_active.exists():
                    raise serializers.ValidationError({
                        'status': f'Household "{household.name}" already has an active tenancy. '
                                 'Please move out the current tenancy before activating a new one.'
                    })

        return attrs


class TenancyListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing tenancies."""
    household_name = serializers.CharField(source='household.name', read_only=True)
    renter_count = serializers.ReadOnlyField()
    primary_renter = serializers.SerializerMethodField()

    class Meta:
        model = Tenancy
        fields = (
            'id',
            'household',
            'household_name',
            'name',
            'status',
            'start_date',
            'end_date',
            'monthly_rent',
            'deposit',
            'proof_document',
            'renter_count',
            'primary_renter',
            'created_at',
        )
        read_only_fields = fields

    def get_primary_renter(self, obj):
        """Get the primary renter name."""
        primary = obj.primary_renter
        if primary:
            return {
                'id': primary.user.id,
                'name': primary.user.get_full_name(),
                'email': primary.user.email,
            }
        return None
