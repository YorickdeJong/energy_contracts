"""
Tests for custom exceptions.
"""
import pytest
from project.exceptions import (
    BaseAPIException,
    ValidationError,
    AuthenticationError,
    PermissionDeniedError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ServerError,
)


class TestBaseAPIException:
    """Test base API exception."""

    def test_default_values(self):
        """Test exception with default values."""
        exc = BaseAPIException()
        assert exc.message == "An error occurred"
        assert exc.code == "error"
        assert exc.status_code == 400
        assert exc.details == {}

    def test_custom_message(self):
        """Test exception with custom message."""
        exc = BaseAPIException(message="Custom error")
        assert exc.message == "Custom error"

    def test_custom_code(self):
        """Test exception with custom code."""
        exc = BaseAPIException(code="custom_code")
        assert exc.code == "custom_code"

    def test_custom_details(self):
        """Test exception with custom details."""
        details = {"field": "email", "reason": "invalid"}
        exc = BaseAPIException(details=details)
        assert exc.details == details

    def test_to_dict(self):
        """Test exception conversion to dictionary."""
        exc = BaseAPIException(
            message="Test error",
            code="test_error",
            details={"field": "test"}
        )
        result = exc.to_dict()
        assert result["error"] == "test_error"
        assert result["message"] == "Test error"
        assert result["details"] == {"field": "test"}

    def test_to_dict_without_details(self):
        """Test exception conversion without details."""
        exc = BaseAPIException(message="Test error", code="test_error")
        result = exc.to_dict()
        assert "error" in result
        assert "message" in result
        assert "details" not in result


class TestValidationError:
    """Test validation error exception."""

    def test_default_message(self):
        """Test default validation error message."""
        exc = ValidationError()
        assert exc.message == "Validation failed"
        assert exc.code == "validation_error"
        assert exc.status_code == 400


class TestAuthenticationError:
    """Test authentication error exception."""

    def test_default_message(self):
        """Test default authentication error message."""
        exc = AuthenticationError()
        assert exc.message == "Authentication failed"
        assert exc.code == "authentication_error"
        assert exc.status_code == 401


class TestPermissionDeniedError:
    """Test permission denied error exception."""

    def test_default_message(self):
        """Test default permission denied error message."""
        exc = PermissionDeniedError()
        assert exc.message == "Permission denied"
        assert exc.code == "permission_denied"
        assert exc.status_code == 403


class TestNotFoundError:
    """Test not found error exception."""

    def test_default_message(self):
        """Test default not found error message."""
        exc = NotFoundError()
        assert exc.message == "Resource not found"
        assert exc.code == "not_found"
        assert exc.status_code == 404


class TestConflictError:
    """Test conflict error exception."""

    def test_default_message(self):
        """Test default conflict error message."""
        exc = ConflictError()
        assert exc.message == "Resource conflict"
        assert exc.code == "conflict"
        assert exc.status_code == 409


class TestRateLimitError:
    """Test rate limit error exception."""

    def test_default_message(self):
        """Test default rate limit error message."""
        exc = RateLimitError()
        assert exc.message == "Rate limit exceeded"
        assert exc.code == "rate_limit_exceeded"
        assert exc.status_code == 429


class TestServerError:
    """Test server error exception."""

    def test_default_message(self):
        """Test default server error message."""
        exc = ServerError()
        assert exc.message == "Internal server error"
        assert exc.code == "server_error"
        assert exc.status_code == 500
