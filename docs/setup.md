# CivicSetu — Local Setup and Installation Guide

## 1. System Requirements

<<<<<<< HEAD
- **Python**: 3.12+ (tested with Python 3.14.3 and Django 6.0.5)
=======
- **Python**: 3.12+ (tested with Python 3.14.6 and Django 6.0.10)
>>>>>>> 4d28cea (Updated CivicSetu project)
- **Node.js**: 18.x or 20.x+ (npm 9.x+)
- **PostgreSQL**: 16+ or 18.x (tested on PostgreSQL 18.0 / 18.6)
- **Git**: 2.30+

---

## 2. Step-by-Step Installation

### Step 2.1: Clone the Repository
```bash
git clone https://github.com/sujitsahu461/civic-product.git
cd civic-product
```

### Step 2.2: Backend Python Environment Setup
<<<<<<< HEAD
1. Create and activate a Python virtual environment:
   ```bash
=======
All backend commands run inside `backend/`, the Django API shared by the website and the mobile app.

1. Create and activate a Python virtual environment:
   ```bash
   cd backend

>>>>>>> 4d28cea (Updated CivicSetu project)
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Step 2.3: Environment Configuration
<<<<<<< HEAD
1. Copy the sample environment file:
=======
1. Copy the sample environment file (inside `backend/`):
>>>>>>> 4d28cea (Updated CivicSetu project)
   ```bash
   cp .env.example .env
   ```

2. Configure your `.env` variables:
   ```ini
   DJANGO_ENV=development
   DJANGO_SETTINGS_MODULE=config.settings.dev
   SECRET_KEY=your-secure-development-secret-key
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1

   DB_ENGINE=django.db.backends.postgresql
   DB_NAME=civicsetu_db
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_HOST=127.0.0.1
   DB_PORT=5432

   CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   ```

### Step 2.4: Database Initialization
1. Ensure PostgreSQL server is running and create the database:
   ```sql
   CREATE DATABASE civicsetu_db WITH ENCODING 'UTF8';
   ```

2. Run migrations to provision tables:
   ```bash
   python manage.py migrate
   ```

3. (Optional) Create a superuser for administrative access:
   ```bash
   python manage.py createsuperuser
   ```

<<<<<<< HEAD
### Step 2.5: Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```

2. To build the production bundle and copy assets into Django static/templates:
   ```bash
   npm run deploy
   cd ..
   ```

=======
### Step 2.5: Website Setup
1. Navigate to the `frontend/web/` directory (from the repository root):
   ```bash
   cd frontend/web
   npm ci
   ```

2. To build the production bundle and copy assets into `backend/static` and `backend/templates`:
   ```bash
   npm run deploy
   cd ../..
   ```

### Step 2.6: Mobile App Setup (optional)
See `frontend/mobile/README.md`. It uses the same backend: `cd frontend/mobile && npm ci && npm run web`.

>>>>>>> 4d28cea (Updated CivicSetu project)
---

## 3. Running Development Servers

### Option A: Integrated Mode (Django serves API + Built React SPA)
```bash
<<<<<<< HEAD
=======
cd backend
>>>>>>> 4d28cea (Updated CivicSetu project)
python manage.py runserver 127.0.0.1:8000
```
- Web Application: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Swagger Documentation: [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- Admin Panel: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

### Option B: Concurrent Development (Vite HMR + Django Backend)
1. Terminal 1 (Backend):
   ```bash
<<<<<<< HEAD
   python manage.py runserver 127.0.0.1:8000
   ```
2. Terminal 2 (Frontend):
   ```bash
   cd frontend
=======
   cd backend
   python manage.py runserver 127.0.0.1:8000
   ```
2. Terminal 2 (Website):
   ```bash
   cd frontend/web
>>>>>>> 4d28cea (Updated CivicSetu project)
   npm run dev
   ```
- React Hot-Reloading UI: [http://localhost:5173/](http://localhost:5173/)
- Calls to `/api` and `/media` are automatically proxied to port 8000.

---

## 4. Running Verification Checks & Tests
```bash
# Verify system configuration
<<<<<<< HEAD
=======
cd backend
>>>>>>> 4d28cea (Updated CivicSetu project)
python manage.py check

# Run automated test suite
python manage.py test

<<<<<<< HEAD
# Verify frontend code quality
cd frontend
npm run lint
npm run build
=======
# Verify website code quality
cd ../frontend/web
npm run lint
npm run typecheck
npm run build

# Verify the mobile app
cd ../mobile
npm run typecheck
npm test
>>>>>>> 4d28cea (Updated CivicSetu project)
```
