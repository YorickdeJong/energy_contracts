"""
Base settings using Pydantic for validation and type safety.

This module provides centralized settings management using pydantic-settings
as per project standards.
"""
from datetime import timedelta
from typing import List
from pathlib import Path

from pydantic import Field, field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings with Pydantic validation.

    All settings are loaded from environment variables with sensible defaults
    for development. Production deployments should override these via .env file
    or environment variables.
    """

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore'
    )

    # Base Directory
    @computed_field
    @property
    def base_dir(self) -> Path:
        """Project base directory."""
        return Path(__file__).resolve().parent.parent.parent

    # Security
    secret_key: str = Field(
        default='django-insecure-change-this-in-production',
        description='Django secret key for cryptographic signing'
    )
    debug: bool = Field(
        default=True,
        description='Debug mode - should be False in production'
    )
    allowed_hosts: str = Field(
        default='localhost,127.0.0.1',
        description='Comma-separated list of allowed hosts'
    )

    # Database
    database_name: str = Field(
        default='energy_contracts',
        description='PostgreSQL database name'
    )
    database_user: str = Field(
        default='postgres',
        description='PostgreSQL database user'
    )
    database_password: str = Field(
        default='postgres',
        description='PostgreSQL database password'
    )
    database_host: str = Field(
        default='localhost',
        description='PostgreSQL database host'
    )
    database_port: str = Field(
        default='5432',
        description='PostgreSQL database port'
    )

    # CORS
    cors_allowed_origins: str = Field(
        default='http://localhost:3000',
        description='Comma-separated list of allowed CORS origins'
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description='Allow credentials in CORS requests'
    )

    # JWT
    access_token_lifetime: int = Field(
        default=15,
        description='Access token lifetime in minutes',
        ge=1,
        le=1440
    )
    refresh_token_lifetime: int = Field(
        default=7,
        description='Refresh token lifetime in days',
        ge=1,
        le=90
    )
    jwt_secret_key: str | None = Field(
        default=None,
        description='JWT secret key (defaults to SECRET_KEY if not set)'
    )

    # Static/Media Files
    static_url: str = Field(
        default='/static/',
        description='URL prefix for static files'
    )
    media_url: str = Field(
        default='/media/',
        description='URL prefix for media files'
    )

    @field_validator('allowed_hosts', mode='before')
    @classmethod
    def validate_allowed_hosts(cls, v: str) -> str:
        """Ensure allowed_hosts is a string."""
        if isinstance(v, list):
            return ','.join(v)
        return v

    @field_validator('cors_allowed_origins', mode='before')
    @classmethod
    def validate_cors_origins(cls, v: str) -> str:
        """Ensure cors_allowed_origins is a string."""
        if isinstance(v, list):
            return ','.join(v)
        return v

    @computed_field
    @property
    def allowed_hosts_list(self) -> List[str]:
        """Parse allowed_hosts as a list."""
        return [host.strip() for host in self.allowed_hosts.split(',') if host.strip()]

    @computed_field
    @property
    def cors_allowed_origins_list(self) -> List[str]:
        """Parse cors_allowed_origins as a list."""
        return [origin.strip() for origin in self.cors_allowed_origins.split(',') if origin.strip()]

    @computed_field
    @property
    def access_token_lifetime_timedelta(self) -> timedelta:
        """Get access token lifetime as timedelta."""
        return timedelta(minutes=self.access_token_lifetime)

    @computed_field
    @property
    def refresh_token_lifetime_timedelta(self) -> timedelta:
        """Get refresh token lifetime as timedelta."""
        return timedelta(days=self.refresh_token_lifetime)

    @computed_field
    @property
    def static_root(self) -> Path:
        """Static files directory."""
        return self.base_dir / 'staticfiles'

    @computed_field
    @property
    def media_root(self) -> Path:
        """Media files directory."""
        return self.base_dir / 'media'

    @computed_field
    @property
    def effective_jwt_secret_key(self) -> str:
        """Get JWT secret key, falling back to SECRET_KEY if not set."""
        return self.jwt_secret_key or self.secret_key

    def get_database_config(self) -> dict:
        """
        Get Django database configuration dictionary.

        Returns:
            dict: Django DATABASES configuration
        """
        return {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': self.database_name,
                'USER': self.database_user,
                'PASSWORD': self.database_password,
                'HOST': self.database_host,
                'PORT': self.database_port,
            }
        }

    def get_simple_jwt_config(self) -> dict:
        """
        Get djangorestframework-simplejwt configuration dictionary.

        Returns:
            dict: SIMPLE_JWT configuration
        """
        return {
            'ACCESS_TOKEN_LIFETIME': self.access_token_lifetime_timedelta,
            'REFRESH_TOKEN_LIFETIME': self.refresh_token_lifetime_timedelta,
            'ROTATE_REFRESH_TOKENS': True,
            'BLACKLIST_AFTER_ROTATION': True,
            'UPDATE_LAST_LOGIN': True,
            'ALGORITHM': 'HS256',
            'SIGNING_KEY': self.effective_jwt_secret_key,
            'VERIFYING_KEY': None,
            'AUDIENCE': None,
            'ISSUER': None,
            'AUTH_HEADER_TYPES': ('Bearer',),
            'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
            'USER_ID_FIELD': 'id',
            'USER_ID_CLAIM': 'user_id',
            'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
            'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
            'TOKEN_TYPE_CLAIM': 'token_type',
            'JTI_CLAIM': 'jti',
        }


# Instantiate settings
settings = Settings()
