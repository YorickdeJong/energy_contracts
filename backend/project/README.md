# Project Configuration

This folder contains project-wide configuration, settings, constants, and utilities.

## Structure

```
project/
├── __init__.py              # Package initialization
├── README.md                # This file
├── settings/                # Settings management
│   ├── __init__.py         # Exports main settings instance
│   ├── base.py             # Base settings with Pydantic
│   ├── development.py      # Development environment settings
│   ├── production.py       # Production environment settings
│   └── test.py             # Test environment settings
├── constants.py            # Project-wide constants and enums
├── utils.py                # Utility functions
└── exceptions.py           # Custom exception classes
```

## Settings Management

This project uses **Pydantic** for settings management, following the project standards defined in `CLAUDE.md`.

### Usage

```python
from project.settings import settings

# Access settings
secret_key = settings.secret_key
debug_mode = settings.debug
db_config = settings.get_database_config()
jwt_config = settings.get_simple_jwt_config()
```

### Environment-Specific Settings

Load different settings based on the environment:

```python
from project.settings.development import dev_settings
from project.settings.production import prod_settings
from project.settings.test import test_settings

# In Django settings.py, you can conditionally import:
import os
from project.settings import settings  # Default
from project.settings.development import dev_settings
from project.settings.production import prod_settings

ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
if ENVIRONMENT == 'production':
    app_settings = prod_settings
elif ENVIRONMENT == 'development':
    app_settings = dev_settings
else:
    app_settings = settings
```

### Features

- **Type Safety**: All settings are validated using Pydantic
- **Environment Variables**: Automatically loaded from `.env` file
- **Computed Fields**: Derived values calculated automatically
- **Validation**: Input validation with custom validators
- **Multiple Environments**: Separate configurations for dev, prod, and test

## Constants

Project-wide constants are defined in `constants.py`:

```python
from project.constants import UserRole, API_PREFIX, MAX_UPLOAD_SIZE

# Use enums for consistent values
role = UserRole.ADMIN
choices = UserRole.choices()  # For Django model fields

# Use constants instead of magic strings/numbers
api_url = f"{API_PREFIX}/users/"
```

## Utilities

Helper functions in `utils.py`:

```python
from project.utils import get_env_variable, is_production, str_to_bool

# Get environment variables with validation
api_key = get_env_variable('API_KEY', required=True)
debug = str_to_bool(get_env_variable('DEBUG', 'False'))

# Check environment
if is_production():
    # Production-specific logic
    pass
```

## Custom Exceptions

Consistent error handling with custom exceptions in `exceptions.py`:

```python
from project.exceptions import ValidationError, NotFoundError

# Raise exceptions with consistent structure
raise ValidationError(
    message="Invalid email format",
    code="invalid_email",
    details={"email": "user@example"}
)

# Convert to API response
try:
    # Some operation
    pass
except ValidationError as e:
    return Response(e.to_dict(), status=e.status_code)
```

## Integration with Django

To integrate these settings with your Django project:

1. **Update `config/settings.py`**:
   ```python
   from project.settings import settings

   SECRET_KEY = settings.secret_key
   DEBUG = settings.debug
   ALLOWED_HOSTS = settings.allowed_hosts_list
   DATABASES = settings.get_database_config()
   SIMPLE_JWT = settings.get_simple_jwt_config()
   ```

2. **Use constants**:
   ```python
   from project.constants import UserRole

   class User(AbstractUser):
       role = models.CharField(
           max_length=20,
           choices=UserRole.choices(),
           default=UserRole.USER.value
       )
   ```

3. **Use custom exceptions**:
   ```python
   from project.exceptions import ValidationError

   @api_view(['POST'])
   def create_user(request):
       try:
           # Validation logic
           if not valid:
               raise ValidationError("Invalid data")
       except ValidationError as e:
           return Response(e.to_dict(), status=e.status_code)
   ```

## Environment Variables

All settings support environment variables. Create a `.env` file:

```env
# Security
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_NAME=energy_contracts
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_HOST=localhost
DATABASE_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# JWT
ACCESS_TOKEN_LIFETIME=15
REFRESH_TOKEN_LIFETIME=7
JWT_SECRET_KEY=your-jwt-secret

# Environment
ENVIRONMENT=development
```

## Testing

The test settings (`test.py`) are optimized for pytest:

```python
# In conftest.py or test files
from project.settings.test import test_settings

# Use test-specific settings
assert test_settings.debug is True
assert test_settings.database_name == 'test_energy_contracts'
```

## Best Practices

1. **Never hardcode sensitive values** - Use environment variables
2. **Use constants instead of magic strings** - Import from `constants.py`
3. **Type all settings** - Leverage Pydantic's type validation
4. **Validate early** - Let Pydantic catch configuration errors at startup
5. **Document new settings** - Add docstrings to all new settings fields
6. **Use computed fields** - For derived values that depend on other settings
7. **Environment-specific overrides** - Use appropriate settings file for each environment
