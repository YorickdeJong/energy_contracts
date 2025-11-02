from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    RefreshTokenView,
    CurrentUserView,
    HouseholdViewSet,
    InvitationViewSet,
)
from .views.tenancies import TenancyViewSet

app_name = 'users'

# Create router for ViewSets
router = DefaultRouter()

# Register ViewSets
router.register(r'households', HouseholdViewSet, basename='household')
router.register(r'invitations', InvitationViewSet, basename='invitation')
router.register(r'tenancies', TenancyViewSet, basename='tenancy')

# Try to import and register OnboardingViewSet if available
try:
    from .views import OnboardingViewSet
    router.register(r'onboarding', OnboardingViewSet, basename='onboarding')
except ImportError:
    pass  # OnboardingViewSet not available (missing dependencies)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('', include(router.urls)),
]
