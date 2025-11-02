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

- Node.js 20.x or higher
- Python 3.12 or higher
- PostgreSQL 14 or higher

## Getting Started

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

## CI/CD

The project uses GitHub Actions for continuous integration:

- **Frontend CI**: Runs linting, type checking, and builds on push to `main` or `develop`
- **Backend CI**: Runs linting, migrations, and tests with PostgreSQL on push to `main` or `develop`

## License

Private
