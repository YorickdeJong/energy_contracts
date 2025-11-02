# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack energy contracts management application with:
- **Frontend**: Next.js 16 with TypeScript, Next-Auth v5, Tailwind CSS 4
- **Backend**: Django 5.2.7 REST API with JWT authentication
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose for local development

## Code Standards (MUST FOLLOW)

### Backend Standards

**REQUIRED: Always use Pydantic for data validation and serialization**
- Use Pydantic models for all request/response schemas
- Validate incoming API data with Pydantic before processing
- Use `pydantic-settings` for configuration management
- Define clear Pydantic schemas in a `schemas.py` file in each Django app
- Example:
  ```python
  from pydantic import BaseModel, EmailStr, field_validator

  class UserCreateSchema(BaseModel):
      email: EmailStr
      password: str
      first_name: str
      last_name: str

      @field_validator('password')
      def validate_password(cls, v):
          if len(v) < 8:
              raise ValueError('Password must be at least 8 characters')
          return v
  ```

**REQUIRED: Always use pytest for testing**
- All tests MUST be written using pytest, not Django's default TestCase
- Use `pytest-django` for Django-specific testing features
- Use `factory-boy` for test data generation
- Use `pytest-cov` for code coverage reports
- Organize tests in `tests/` directory within each app:
  ```
  app_name/
  ├── tests/
  │   ├── __init__.py
  │   ├── test_models.py
  │   ├── test_views.py
  │   ├── test_serializers.py
  │   └── factories.py
  ```
- Run tests: `pytest` (local) or `docker-compose exec backend pytest` (Docker)
- Run with coverage: `pytest --cov=. --cov-report=html`
- Example test structure:
  ```python
  import pytest
  from django.contrib.auth import get_user_model

  User = get_user_model()

  @pytest.mark.django_db
  class TestUserModel:
      def test_create_user(self):
          user = User.objects.create_user(
              email='test@example.com',
              password='testpass123'
          )
          assert user.email == 'test@example.com'
          assert user.is_active is True
  ```

## Development Setup

### Quick Start (Docker - Recommended)
```bash
# Copy environment file and update with generated Django secret key
cp .env.example .env

# Start services (auto-runs migrations)
docker-compose up

# Create superuser (in separate terminal)
docker-compose exec backend python manage.py createsuperuser

# Start frontend (in separate terminal)
cd frontend && npm install && npm run dev
```

### Local Development (Without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
createdb energy_contracts
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Common Commands

### Backend (Django)

```bash
# Run development server
python manage.py runserver

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run tests (using pytest)
pytest
pytest --cov=. --cov-report=html  # with coverage
pytest -v -s  # verbose with print output
pytest tests/test_models.py  # run specific test file
pytest -k "test_user"  # run tests matching pattern

# Static files
python manage.py collectstatic

# Docker equivalents
docker-compose exec backend python manage.py [command]
docker-compose exec backend pytest  # run tests in Docker
```

### Frontend (Next.js)

```bash
# Development server
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

### Docker Commands

```bash
# Start services
docker-compose up

# Rebuild after dependency changes
docker-compose up --build

# View logs
docker-compose logs -f backend
docker-compose logs -f db

# Stop services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v

# Access PostgreSQL
docker-compose exec db psql -U postgres -d energy_contracts

# Run backend tests (using pytest)
docker-compose exec backend pytest
docker-compose exec backend pytest --cov=. --cov-report=html
```

## Architecture

### Backend Architecture

**Django Project Structure:**
- `config/` - Django project settings and root URL configuration
- `users/` - Custom user authentication app with email-based auth
- Uses PostgreSQL with custom User model (email as username)

**Key Backend Components:**

1. **Custom User Model** (`users/models.py`):
   - Email-based authentication (no username field)
   - Role-based access: admin, manager, user
   - Additional fields: phone_number, profile_picture, is_verified
   - Custom UserManager for user/superuser creation

2. **Authentication System**:
   - JWT tokens via `djangorestframework-simplejwt`
   - Token rotation enabled with blacklisting
   - Access token lifetime: 15 minutes (configurable)
   - Refresh token lifetime: 7 days (configurable)
   - Custom auth endpoints in `users/views/auth.py`

3. **API Configuration**:
   - REST Framework with JWT authentication
   - CORS enabled for frontend communication
   - drf-spectacular for API schema generation
   - Session authentication as fallback

4. **Static/Media Files**:
   - WhiteNoise for static file serving
   - Static files: `/static/` → `staticfiles/`
   - Media files: `/media/` → `media/`

### Frontend Architecture

**Next.js App Router Structure:**
- `app/` - App Router pages and layouts
  - `(auth)/` - Route group for authentication pages (login, register)
  - `api/auth/[...nextauth]/` - NextAuth.js API routes
  - `providers/` - React context providers
- `lib/` - Shared utilities and API client
- `types/` - TypeScript type definitions
- Root-level `auth.ts` - NextAuth.js configuration
- Root-level `middleware.ts` - Auth middleware for protected routes

**Key Frontend Components:**

1. **Authentication Flow**:
   - NextAuth.js v5 (beta) with Credentials provider
   - JWT strategy for session management
   - Custom authorize function calls Django backend
   - Stores access/refresh tokens in session
   - Middleware protects routes based on auth state

2. **API Client** (`lib/api.ts`):
   - Axios-based client with base URL configuration
   - `withCredentials: true` for cookie handling
   - Auth API methods: login, register, getCurrentUser, refreshToken, logout
   - Bearer token authentication for protected endpoints

3. **Type Safety**:
   - TypeScript with strict mode
   - Shared types in `types/auth.ts`
   - Matches Django backend User model structure

### Authentication Flow

1. User submits credentials via Next.js login form
2. NextAuth calls Django `/api/users/login/` endpoint
3. Django validates credentials, returns JWT tokens + user data
4. NextAuth stores tokens in JWT session
5. Frontend includes access token in Authorization header for API calls
6. Token refresh handled automatically when needed

### API Endpoints

Base URL: `http://localhost:8000/api/`

**Users App:**
- `POST /api/users/register/` - User registration
- `POST /api/users/login/` - User login (returns JWT tokens)
- `POST /api/users/refresh/` - Refresh access token
- `POST /api/users/logout/` - Logout (blacklist refresh token)
- `GET /api/users/me/` - Get current user (requires auth)

**Admin:**
- `/admin/` - Django admin panel

## Environment Variables

### Backend (.env)
```
SECRET_KEY=<django-secret-key>
DEBUG=True
DATABASE_NAME=energy_contracts
DATABASE_USER=postgres
DATABASE_PASSWORD=<your-password>
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
ACCESS_TOKEN_LIFETIME=15  # minutes
REFRESH_TOKEN_LIFETIME=7  # days
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=<nextauth-secret>
NEXTAUTH_URL=http://localhost:3000
```

See `SECRETS_MANAGEMENT.md` for production secrets handling with Azure Key Vault or AWS Secrets Manager.

## Database

- **Engine**: PostgreSQL 16 (postgres:16-alpine in Docker)
- **Custom User Model**: `users.User` (replaces default Django User)
- **Migrations**: Auto-run on Docker startup, manual for local dev
- **USERNAME_FIELD**: `email` (email-based authentication)

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

- **frontend.yml**: Linting, type checking, build on push to main/develop
- **backend.yml**: Linting, migrations check, tests with PostgreSQL service on push to main/develop

## Testing

**Backend (REQUIRED: Use pytest):**
- **MUST use pytest** for all backend testing (not Django's TestCase)
- Use `pytest-django` for Django integration
- Use `factory-boy` for test data factories
- Use `pytest-cov` for coverage reports
- Organize tests in `tests/` directories within each app
- Run: `pytest` (local) or `docker-compose exec backend pytest` (Docker)
- Coverage: `pytest --cov=. --cov-report=html`
- Configuration: Create `pytest.ini` or `pyproject.toml` for pytest settings

**Frontend:**
- No test framework configured yet

## Key Dependencies

**Backend:**
- Django 5.2.7
- djangorestframework 3.16.1
- djangorestframework-simplejwt 5.5.1 (JWT auth)
- django-cors-headers 4.9.0
- psycopg2-binary 2.9.11 (PostgreSQL adapter)
- gunicorn 23.0.0 (production WSGI server)
- whitenoise 6.8.2 (static files)
- drf-spectacular 0.28.0 (API docs)
- **pydantic 2.10.4** (data validation - REQUIRED)
- **pydantic-settings 2.7.1** (settings management - REQUIRED)
- **pytest 8.3.4** (testing framework - REQUIRED)
- **pytest-django 4.9.0** (Django pytest integration - REQUIRED)
- **pytest-cov 6.0.0** (code coverage - REQUIRED)
- **factory-boy 3.3.1** (test data factories - REQUIRED)

**Frontend:**
- next 16.0.1
- react 19.2.0
- next-auth 5.0.0-beta.30
- axios 1.13.1
- tailwindcss 4

## Common Development Patterns

### Using Pydantic for Data Validation (REQUIRED)

Always use Pydantic for request/response validation:

1. **Create schemas.py in each app:**
   ```python
   from pydantic import BaseModel, EmailStr, field_validator

   class UserCreateSchema(BaseModel):
       email: EmailStr
       password: str
       first_name: str
       last_name: str

       @field_validator('password')
       def validate_password(cls, v):
           if len(v) < 8:
               raise ValueError('Password must be at least 8 characters')
           return v

   class UserResponseSchema(BaseModel):
       id: int
       email: str
       first_name: str
       last_name: str

       class Config:
           from_attributes = True  # For ORM models
   ```

2. **Use in views:**
   ```python
   from rest_framework.decorators import api_view
   from rest_framework.response import Response
   from pydantic import ValidationError
   from .schemas import UserCreateSchema

   @api_view(['POST'])
   def create_user(request):
       try:
           # Validate incoming data
           user_data = UserCreateSchema(**request.data)
           # Use validated data
           user = User.objects.create_user(
               email=user_data.email,
               password=user_data.password,
               first_name=user_data.first_name,
               last_name=user_data.last_name
           )
           return Response({'id': user.id}, status=201)
       except ValidationError as e:
           return Response({'errors': e.errors()}, status=400)
   ```

### Writing Tests with pytest (REQUIRED)

All tests must use pytest:

1. **Create test structure:**
   ```
   app_name/
   ├── tests/
   │   ├── __init__.py
   │   ├── conftest.py  # pytest fixtures
   │   ├── factories.py  # factory-boy factories
   │   ├── test_models.py
   │   ├── test_views.py
   │   └── test_schemas.py
   ```

2. **Create factories:**
   ```python
   # tests/factories.py
   import factory
   from django.contrib.auth import get_user_model

   User = get_user_model()

   class UserFactory(factory.django.DjangoModelFactory):
       class Meta:
           model = User

       email = factory.Sequence(lambda n: f'user{n}@example.com')
       first_name = factory.Faker('first_name')
       last_name = factory.Faker('last_name')
   ```

3. **Write tests:**
   ```python
   # tests/test_models.py
   import pytest
   from .factories import UserFactory

   @pytest.mark.django_db
   class TestUserModel:
       def test_create_user(self):
           user = UserFactory(email='test@example.com')
           assert user.email == 'test@example.com'
           assert user.is_active is True

       def test_user_str(self):
           user = UserFactory()
           assert str(user) == user.email
   ```

### Adding a New Django App
```bash
cd backend
python manage.py startapp app_name
# Add 'app_name' to INSTALLED_APPS in config/settings.py
# Add app URLs to config/urls.py
```

### Creating Database Migrations
```bash
# After modifying models
python manage.py makemigrations
python manage.py migrate

# Docker
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Adding Protected API Endpoints
1. Create view in Django app with `permission_classes = [IsAuthenticated]`
2. Add URL pattern to app's `urls.py`
3. Frontend: Include `Authorization: Bearer ${accessToken}` header
4. Use `api.get()` with auth header or add to axios instance interceptor

### Adding New Frontend Pages
1. Create file in `app/` directory following App Router conventions
2. Use Next.js 15+ server/client components appropriately
3. Protect routes by adding checks in `middleware.ts`
4. Access session via `auth()` (server) or `useSession()` (client)

## Deployment Notes

- Frontend runs on port 3000
- Backend runs on port 8000
- Database runs on port 5432
- Docker setup includes health checks for PostgreSQL
- Gunicorn configured with 3 workers in production mode
- Static files served via WhiteNoise (no separate web server needed)
