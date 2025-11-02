from rest_framework import permissions


class IsLandlordOrAdmin(permissions.BasePermission):
    """
    Permission to only allow landlords or admins to access.
    """
    def has_permission(self, request, view):
        user = request.user
        return (
            user and
            user.is_authenticated and
            (user.role in ['landlord', 'admin'] or user.is_superuser)
        )


class IsHouseholdLandlord(permissions.BasePermission):
    """
    Permission to only allow the household's landlord or admins to access.
    """
    def has_object_permission(self, request, view, obj):
        # Admin users have full access
        if request.user.is_superuser or request.user.role == 'admin':
            return True

        # Check if the user is the landlord of the household
        return obj.landlord == request.user


class IsTenantOrLandlord(permissions.BasePermission):
    """
    Permission to allow tenants to view their own household or landlords to view their households.
    """
    def has_object_permission(self, request, view, obj):
        # Admin users have full access
        if request.user.is_superuser or request.user.role == 'admin':
            return True

        # Landlord of the household
        if obj.landlord == request.user:
            return True

        # Tenant who is a member of the household
        if hasattr(obj, 'memberships'):
            return obj.memberships.filter(
                tenant=request.user,
                is_active=True
            ).exists()

        return False
