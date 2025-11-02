"""
Project-wide custom exceptions.

This module defines custom exception classes used across the application
for consistent error handling.
"""
from typing import Any, Dict


class BaseAPIException(Exception):
    """
    Base exception for API errors.

    All custom API exceptions should inherit from this class.
    """
    default_message = "An error occurred"
    default_code = "error"
    status_code = 400

    def __init__(
        self,
        message: str | None = None,
        code: str | None = None,
        details: Dict[str, Any] | None = None
    ):
        """
        Initialize the exception.

        Args:
            message: Error message
            code: Error code
            details: Additional error details
        """
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API response.

        Returns:
            Dictionary representation of the error
        """
        result = {
            'error': self.code,
            'message': self.message,
        }
        if self.details:
            result['details'] = self.details
        return result


class ValidationError(BaseAPIException):
    """Validation error exception."""
    default_message = "Validation failed"
    default_code = "validation_error"
    status_code = 400


class AuthenticationError(BaseAPIException):
    """Authentication error exception."""
    default_message = "Authentication failed"
    default_code = "authentication_error"
    status_code = 401


class PermissionDeniedError(BaseAPIException):
    """Permission denied error exception."""
    default_message = "Permission denied"
    default_code = "permission_denied"
    status_code = 403


class NotFoundError(BaseAPIException):
    """Resource not found error exception."""
    default_message = "Resource not found"
    default_code = "not_found"
    status_code = 404


class ConflictError(BaseAPIException):
    """Conflict error exception."""
    default_message = "Resource conflict"
    default_code = "conflict"
    status_code = 409


class RateLimitError(BaseAPIException):
    """Rate limit exceeded error exception."""
    default_message = "Rate limit exceeded"
    default_code = "rate_limit_exceeded"
    status_code = 429


class ServerError(BaseAPIException):
    """Internal server error exception."""
    default_message = "Internal server error"
    default_code = "server_error"
    status_code = 500
