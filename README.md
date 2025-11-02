# Energy Contracts

A full-stack application for managing energy contracts, built with Next.js and Django.

## Project Structure

```
energy_contracts/
├── frontend/          # Next.js frontend application
├── backend/           # Django REST API backend
└── .github/workflows/ # CI/CD workflows
```

## Prerequisites

### Option 1: Docker (Recommended)
- Docker 20.10 or higher
- Docker Compose 2.0 or higher

### Option 2: Local Development
- Node.js 20.x or higher
- Python 3.12 or higher
- PostgreSQL 14 or higher

## Getting Started

### Quick Start with Docker (Recommended)

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Generate a Django secret key:
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

3. Update `.env` with your generated secret key.

4. Start all services:
```bash
docker-compose up
```

The backend will be available at `http://localhost:8000` and will automatically run migrations on startup.

5. Create a Django superuser (in a new terminal):
```bash
docker-compose exec backend python manage.py createsuperuser
```

6. In a separate terminal, start the frontend:
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

To stop the services:
```bash
docker-compose down
```

To stop and remove all data (including the database):
```bash
docker-compose down -v
```

### Local Development Setup (Without Docker)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

5. Update the `.env` file with your local database credentials.

6. Create the database:
```bash
createdb energy_contracts
```

7. Run migrations:
```bash
python manage.py migrate
```

8. Create a superuser:
```bash
python manage.py createsuperuser
```

9. Start the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Development

### Backend

- Admin panel: `http://localhost:8000/admin`
- API endpoints: `http://localhost:8000/api/`

### Frontend

- Main application: `http://localhost:3000`

## Docker Commands

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f backend

# Rebuild containers after dependency changes
docker-compose up --build

# Run Django management commands
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Access PostgreSQL
docker-compose exec db psql -U postgres -d energy_contracts

# Run tests
docker-compose exec backend python manage.py test
```

## CI/CD

The project uses GitHub Actions for continuous integration:

- **Frontend CI**: Runs linting, type checking, and builds on push to `main` or `develop`
- **Backend CI**: Runs linting, migrations, and tests with PostgreSQL on push to `main` or `develop`

## Secrets Management

See [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) for detailed information about:
- Managing secrets in different environments
- Using GitHub Actions secrets
- Configuring Azure Key Vault for production
- Security best practices

## License

Private
