"""
Tests for Pydantic settings.
"""
import pytest
from pathlib import Path
from datetime import timedelta

from project.settings.base import Settings
from project.settings.development import DevelopmentSettings
from project.settings.production import ProductionSettings
from project.settings.test import TestSettings

# These are unit tests that don't require Django DB access


class TestBaseSettings:
    """Test base settings class."""

    def test_default_values(self):
        """Test that default values are set correctly."""
        settings = Settings()
        assert settings.debug is True
        assert settings.database_name == 'energy_contracts'
        assert settings.database_user == 'postgres'
        assert settings.access_token_lifetime == 15
        assert settings.refresh_token_lifetime == 7

    def test_allowed_hosts_list(self):
        """Test allowed_hosts conversion to list."""
        settings = Settings(allowed_hosts='localhost,127.0.0.1,example.com')
        assert settings.allowed_hosts_list == ['localhost', '127.0.0.1', 'example.com']

    def test_cors_origins_list(self):
        """Test cors_allowed_origins conversion to list."""
        settings = Settings(cors_allowed_origins='http://localhost:3000,http://localhost:3001')
        assert settings.cors_allowed_origins_list == ['http://localhost:3000', 'http://localhost:3001']

    def test_base_dir(self):
        """Test base_dir is a valid Path."""
        settings = Settings()
        assert isinstance(settings.base_dir, Path)
        assert settings.base_dir.exists()

    def test_static_root(self):
        """Test static_root path."""
        settings = Settings()
        assert isinstance(settings.static_root, Path)
        assert settings.static_root == settings.base_dir / 'staticfiles'

    def test_media_root(self):
        """Test media_root path."""
        settings = Settings()
        assert isinstance(settings.media_root, Path)
        assert settings.media_root == settings.base_dir / 'media'

    def test_access_token_lifetime_timedelta(self):
        """Test access token lifetime conversion to timedelta."""
        settings = Settings(access_token_lifetime=30)
        assert settings.access_token_lifetime_timedelta == timedelta(minutes=30)

    def test_refresh_token_lifetime_timedelta(self):
        """Test refresh token lifetime conversion to timedelta."""
        settings = Settings(refresh_token_lifetime=14)
        assert settings.refresh_token_lifetime_timedelta == timedelta(days=14)

    def test_effective_jwt_secret_key(self):
        """Test JWT secret key fallback."""
        settings = Settings(secret_key='django-secret', jwt_secret_key=None)
        assert settings.effective_jwt_secret_key == 'django-secret'

        settings = Settings(secret_key='django-secret', jwt_secret_key='jwt-secret')
        assert settings.effective_jwt_secret_key == 'jwt-secret'

    def test_get_database_config(self):
        """Test database configuration dictionary."""
        settings = Settings(
            database_name='test_db',
            database_user='test_user',
            database_password='test_pass',
            database_host='localhost',
            database_port='5432'
        )
        config = settings.get_database_config()
        assert config['default']['ENGINE'] == 'django.db.backends.postgresql'
        assert config['default']['NAME'] == 'test_db'
        assert config['default']['USER'] == 'test_user'
        assert config['default']['PASSWORD'] == 'test_pass'
        assert config['default']['HOST'] == 'localhost'
        assert config['default']['PORT'] == '5432'

    def test_get_simple_jwt_config(self):
        """Test Simple JWT configuration dictionary."""
        settings = Settings(
            secret_key='test-secret',
            jwt_secret_key='test-secret',  # Explicitly set JWT key to match
            access_token_lifetime=10,
            refresh_token_lifetime=5
        )
        config = settings.get_simple_jwt_config()
        assert config['ACCESS_TOKEN_LIFETIME'] == timedelta(minutes=10)
        assert config['REFRESH_TOKEN_LIFETIME'] == timedelta(days=5)
        assert config['SIGNING_KEY'] == 'test-secret'
        assert config['ROTATE_REFRESH_TOKENS'] is True
        assert config['BLACKLIST_AFTER_ROTATION'] is True

    def test_access_token_lifetime_validation(self):
        """Test access token lifetime validation (1-1440 minutes)."""
        # Valid range
        settings = Settings(access_token_lifetime=1)
        assert settings.access_token_lifetime == 1

        settings = Settings(access_token_lifetime=1440)
        assert settings.access_token_lifetime == 1440

        # Invalid range (outside 1-1440) should raise validation error
        with pytest.raises(Exception):  # Pydantic ValidationError
            Settings(access_token_lifetime=0)

        with pytest.raises(Exception):
            Settings(access_token_lifetime=1441)

    def test_refresh_token_lifetime_validation(self):
        """Test refresh token lifetime validation (1-90 days)."""
        # Valid range
        settings = Settings(refresh_token_lifetime=1)
        assert settings.refresh_token_lifetime == 1

        settings = Settings(refresh_token_lifetime=90)
        assert settings.refresh_token_lifetime == 90

        # Invalid range should raise validation error
        with pytest.raises(Exception):
            Settings(refresh_token_lifetime=0)

        with pytest.raises(Exception):
            Settings(refresh_token_lifetime=91)


class TestDevelopmentSettings:
    """Test development settings."""

    def test_development_defaults(self):
        """Test development-specific defaults."""
        settings = DevelopmentSettings()
        assert settings.debug is True
        assert 'localhost' in settings.allowed_hosts_list
        assert '127.0.0.1' in settings.allowed_hosts_list


class TestProductionSettings:
    """Test production settings."""

    def test_production_defaults(self):
        """Test production-specific defaults."""
        settings = ProductionSettings(
            secret_key='production-secret',
            allowed_hosts='example.com',
            debug=False  # Explicitly set debug to False for testing
        )
        assert settings.debug is False
        assert settings.secure_ssl_redirect is True
        assert settings.session_cookie_secure is True
        assert settings.csrf_cookie_secure is True


class TestTestSettings:
    """Test test environment settings."""

    def test_test_defaults(self):
        """Test test-specific defaults."""
        settings = TestSettings(
            secret_key='test-secret-key-not-for-production',  # Explicitly set for testing
            database_name='test_energy_contracts',  # Explicitly set for testing
            access_token_lifetime=5,  # Test default
            refresh_token_lifetime=1  # Test default
        )
        assert settings.debug is True
        assert settings.secret_key == 'test-secret-key-not-for-production'
        assert settings.database_name == 'test_energy_contracts'
        assert settings.access_token_lifetime == 5
        assert settings.refresh_token_lifetime == 1
