# CivicSetu — Local Setup and Installation Guide

## 1. System Requirements

- **Python**: 3.12+
- **Node.js**: 18.x or 20.x+ (npm 9.x+)
- **MySQL Server**: 8.0+
- **Git**: 2.30+

---

## 2. Step-by-Step Installation

### Step 2.1: Clone the Repository
```bash
git clone https://github.com/sujitsahu461/-CivicSetu-AI-Powered-Civic-Engagement-Platform.git
cd -CivicSetu-AI-Powered-Civic-Engagement-Platform
```

### Step 2.2: Backend Python Environment Setup
1. Create and activate a Python virtual environment:
   ```bash
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
1. Copy the sample environment file:
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

   DB_NAME=civicsetu
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=127.0.0.1
   DB_PORT=3306

   CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
   ```

### Step 2.4: Database Initialization
1. Ensure MySQL server is running and create the database:
   ```sql
   CREATE DATABASE civicsetu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Run migrations to provision tables:
   ```bash
   python manage.py migrate
   ```

3. (Optional) Create a superuser for administrative access:
   ```bash
   python manage.py createsuperuser
   ```

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

---

## 3. Running Development Servers

### Option A: Integrated Mode (Django serves API + Built React SPA)
```bash
python manage.py runserver 127.0.0.1:8000
```
- Web Application: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Swagger Documentation: [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- Admin Panel: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

### Option B: Concurrent Development (Vite HMR + Django Backend)
1. Terminal 1 (Backend):
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```
2. Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```
- React Hot-Reloading UI: [http://localhost:5173/](http://localhost:5173/)
- Calls to `/api` and `/media` are automatically proxied to port 8000.

---

## 4. Running Verification Checks & Tests
```bash
# Verify system configuration
python manage.py check

# Run automated test suite
python manage.py test

# Verify frontend code quality
cd frontend
npm run lint
npm run build
```
