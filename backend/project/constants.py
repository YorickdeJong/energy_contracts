"""
Project-wide constants and enumerations.

This module contains constants used across the application to ensure
consistency and prevent magic strings/numbers.
"""
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = 'admin'
    MANAGER = 'manager'
    USER = 'user'

    @classmethod
    def choices(cls):
        """Return choices for Django model field."""
        return [(role.value, role.name.title()) for role in cls]


class Environment(str, Enum):
    """Environment enumeration."""
    DEVELOPMENT = 'development'
    PRODUCTION = 'production'
    STAGING = 'staging'
    TEST = 'test'


# API Configuration
API_VERSION = 'v1'
API_PREFIX = f'/api/{API_VERSION}'

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# File Upload
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB in bytes
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']

# Date/Time Formats
DATE_FORMAT = '%Y-%m-%d'
DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S'
TIME_FORMAT = '%H:%M:%S'

# Validation
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
MIN_USERNAME_LENGTH = 3
MAX_USERNAME_LENGTH = 150
