from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, Household, HouseholdMembership, TenancyAgreement, TenantInvitation


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


class HouseholdSerializer(serializers.ModelSerializer):
    """Serializer for Household model."""
    member_count = serializers.ReadOnlyField()

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
