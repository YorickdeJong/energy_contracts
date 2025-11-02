"""
Production-specific settings.

These settings are optimized for production deployment with security hardening.
"""
from .base import Settings


class ProductionSettings(Settings):
    """Production environment settings."""

    # Override defaults for production
    debug: bool = False

    # Require these to be explicitly set in production
    secret_key: str  # No default - must be set
    allowed_hosts: str  # Must be explicitly configured

    # Security settings
    secure_ssl_redirect: bool = True
    session_cookie_secure: bool = True
    csrf_cookie_secure: bool = True
    secure_hsts_seconds: int = 31536000  # 1 year
    secure_hsts_include_subdomains: bool = True
    secure_hsts_preload: bool = True

    # Production logging
    log_level: str = 'INFO'

    # Longer token lifetimes in production
    access_token_lifetime: int = 15  # 15 minutes
    refresh_token_lifetime: int = 7  # 7 days


# Production settings instance
prod_settings = ProductionSettings()
