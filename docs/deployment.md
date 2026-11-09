# CivicSetu — Production Deployment Guide

## 1. Production Architecture

In a production environment, CivicSetu runs with a decoupled or unified architecture: a React 19 SPA (deployable to Vercel or served via Django) and a Django REST Framework backend API with PostgreSQL 18 for ACID relational persistence, Gunicorn WSGI, and WhiteNoise for static asset serving.

```
[ Internet ] ──HTTPS──> [ Vercel / NGINX ]
                               │
                ┌─────────────┴─────────────┐
                │                           │
          [ Vercel CDN ]              [ API Backend ]
       (React Vite SPA)               [ Gunicorn WSGI ]
                │                           │
                └───────────┬───────────────┘
                            ▼
                    [ Django Backend ]
                            │
                  [ PostgreSQL 18 DB ]
```

---

## 2. Environment Configuration

<<<<<<< HEAD
### Backend Environment (`.env`):
Create a production `.env` file on your backend server:
=======
### Backend Environment (`backend/.env`):
Create a production `.env` file in the `backend/` folder on your server:
>>>>>>> 4d28cea (Updated CivicSetu project)

```ini
DJANGO_ENV=production
DJANGO_SETTINGS_MODULE=config.settings.prod
SECRET_KEY=generate-a-strong-random-50-character-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com

DB_ENGINE=django.db.backends.postgresql
DB_NAME=civicsetu_prod
DB_USER=civicsetu_app
DB_PASSWORD=strong_database_password
DB_HOST=127.0.0.1
DB_PORT=5432
DB_CONN_MAX_AGE=60
DB_SSLMODE=prefer

CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://your-frontend.vercel.app
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://your-frontend.vercel.app

STATIC_ROOT=/var/www/civicsetu/staticfiles
MEDIA_ROOT=/var/www/civicsetu/media

# SMTP Mail Server for Production
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your_sendgrid_api_key
DEFAULT_FROM_EMAIL=CivicSetu Redressal <noreply@yourdomain.com>
```

### Frontend Environment (Vercel):
Configure only the public backend API base URL in your Vercel project environment variables. **Never expose database credentials in the frontend.**

```ini
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

---

## 3. Build & Static Collection

<<<<<<< HEAD
1. Build the React frontend:
   ```bash
   cd frontend
   npm ci
   npm run deploy
   cd ..
   ```

2. Collect static files for WhiteNoise/NGINX:
=======
1. Build the React website (writes into `backend/static/react` and `backend/templates`):
   ```bash
   cd frontend/web
   npm ci
   npm run deploy
   cd ../../backend
   ```

2. Collect static files for WhiteNoise/NGINX (inside `backend/`):
>>>>>>> 4d28cea (Updated CivicSetu project)
   ```bash
   python manage.py collectstatic --noinput
   ```

3. Run database migrations:
   ```bash
   python manage.py migrate
   ```

---

## 4. Running with Gunicorn

<<<<<<< HEAD
=======
Run from `backend/` (or add `--chdir backend` when starting from the repository root):

>>>>>>> 4d28cea (Updated CivicSetu project)
```bash
gunicorn config.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 4 \
  --timeout 120 \
  --access-logfile /var/log/civicsetu/gunicorn_access.log \
  --error-logfile /var/log/civicsetu/gunicorn_error.log
```

---

## 5. NGINX Sample Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location /static/ {
        alias /var/www/civicsetu/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /media/ {
        alias /var/www/civicsetu/media/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
