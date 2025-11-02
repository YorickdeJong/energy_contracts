"""
Tests for project constants.
"""
from project.constants import (
    UserRole,
    Environment,
    API_VERSION,
    API_PREFIX,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MAX_UPLOAD_SIZE,
    MIN_PASSWORD_LENGTH,
)


class TestUserRole:
    """Test UserRole enum."""

    def test_user_role_values(self):
        """Test UserRole enum values."""
        assert UserRole.ADMIN.value == 'admin'
        assert UserRole.MANAGER.value == 'manager'
        assert UserRole.USER.value == 'user'

    def test_user_role_choices(self):
        """Test UserRole choices for Django models."""
        choices = UserRole.choices()
        assert len(choices) == 3
        assert ('admin', 'Admin') in choices
        assert ('manager', 'Manager') in choices
        assert ('user', 'User') in choices


class TestEnvironment:
    """Test Environment enum."""

    def test_environment_values(self):
        """Test Environment enum values."""
        assert Environment.DEVELOPMENT.value == 'development'
        assert Environment.PRODUCTION.value == 'production'
        assert Environment.STAGING.value == 'staging'
        assert Environment.TEST.value == 'test'


class TestAPIConstants:
    """Test API-related constants."""

    def test_api_version(self):
        """Test API version constant."""
        assert API_VERSION == 'v1'

    def test_api_prefix(self):
        """Test API prefix constant."""
        assert API_PREFIX == '/api/v1'


class TestPaginationConstants:
    """Test pagination constants."""

    def test_pagination_defaults(self):
        """Test pagination default values."""
        assert DEFAULT_PAGE_SIZE == 20
        assert MAX_PAGE_SIZE == 100


class TestFileUploadConstants:
    """Test file upload constants."""

    def test_max_upload_size(self):
        """Test max upload size (10MB in bytes)."""
        assert MAX_UPLOAD_SIZE == 10 * 1024 * 1024
        assert MAX_UPLOAD_SIZE == 10485760


class TestValidationConstants:
    """Test validation constants."""

    def test_password_length(self):
        """Test password length constraints."""
        assert MIN_PASSWORD_LENGTH == 8
        assert MIN_PASSWORD_LENGTH < 128
