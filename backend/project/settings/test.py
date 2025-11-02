"""
Test-specific settings.

These settings are optimized for running tests with pytest.
"""
from .base import Settings


class TestSettings(Settings):
    """Test environment settings."""

    # Override defaults for testing
    debug: bool = True
    secret_key: str = 'test-secret-key-not-for-production'

    # Use in-memory or test database
    database_name: str = 'test_energy_contracts'

    # Faster password hashing for tests
    password_hashers: list = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]

    # Disable migrations for faster tests (optional)
    # Can be overridden in pytest.ini or conftest.py

    # Short token lifetimes for testing
    access_token_lifetime: int = 5  # 5 minutes
    refresh_token_lifetime: int = 1  # 1 day


# Test settings instance
test_settings = TestSettings()
