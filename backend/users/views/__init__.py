from .auth import (
    RegisterView,
    LoginView,
    LogoutView,
    RefreshTokenView,
    CurrentUserView,
)
from .households import HouseholdViewSet
from .invitations import InvitationViewSet

# Try to import OnboardingViewSet, but don't fail if dependencies are missing
try:
    from .onboarding import OnboardingViewSet
    __all__ = [
        'RegisterView',
        'LoginView',
        'LogoutView',
        'RefreshTokenView',
        'CurrentUserView',
        'HouseholdViewSet',
        'InvitationViewSet',
        'OnboardingViewSet',
    ]
except ImportError:
    __all__ = [
        'RegisterView',
        'LoginView',
        'LogoutView',
        'RefreshTokenView',
        'CurrentUserView',
        'HouseholdViewSet',
        'InvitationViewSet',
    ]
