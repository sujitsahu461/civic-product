# CivicSetu — Production Deployment Guide

## 1. Production Architecture

In a production environment, CivicSetu is recommended to run behind a reverse proxy (e.g., NGINX, Cloudflare) with Gunicorn as the WSGI application server, MySQL 8.0 for relational persistence, and WhiteNoise for static asset serving.

```
[ Internet ] ──HTTPS──> [ NGINX Reverse Proxy ]
                              │
                ┌─────────────┴─────────────┐
                │                           │
          /static/, /media/               /api/, /
                │                           │
         [ Static/Media Files ]     [ Gunicorn WSGI ]
                                            │
                                    [ Django Backend ]
                                            │
                                    [ MySQL 8.0 DB ]
```

---

## 2. Environment Configuration

Create a production `.env` file on your server:

```ini
DJANGO_ENV=production
DJANGO_SETTINGS_MODULE=config.settings.prod
SECRET_KEY=generate-a-strong-random-50-character-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com

DB_NAME=civicsetu_prod
DB_USER=civicsetu_app
DB_PASSWORD=strong_database_password
DB_HOST=127.0.0.1
DB_PORT=3306

CSRF_TRUSTED_ORIGINS=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

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

---

## 3. Build & Static Collection

1. Build the React frontend:
   ```bash
   cd frontend
   npm ci
   npm run deploy
   cd ..
   ```

2. Collect static files for WhiteNoise/NGINX:
   ```bash
   python manage.py collectstatic --noinput
   ```

3. Run database migrations:
   ```bash
   python manage.py migrate
   ```

---

## 4. Running with Gunicorn

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
