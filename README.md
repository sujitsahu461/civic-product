# CivicSetu — Civic Engagement & Grievance Redressal Platform

![CivicSetu Logo](CivicSetu%20Civic%20Tech%20Logo.png)

CivicSetu connects citizens with their urban local body (municipality). Citizens report civic problems (potholes, water leaks, broken streetlights, garbage, drainage), follow progress with a tracking code, and rate the outcome. Officers work department-scoped queues and must record a resolution note and proof to close a case. Super admins manage users, departments and audit logs.

The platform is **rule-based and deterministic**. It contains no machine-learning models and no AI services: category and priority come from the citizen's selection and a fixed set of safety keywords (section 7).

---

## Table of contents

1. [What is in this repository](#1-what-is-in-this-repository)
2. [Features](#2-features)
3. [Architecture today](#3-architecture-today)
4. [Technology stack](#4-technology-stack)
5. [Roles and permissions](#5-roles-and-permissions)
6. [Complaint lifecycle](#6-complaint-lifecycle)
7. [Categories, priority and routing rules](#7-categories-priority-and-routing-rules)
8. [Database](#8-database)
9. [Project structure](#9-project-structure)
10. [Setup and running](#10-setup-and-running)
11. [Environment variables](#11-environment-variables)
12. [Running tests](#12-running-tests)
13. [API reference](#13-api-reference)
14. [Website (frontend)](#14-website-frontend)
15. [CIVIC web and mobile app](#15-civic-web-and-mobile-app)
16. [Security](#16-security)
17. [Target architecture and Azure deployment](#17-target-architecture-and-azure-deployment)
18. [Migration progress](#18-migration-progress)
19. [Documentation index](#19-documentation-index)
20. [Known limitations](#20-known-limitations)
21. [Removal of the AI/ML engine](#21-removal-of-the-aiml-engine)
22. [Team and license](#22-team-and-license)

---

## 1. What is in this repository

| Path | What it is |
| :--- | :--- |
| `apps/`, `config/`, `manage.py` | Django REST backend (a modular monolith of 11 apps) |
| `frontend/` | The CivicSetu website: React 19 + TypeScript + Vite single-page app for citizens, officers and super admins |
| `static/react/`, `templates/index.html` | The built website bundle that Django serves on the same origin |
| `civic-app/` | The CIVIC citizen app: a web/PWA prototype (`dist/`, `server.js`) and an Expo (React Native) mobile app (`mobile/`). See section 15 |
| `docs/` | Technical documentation, the Azure migration audit (`architecture-audit.html`) and reports |
| `schema.yml` | Exported OpenAPI 3 schema of the backend |
| `seed_civic_data.py` | Creates demonstration departments, users and complaints |
| `requirements.in`, `requirements.txt` | Python dependencies (`.in` is what you edit, `.txt` is the pinned, compiled list) |

---

## 2. Features

**Citizens**
- File a complaint with title, description, category, priority, address and map location, without signing in (guest) or signed in.
- Attach evidence: photos (JPEG, PNG, WebP up to 5 MB), a voice note (up to 10 MB) and a video (up to 25 MB).
- Track any complaint by its code (`CMP-YYYYMMDD-XXXX`) without logging in; see the status timeline.
- Dashboard of own complaints, notifications, profile, and a 1–5 star rating with comments once a complaint is resolved or closed.
- Interface in **English, Hindi and Odia**.
- Incident map (OpenStreetMap tiles via Leaflet) and a location picker with address lookup.

**Officers (authority)**
- Dashboard and queue limited to the complaints of their own departments (plus complaints assigned to them).
- Move a complaint through the workflow, set priority, add resolution notes and upload a resolution image.
- A resolution note is required to resolve a complaint and a reason is required to reject one.
- Department analytics: status, category and priority breakdowns, average resolution time, citizen ratings.
- In-app notifications for new complaints and assignments.

**Super admins**
- Create, edit, suspend users; create officer and admin accounts (public sign-up only creates citizens).
- Create, update and deactivate departments; assign and remove officers.
- System-wide complaints, analytics and an immutable audit log (sign-ins, failed sign-ins, complaint actions, profile and department changes).

**Platform**
- JWT sign-in with refresh-token rotation and revocation on sign-out.
- Server-signed arithmetic captcha on sign-in.
- Rate limiting, Content-Security-Policy, role and department scoping on every endpoint.
- OpenAPI schema and Swagger UI at `/api/docs/`.

---

## 3. Architecture today

```
 Browser (React SPA)  ─────────────►  Django + Django REST Framework  ───►  PostgreSQL
 CIVIC mobile / web app ───────────►  (JWT, role scoping, audit)       ───►  media/ (local disk)
                                           │
                                           └──►  SMTP (password-reset email)
```

- One Django process serves the REST API under `/api/v1/`, the admin site under `/admin/`, and the built React website (catch-all route to `templates/index.html`, assets through WhiteNoise).
- Business rules sit in service classes (`apps/<app>/services.py`); views are thin. Which complaints a user may see or change is decided in one module, `apps/complaints/scoping.py`.
- Uploads are saved to the local `media/` folder. Notifications and email are sent inside the request. These two points are the main reasons the app cannot yet run on several servers; the Azure plan in section 17 addresses them.

---

## 4. Technology stack

| Layer | Technology |
| :--- | :--- |
| Backend | Django 6.0.5, Django REST Framework 3.17.1 |
| Authentication | djangorestframework-simplejwt 5.5.1 (token blacklist app enabled) |
| Database | PostgreSQL (driver `psycopg2-binary`); SQLite is supported for tests and quick starts |
| API docs | drf-spectacular 0.30.0 (OpenAPI 3, Swagger UI) |
| Other backend libraries | django-cors-headers, django-environ, Pillow (image validation), WhiteNoise (static files), Gunicorn (server), reportlab (only for the PDF report generator scripts) |
| Website | React 19, TypeScript and JSX, Vite 8, Zustand (state), axios, react-router-dom 7, i18next / react-i18next, Leaflet and react-leaflet, Font Awesome |
| CIVIC web app | React 19, Vite, Tailwind CSS 4, PWA service worker, Express `server.js` |
| CIVIC mobile app | Expo SDK 54, React Native 0.81, React Navigation, SecureStore, SQLite (drafts), NetInfo, camera, location |
| Planned cloud | Microsoft Azure (Container Apps, Azure Database for PostgreSQL, Service Bus, Blob Storage, Front Door); see section 17 |

---

## 5. Roles and permissions

| Role | Can |
| :--- | :--- |
| `CITIZEN` | File complaints, see and follow own complaints, rate resolved ones, manage own profile |
| `AUTHORITY` | See and act on complaints in the categories of their departments and on complaints assigned to them; analytics for those; notifications; search users |
| `SUPER_ADMIN` | Everything, including users, departments, audit logs and all complaints |
| Guest (not signed in) | File a complaint, track by code, read the public timeline (names are masked) |

Access to a complaint is decided by `apps/complaints/scoping.py`:
- Super admin: all complaints.
- Authority: complaints whose category belongs to one of their departments (through `department_authorities`), plus complaints assigned to them. An officer with no department sees only assigned complaints.
- Citizen: own complaints.
- Anyone else: none.

Only a super admin can change roles. Changing a user's role also resets the Django `is_staff` and `is_superuser` flags to match, so a demoted admin loses admin rights.

---

## 6. Complaint lifecycle

Statuses: `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`, `CLOSED`.

| From | Allowed next statuses |
| :--- | :--- |
| `PENDING` | `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED` |
| `ASSIGNED` | `IN_PROGRESS`, `RESOLVED`, `REJECTED`, `PENDING` |
| `IN_PROGRESS` | `ASSIGNED`, `RESOLVED`, `REJECTED`, `PENDING`, `CLOSED` |
| `RESOLVED` | `CLOSED` |
| `REJECTED` | `CLOSED`, `IN_PROGRESS`, `PENDING` |
| `CLOSED` | `IN_PROGRESS`, `RESOLVED` |

- Resolving requires resolution notes (new or already saved). Rejecting requires a reason.
- Every change writes a `complaint_history` row (actor, old and new status, remarks) and an audit-log entry.
- Assigning an authority to a `PENDING` complaint moves it to `IN_PROGRESS`.
- Citizens rate a complaint once; only the owner can.

---

## 7. Categories, priority and routing rules

**Categories** (`ComplaintCategory`): `ROAD`, `WATER`, `ELECTRICITY`, `GARBAGE`, `DRAINAGE`, `SANITATION`, `STREET_LIGHT`, `PARKS`, `NOISE`, `OTHER`.

**Choosing the category.** The citizen's selection wins. If none is given (or it is `AUTO`), the backend scores the title and description against keyword lists:

| Category | Example keywords |
| :--- | :--- |
| `DRAINAGE` | drain, sewage, gutter, manhole, sewer, waterlog, clog |
| `SANITATION` | garbage, trash, rubbish, dump, bin, litter |
| `ELECTRICITY` | electric, wire, pole, spark, transformer, voltage, blackout |
| `WATER` | pipeline, tap, drinking water, water tanker, pipe leak, low pressure |
| `ROAD` | pothole, asphalt, crater, road, footpath, pavement (also the default if nothing matches) |

**Priority** (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). The citizen's choice wins. Otherwise: emergency words (fire, live wire, sparking, burst pipe, flooding, gas leak, danger…) give `URGENT`; hazard words (contamination, sewage overflow, deep pothole, broken pole, sinkhole…) give `HIGH`; minor words (cosmetic, minor litter…) give `LOW`; everything else is `MEDIUM`.

**Routing to officers.** A complaint reaches the officers of departments whose name matches the category (for example a department with "Water" in its name covers `WATER`). If no department matches, super admins are notified so the complaint is not missed. The mapping lives in `apps/complaints/scoping.py` (`DEPARTMENT_CATEGORY_RULES`).

---

## 8. Database

- **Engine:** PostgreSQL by default (`DB_ENGINE=django.db.backends.postgresql`). Set `DB_ENGINE=django.db.backends.sqlite3` for a quick local start. Production target is Azure Database for PostgreSQL.
- **Tables** (table names set in the models): `users`, `departments`, `department_authorities`, `complaints`, `complaint_images`, `complaint_attachments`, `complaint_history`, `feedback`, `notifications`, `audit_logs`, plus the token-blacklist and Django framework tables.
- Every model has an internal integer `id` and a public `public_id` UUID; the API only exposes the UUID.
- **Migrations:** `python manage.py migrate`. `python manage.py makemigrations --check` should report no changes.
- **Backups:** take a `pg_dump` before any migration on real data. The plan for Azure (automatic backups with point-in-time restore) is in section 17.

---

## 9. Project structure

```
.
├── apps/
│   ├── accounts/            sign-in, register, JWT, captcha, password reset (User model)
│   ├── users/               profiles, user administration and search
│   ├── departments/         departments and officer assignments
│   ├── complaints/          complaint model, workflow service, scoping rules, tracking
│   ├── complaint_images/    image / audio / video attachments
│   ├── complaint_history/   timeline of every change
│   ├── authority/           officer dashboard, queue, analytics, notifications
│   ├── feedback/            ratings after resolution
│   ├── notifications/       in-app notifications
│   ├── audit_logs/          audit trail
│   └── core/                shared base
├── config/
│   ├── settings/            base.py, dev.py, prod.py, test.py, test_postgres.py
│   ├── urls.py              API routes, Swagger, React catch-all
│   └── wsgi.py / asgi.py
├── frontend/                React website source (src/pages, components, layouts, services, store, i18n)
├── static/, templates/      built website served by Django
├── civic-app/               CIVIC web/PWA and Expo mobile app
├── docs/                    documentation (section 19)
├── schema.yml               OpenAPI schema
├── seed_civic_data.py       demo data
├── requirements.in / .txt   dependencies
└── manage.py
```

---

## 10. Setup and running

**Prerequisites:** Python 3.12+, Node.js 20+, PostgreSQL 16+ (or use SQLite), Git.

### Backend

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate        Linux/macOS:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit SECRET_KEY and the DB_* values
```

Create the database (PostgreSQL):

```sql
CREATE DATABASE civicsetu_db;
```

```bash
python manage.py migrate
python manage.py createsuperuser        # optional
python seed_civic_data.py               # optional demo data
python manage.py runserver 127.0.0.1:8000
```

- Website (served by Django): http://127.0.0.1:8000/
- Swagger UI: http://127.0.0.1:8000/api/docs/
- Admin site: http://127.0.0.1:8000/admin/

### Website (frontend)

```bash
cd frontend
npm ci
npm run dev          # Vite dev server on http://127.0.0.1:5173, proxies /api and /media to port 8000
npm run deploy       # production build, copies into ../static/react and ../templates/index.html
```

Run `npm run deploy` after changing the frontend, so the Django-served copy is current. For production, run `python manage.py collectstatic --noinput`.

### Production server

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
```

Use `DJANGO_SETTINGS_MODULE=config.settings.prod` (HTTPS redirect, secure cookies, HSTS, `X-Frame-Options: DENY`). See `docs/deployment.md`.

---

## 11. Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Meaning | Example / default |
| :--- | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | Settings module | `config.settings.dev`, `config.settings.prod` |
| `SECRET_KEY` | Django secret key (required) | long random string |
| `DEBUG` | Debug mode | `False` in production |
| `ALLOWED_HOSTS` | Allowed host names | `localhost,127.0.0.1` |
| `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` | Allowed web origins | `http://localhost:5173` |
| `DB_ENGINE` | Database engine | `django.db.backends.postgresql` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Database connection | `civicsetu_db`, `postgres`, …, `127.0.0.1`, `5432` |
| `DB_CONN_MAX_AGE` | Persistent connection seconds | `0` (set `60` in production) |
| `DB_SSLMODE` | PostgreSQL SSL mode | `require` / `verify-full` in production |
| `TEST_DB_NAME` | Test database for `test_postgres` settings | `civicsetu_test_db` |
| `JWT_ACCESS_TOKEN_MINUTES`, `JWT_REFRESH_TOKEN_DAYS` | Token lifetimes | `15`, `7` |
| `MEDIA_URL`, `MEDIA_ROOT`, `STATIC_URL`, `STATIC_ROOT` | File locations | `/media/`, `media`, `/static/`, `staticfiles` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `CSP_REPORT_ONLY` | `True` sends the Content-Security-Policy as report-only | `False` |
| `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`, `EMAIL_TIMEOUT` | Email for password reset | Gmail SMTP with an app password in the example file |
| `FRONTEND_URL` | Base URL used in reset-password links | `http://localhost:5173` |
| `REVIEW_PHASE` | Legacy academic-review toggle; no effect on the backend | `2` |

The CIVIC mobile app uses `EXPO_PUBLIC_CIVICSETU_API_URL`, `EXPO_PUBLIC_CIVICSETU_WEB_URL` and `EXPO_PUBLIC_CIVICSETU_APP_MODE` (`website` or `native`) in `civic-app/mobile/.env`.

---

## 12. Running tests

```bash
python manage.py test        # 199 tests, in-memory SQLite (config.settings.test)
python manage.py makemigrations --check --dry-run
```

To run against a real PostgreSQL test database (it refuses to use the application database name):

```bash
python manage.py test --settings=config.settings.test_postgres
```

Coverage: authentication and captcha, password reset, role permissions, complaint workflow and transitions, department scoping, attachments, authority dashboards and analytics, feedback, notifications, audit logs, user administration.

---

## 13. API reference

Base path `/api/v1/`. Interactive documentation: `/api/docs/`; raw schema: `/api/schema/` or `schema.yml`. Lists are paginated (page size 20). "Scoped" means the access rule in section 5.

### Authentication — `/auth/`
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `captcha/` | Public |
| POST | `register/` | Public (citizen accounts only) |
| POST | `login/` | Public (email, password, captcha) |
| POST | `logout/` | Signed in (revokes the refresh token) |
| POST | `refresh/` | Public with a refresh token |
| POST | `verify/` | Public (check a token) |
| GET | `me/` | Signed in |
| POST | `forgot-password/` | Public (always returns the same generic message) |
| POST | `reset-password/` | Public with uid and token |

### Complaints — `/complaints/`
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `` | Signed in, scoped; filters `q`, `status`, `priority`, `category`, `citizen`, `assigned_authority` |
| POST | `create/` | Public (guests allowed); multipart `images`, `audio`, `video` |
| GET | `track/{tracking_code}/` | Public; evidence files hidden unless scoped |
| GET | `{id}/` | Scoped |
| PATCH | `{id}/status/` | Scoped officer or super admin |
| PATCH | `{id}/assign/` | Scoped officer or super admin |
| POST | `{id}/images/`, `{id}/attachments/` | Scoped |
| GET | `{id}/timeline/` | Public; names masked unless scoped |

### Officer workspace — `/authority/`
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `dashboard/summary/`, `dashboard/recent/` | Officer, super admin |
| GET | `complaints/`, `complaints/{id}/` | Officer, super admin (scoped) |
| POST, PATCH | `complaints/{id}/status/`, `notes/`, `priority/` | Scoped officer, super admin |
| POST | `complaints/{id}/resolution-image/` | Scoped officer, super admin |
| GET | `analytics/stats/`, `analytics/department/`, `analytics/priority/` | Officer, super admin |
| GET, POST | `notifications/`, `notifications/unread-count/`, `notifications/mark-read/`, `notifications/mark-all-read/` | Signed in |

### Departments — `/departments/`
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `` , `{id}/` | Signed in |
| POST | `create/` | Super admin |
| PUT, PATCH | `{id}/update/` | Super admin |
| POST | `{id}/deactivate/` | Super admin |
| GET | `{id}/authorities/`, `{id}/statistics/` | Officer, super admin |
| POST | `{id}/authorities/assign/` | Super admin |
| PATCH, DELETE | `{id}/authorities/{user_id}/update/`, `{id}/authorities/{user_id}/` | Super admin |

### Users — `/users/`
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `profile/citizen/`, `profile/authority/`, `profile/admin/` | Matching role |
| PUT, PATCH | `profile/update/` | Signed in |
| POST | `profile/upload-image/`, `change-password/` | Signed in |
| GET | `search/` | Officer, super admin |
| POST | `create/` | Super admin (creates officers and admins) |
| GET | `{id}/` | Officer, super admin |
| PATCH, DELETE | `{id}/` | Super admin (delete suspends the account) |

### Feedback — `/feedback/`
| Method | Path | Access |
| :--- | :--- | :--- |
| POST | `submit/` | Owner of a resolved or closed complaint |
| GET | `my-feedbacks/` | Citizen |
| GET | `complaint/{id}/` | Scoped |
| GET | `department/{category}/stats/`, `authority/feedbacks/` | Officer, super admin |
| GET | `authority/stats/` | Officer |

### Notifications and audit
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `/notifications/` | Signed in |
| POST | `/notifications/{id}/mark-read/`, `/notifications/mark-all-read/` | Signed in |
| GET | `/audit-logs/`, `/audit-logs/{id}/`, `/audit-logs/summary/` | Super admin |

### Errors and limits
- Errors use `{"detail": "..."}` or a field-keyed object, with 400, 401, 403, 404 or 429.
- Rate limits: anonymous 1,000/hour, signed-in 5,000/hour, sign-in and password endpoints 120/minute (disabled in the dev settings).

---

## 14. Website (frontend)

- **Portals:** citizen (`/citizen/...`), officer (`/authority/...`), super admin (`/superadmin/...`), plus public pages (`/`, `/track`, `/map`, `/login/...`, `/signup/citizen`, `/reset-password`). Staff sign-up URLs show a notice explaining that staff accounts are created by a super admin.
- **State and API:** Zustand stores (`authStore`, `complaintStore`) and one axios client (`src/services/api.ts`) that adds the Bearer token and refreshes it on a 401.
- **Languages:** `src/i18n/locales/en.json`, `hi.json`, `or.json`; a language selector is on every portal.
- **Maps:** `IncidentMap` and `LocationPicker` (Leaflet, OpenStreetMap tiles, Nominatim and BigDataCloud for address lookup).
- **Evidence:** audio recorder and photo/video pickers in the report-a-problem flow, which is a four-step guided form (what, where, proof, review).
- **Look:** kesari / maroon / haldi palette defined as shared tokens in `src/styles/global.css`.

---

## 15. CIVIC web and mobile app

`civic-app/` comes from the repository `sujitsahu461/CIVIC--Powered-by-CivicSetu`.

- **CIVIC web app (PWA):** a citizen-only prototype. Only the built files are committed (`civic-app/dist`); its source is **not in git**. It currently keeps complaints, tracking codes and sign-ins in browser `localStorage` and does not call the backend. `server.js` serves the build with `/healthz`, plus mock geo endpoints.
- **Mobile app (`civic-app/mobile`):** Expo SDK 54. `EXPO_PUBLIC_CIVICSETU_APP_MODE=website` (default) shows the CIVIC web app in a WebView; `native` mode uses native screens (home, report, complaints, notifications, profile, drafts, track) with a typed client for the Django API, tokens in SecureStore, and offline drafts in SQLite that are never marked as sent without server confirmation. The source for `mobile/src` is **not in git**; only the compiled bundle in `mobile/dist` is.
- **Docs:** `civic-app/docs/` has the BRD, PRD, HLD, LLD, database design, API contract, offline-sync design and Android build notes.

To make the app production-ready, its source must be committed and its data layer pointed at the backend (through the mobile BFF in section 17).

---

## 16. Security

- **Accounts:** public sign-up creates citizens only. Officer and admin accounts are created by a super admin. Passwords use Django's validators and PBKDF2.
- **Tokens:** access 15 minutes, refresh 7 days, rotation with blacklisting; sign-out revokes the refresh token.
- **Sign-in:** a server-signed arithmetic captcha is required; failed sign-ins are audit-logged.
- **Password reset:** the API never returns the reset link, SMTP errors or whether the account exists.
- **Access control:** every complaint endpoint applies the scoping rule; officers cannot see other departments' complaints; only the owner can rate.
- **Uploads:** type, extension, size and (for images) real content are checked.
- **Public tracking:** hides evidence files; the public timeline hides names and emails; the shared guest account is locked (inactive, unusable password).
- **Headers:** Content-Security-Policy (set `CSP_REPORT_ONLY=True` to trial changes), HSTS and secure cookies in production.
- **Audit:** `audit_logs` records sign-in, sign-out, registration, password and profile changes, complaint, department and rating actions.
- **Secrets:** keep `.env`, keys and credentials out of git (`.gitignore` covers them). Only a public API address belongs in client apps.
- Known gaps and their fixes are listed in `docs/architecture-audit.html` (security assessment).

---

## 17. Target architecture and Azure deployment

All production deployment is planned on **Microsoft Azure**, as nine independent microservices plus two backend-for-frontend (BFF) services, carved out of this Django app one at a time:

| Service | Responsibility |
| :--- | :--- |
| Identity | Sign-up, sign-in, tokens, roles, profiles |
| Grievance | Complaint workflow, tracking, timeline |
| Department & Routing | Departments, officers, categories, routing rules, SLA targets |
| Triage | Rule-based category and priority suggestions (configurable) |
| Media | Uploads, file checks, thumbnails |
| Notification | In-app, email, push templates and delivery |
| Feedback | Ratings |
| Reporting | Dashboards, analytics, exports |
| Audit | Append-only audit trail |
| Web BFF / Mobile BFF | One API per client: cookie sign-in for the website, versioned idempotent API for the app |

Azure services: Container Apps, Container Registry, Front Door with WAF, **Azure Database for PostgreSQL Flexible Server (private network, one schema and one database role per service)**, Service Bus (events with an outbox), Blob Storage (private evidence files), Managed Redis, Key Vault, App Configuration (settings and feature flags), Application Insights and Log Analytics, GitHub Actions with OIDC, and Bicep for infrastructure as code.

**Customization** is designed in seven layers: business rules edited in the admin portal, feature flags, technical settings, themes and translations, swappable providers (email, SMS, push, storage), infrastructure parameters, and a service template for new modules.

Estimated monthly cost: staging about $70–175, production about $490–1,070 (the top includes zone-redundant database high availability). Prices are estimates; confirm them in the Azure Pricing Calculator.

Full detail, diagrams, failure matrix, threat model and the phased plan: [`docs/architecture-audit.html`](docs/architecture-audit.html) (open in a browser).

---

## 18. Migration progress

| Phase | Status |
| :--- | :--- |
| 0 Reconcile the codebase (security fixes merged onto main, demotion bug fixed, dependencies pinned) | Done |
| 1 Architecture audit | Done (revision 3) |
| AI/ML removal (this change) | Done |
| 2 Split modules and schemas inside the monolith | Not started |
| 3 Contracts, ownership and customization catalogue | Not started |
| 4 Service chassis, template and local platform (Docker) | Not started |
| 5 BFFs, gateway and token signing | Not started |
| 6–8 Extract services one at a time (Notification first, Identity last) | Not started |
| 9–10 Observability, reliability, security hardening | Not started |
| 11 CI/CD and infrastructure as code | Not started |
| 12 Load test against the 1,000-concurrent-user target | Not started |
| 13–14 Azure staging, then production (needs explicit approval) | Not started |
| 15 Final documentation | Not started |

The 1,000-concurrent-user target has **not been measured**. No capacity claim is made until the load test in phase 12 passes.

---

## 19. Documentation index

| File | Content |
| :--- | :--- |
| `docs/architecture-audit.html` | Azure microservices audit, target design, costs, migration plan (current) |
| `docs/architecture.md`, `docs/api.md`, `docs/security.md`, `docs/setup.md`, `docs/deployment.md` | Core technical docs |
| `docs/I18N_IMPLEMENTATION.md`, `docs/MULTIMEDIA_EVIDENCE.md` | Languages and evidence upload |
| `docs/POSTGRES_MIGRATION_REPORT.md`, `docs/MOBILE_SYNC_HANDOFF.md` | PostgreSQL move and mobile-sync guide (dated records) |
| `docs/V1_AUDIT.md`, `docs/REVIEW_SUMMARY.md`, `docs/TEST_REPORT.md` | Earlier V1 reports (dated records; they describe the AI/ML code that has since been removed) |
| `civic-app/docs/` | CIVIC app design documents |

---

## 20. Known limitations

- Uploaded files are stored on local disk and logs go to a local file, so the app cannot yet run on more than one server.
- Notifications and password-reset email are sent inside the request.
- The website keeps tokens in browser `localStorage` (mitigated by the Content-Security-Policy); the planned web BFF moves them into httpOnly cookies.
- Evidence files are publicly reachable by URL once known; the plan moves them to private storage with short-lived links.
- Officers can search all users and read any user's profile.
- Complaint routing matches department **names** against category words, so renaming a department can change who sees complaints; the plan replaces this with explicit routing rules.
- Tracking codes have 4 random characters per day, which is guessable at scale.
- CIVIC app source code is not in git (section 15).
- No Dockerfile, CI pipeline or infrastructure code exists yet.

---

## 21. Removal of the AI/ML engine

The earlier machine-learning code has been removed: the `ai_engine` and `ai_predictions` apps, the `/api/v1/ai/` endpoints, the pickled models and their preprocessing scripts, the scikit-learn / pandas / numpy / joblib dependencies, and the matching website screens (AI inference playground, model performance card, retraining controls).

- Category and priority are now rule-based (section 7).
- **Existing databases:** the old `ai_prediction_logs` table is left in place and unused; removing the app does not drop it. After taking a backup you may drop it with `DROP TABLE ai_prediction_logs;`. The audit action `AI_TRIAGE_RUN` was removed in migration `audit_logs.0002`.
- Older reports in `docs/` still describe the removed code and are kept as dated records.

---

## 22. Team and license

- **Sujit Sahu** — full-stack development and architecture ([GitHub](https://github.com/sujitsahu461))

No open-source license has been chosen; all rights are reserved by the author. Contact the maintainer about use or distribution.
