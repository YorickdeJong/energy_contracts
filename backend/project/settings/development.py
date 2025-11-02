"""
Development-specific settings.

These settings are optimized for local development with helpful debugging tools.
"""
from .base import Settings


class DevelopmentSettings(Settings):
    """Development environment settings."""

    # Override defaults for development
    debug: bool = True
    allowed_hosts: str = 'localhost,127.0.0.1,0.0.0.0'

    # More verbose logging in development
    log_level: str = 'DEBUG'

    # Shorter token lifetimes for testing
    access_token_lifetime: int = 15  # 15 minutes
    refresh_token_lifetime: int = 7  # 7 days


# Development settings instance
dev_settings = DevelopmentSettings()
