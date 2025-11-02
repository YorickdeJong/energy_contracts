# Integration Guide

This guide shows how to integrate the `project/` folder with your existing Django configuration.

## Step 1: Update Django Settings

Replace hardcoded settings in `config/settings.py` with Pydantic settings:

### Before:
```python
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-...')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
```

### After:
```python
from project.settings import settings

SECRET_KEY = settings.secret_key
DEBUG = settings.debug
ALLOWED_HOSTS = settings.allowed_hosts_list
```

## Step 2: Update Database Configuration

### Before:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DATABASE_NAME', 'energy_contracts'),
        'USER': os.getenv('DATABASE_USER', 'postgres'),
        'PASSWORD': os.getenv('DATABASE_PASSWORD', 'postgres'),
        'HOST': os.getenv('DATABASE_HOST', 'localhost'),
        'PORT': os.getenv('DATABASE_PORT', '5432'),
    }
}
```

### After:
```python
DATABASES = settings.get_database_config()
```

## Step 3: Update JWT Configuration

### Before:
```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('ACCESS_TOKEN_LIFETIME', '15'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('REFRESH_TOKEN_LIFETIME', '7'))),
    # ... rest of config
}
```

### After:
```python
SIMPLE_JWT = settings.get_simple_jwt_config()
```

## Step 4: Update CORS Configuration

### Before:
```python
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True
```

### After:
```python
CORS_ALLOWED_ORIGINS = settings.cors_allowed_origins_list
CORS_ALLOW_CREDENTIALS = settings.cors_allow_credentials
```

## Step 5: Update Static/Media Files

### Before:
```python
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### After:
```python
STATIC_URL = settings.static_url
STATIC_ROOT = settings.static_root
MEDIA_URL = settings.media_url
MEDIA_ROOT = settings.media_root
```

## Complete Example

Here's what a minimal `config/settings.py` looks like after integration:

```python
"""
Django settings using Pydantic-based configuration.
"""
from pathlib import Path
from project.settings import settings

# Build paths (kept for compatibility)
BASE_DIR = settings.base_dir

# Security
SECRET_KEY = settings.secret_key
DEBUG = settings.debug
ALLOWED_HOSTS = settings.allowed_hosts_list

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'users',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = settings.get_database_config()

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = settings.static_url
STATIC_ROOT = settings.static_root
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = settings.media_url
MEDIA_ROOT = settings.media_root

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# CORS settings
CORS_ALLOWED_ORIGINS = settings.cors_allowed_origins_list
CORS_ALLOW_CREDENTIALS = settings.cors_allow_credentials

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Simple JWT settings
SIMPLE_JWT = settings.get_simple_jwt_config()
```

## Using Constants in Models

Update your models to use constants from `project/constants.py`:

### Before:
```python
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('user', 'User'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
```

### After:
```python
from project.constants import UserRole

class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices(),
        default=UserRole.USER.value
    )
```

## Using Custom Exceptions in Views

Replace generic exceptions with custom ones:

### Before:
```python
from rest_framework.exceptions import ValidationError, NotFound

@api_view(['GET'])
def get_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        raise NotFound("User not found")
    return Response({"id": user.id})
```

### After:
```python
from project.exceptions import NotFoundError

@api_view(['GET'])
def get_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        raise NotFoundError("User not found")
    return Response({"id": user.id})
```

## Environment-Specific Settings

For different environments, you can conditionally load settings:

```python
import os
from project.settings.development import dev_settings
from project.settings.production import prod_settings
from project.settings.test import test_settings

ENVIRONMENT = os.getenv('ENVIRONMENT', 'development').lower()

if ENVIRONMENT == 'production':
    app_settings = prod_settings
elif ENVIRONMENT == 'test':
    app_settings = test_settings
else:
    app_settings = dev_settings

# Then use app_settings instead of settings
SECRET_KEY = app_settings.secret_key
DEBUG = app_settings.debug
```

## Testing the Integration

After updating your settings, test that everything works:

```bash
# Check for configuration errors
python manage.py check

# Test database connection
python manage.py showmigrations

# Run the development server
python manage.py runserver

# Run tests
pytest
```

## Troubleshooting

### Import Errors

If you get import errors, ensure the `backend` directory is in your Python path:

```bash
export PYTHONPATH=/path/to/backend:$PYTHONPATH
```

Or in `pytest.ini`:
```ini
[pytest]
pythonpath = .
```

### Missing Environment Variables

Pydantic will use default values for missing variables. To require certain variables:

```python
# In project/settings/production.py
class ProductionSettings(Settings):
    secret_key: str  # No default - must be set in production
    database_password: str  # No default - must be set
```

### Validation Errors

If Pydantic raises validation errors on startup, check your `.env` file:

```bash
# View current settings (for debugging)
python manage.py shell
>>> from project.settings import settings
>>> print(settings.model_dump())
```

## Next Steps

1. **Gradually migrate** - Start with critical settings (SECRET_KEY, DATABASE, etc.)
2. **Test thoroughly** - Run your test suite after each change
3. **Update documentation** - Document any custom settings you add
4. **Add new features** - Use the patterns established in `project/` for new functionality
