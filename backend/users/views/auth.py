from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from ..models import User
from ..serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
)


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    """
    Register a new user.

    POST /api/users/register/
    {
        "email": "user@example.com",
        "password": "securepassword",
        "password_confirm": "securepassword",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+31612345678"
    }
    """
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer
    authentication_classes = []  # Disable authentication for registration

    def create(self, request, *args, **kwargs):
        """Create a new user and return user data with tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for the new user
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """
    Authenticate user and return JWT tokens.

    POST /api/users/login/
    {
        "email": "user@example.com",
        "password": "securepassword"
    }

    Returns:
    {
        "access": "jwt_access_token",
        "refresh": "jwt_refresh_token",
        "user": {
            "id": 1,
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            ...
        }
    }
    """
    permission_classes = (AllowAny,)
    serializer_class = CustomTokenObtainPairSerializer


class RefreshTokenView(TokenRefreshView):
    """
    Refresh the access token using refresh token.

    POST /api/users/refresh/
    {
        "refresh": "jwt_refresh_token"
    }

    Returns:
    {
        "access": "new_jwt_access_token",
        "refresh": "new_jwt_refresh_token"  # if rotation is enabled
    }
    """
    permission_classes = (AllowAny,)


class LogoutView(APIView):
    """
    Logout user by blacklisting the refresh token.

    POST /api/users/logout/
    {
        "refresh": "jwt_refresh_token"
    }
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        """Blacklist the refresh token."""
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {'message': 'Successfully logged out'},
                status=status.HTTP_205_RESET_CONTENT
            )
        except (TokenError, InvalidToken) as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(APIView):
    """
    Get current authenticated user data.

    GET /api/users/me/

    Returns:
    {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        ...
    }
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        """Return current user data."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user data."""
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
