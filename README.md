# CivicSetu — AI-Powered Civic Engagement Platform

![CivicSetu Logo](CivicSetu%20Civic%20Tech%20Logo.png)

CivicSetu is a full-stack, enterprise-grade civic engagement and municipal grievance redressal platform. It digitizes public complaint reporting, applies machine learning for automated category classification, priority evaluation, and department routing, and provides role-based workflows for citizens and municipal authorities with transparent lifecycle tracking and comprehensive auditability.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Key Features](#4-key-features)
5. [Architecture](#5-architecture)
6. [Technology Stack](#6-technology-stack)
7. [AI/ML Capabilities](#7-aiml-capabilities)
8. [User Roles](#8-user-roles)
9. [Civic Categories](#9-civic-categories)
10. [Complaint Lifecycle](#10-complaint-lifecycle)
11. [Project Structure](#11-project-structure)
12. [Installation](#12-installation)
13. [Backend Setup](#13-backend-setup)
14. [Frontend Setup](#14-frontend-setup)
15. [Environment Configuration](#15-environment-configuration)
16. [Database Configuration](#16-database-configuration)
17. [AI Model Setup](#17-ai-model-setup)
18. [Running Tests](#18-running-tests)
19. [Running the Development Server](#19-running-the-development-server)
20. [API Documentation](#20-api-documentation)
21. [Deployment Notes](#21-deployment-notes)
22. [Security Notes](#22-security-notes)
23. [Team / Contributors](#23-team--contributors)
24. [License](#24-license)

---

## 1. Project Overview

CivicSetu bridges the communication divide between citizens and urban local bodies (ULBs). It provides an accessible web interface for citizens to lodge civic grievances, track progress in real time via unique tracking codes, and submit satisfaction feedback. For municipal authorities, it delivers an operational command portal equipped with automated triage, department-scoped workflows, evidence upload, and analytics.

---

## 2. Problem Statement

Municipal grievance redressal faces systemic challenges:
- **Fragmented Reporting Channels**: Grievances filed across informal channels often lack tracking and accountability.
- **Manual Triage Bottlenecks**: Redirection of complaints to appropriate civic departments is slow and prone to human misclassification.
- **Lack of Citizen Transparency**: Citizens rarely receive status updates or verification proof upon grievance resolution.
- **Absence of Auditability**: State transitions, officer reassignments, and resolution notes often lack immutable audit trails.

---

## 3. Proposed Solution

CivicSetu addresses these bottlenecks through:
- **Centralized Digital Portal**: A unified Single-Page Application (SPA) accessible to citizens and authorities.
- **Embedded AI Triage**: Automated text classification, urgency prioritization, and deterministic/ML department routing.
- **Strict State Machine Workflow**: Standardized complaint progression (`PENDING` → `IN_PROGRESS` → `RESOLVED` / `REJECTED`) with required resolution proof.
- **Comprehensive Notification & Audit System**: In-app notifications for lifecycle events and immutable security audit logs for administrative monitoring.

---

## 4. Key Features

- **Role-Based Access Control (RBAC)**: Distinct permissions for `Citizen`, `Authority`, and `Super Admin` users.
- **Complaint Submission & Tracking**:
  - Auto-generated tracking codes in format `CMP-YYYYMMDD-XXXX`.
  - Image evidence upload validation (JPEG, PNG, WebP up to 5MB).
  - Public complaint tracking by code without requiring login.
  - Interactive incident map view with geospatial markers.
- **Authority Command Portal**:
  - Department-scoped grievance queues.
  - State machine transitions with mandatory resolution notes and resolution proof upload.
  - Priority management (Low, Medium, High, Urgent).
  - Department performance analytics and resolution statistics.
- **Citizen Feedback & Redressal Validation**:
  - Post-resolution 1-5 star ratings and textual reviews.
- **In-App Notification Engine**: Real-time alerts on status transitions, new filings, and assignments.
- **Interactive OpenAPI Documentation**: Built-in Swagger UI and OpenAPI 3.0 schema generation.

---

## 5. Architecture

CivicSetu follows a modular monolithic architecture with a decoupled React SPA frontend and a Django REST Framework backend:

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend Layer (React 19 + Vite)            │
│       Citizen Portal  │  Authority Portal  │  Admin Panel   │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API / JWT
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend Layer (Django 5.x REST)            │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   Domain Services     │       │    CivicSetu AI Engine│  │
│  │  • Accounts & Auth    │       │  • Category Classifier│  │
│  │  • Complaints & State │       │  • Priority Predictor │  │
│  │  • Authority Workflows│       │  • Department Router  │  │
│  │  • Audit Logs         │       └───────────────────────┘  │
│  └───────────────────────┘                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Persistence                       │
│    MySQL 8.0 (InnoDB)  │  Media Storage  │  Audit Logs      │
└─────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [`docs/architecture.md`](docs/architecture.md).

---

## 6. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | Django 5.0.14 | Core web framework & ORM |
| **API Framework** | Django REST Framework 3.15.2 | RESTful API endpoints and serializers |
| **Authentication** | djangorestframework-simplejwt 5.3.1 | JSON Web Token (JWT) auth with token blacklisting |
| **Database** | MySQL 8.0 (InnoDB engine, `utf8mb4`) | Relational data persistence |
| **AI / Machine Learning** | scikit-learn 1.6.1, joblib 1.5.3 | NLP text classification, priority & routing models |
| **Data Processing** | pandas 3.0.6, numpy 2.5.2 | Data feature manipulation and preprocessing |
| **API Documentation** | drf-spectacular 0.27.2 | OpenAPI 3.0 specification & Swagger UI |
| **Frontend Framework** | React 19.2.8 | User interface components and views |
| **Frontend Build Tool** | Vite 8.2.0 | Development server and client build tooling |
| **State Management** | Zustand 5.0.14 | Client-side reactive state management |
| **Mapping** | Leaflet 1.9.4 & React-Leaflet 5.0.0 | Interactive incident location mapping |
| **Styling** | Vanilla CSS Modules | Glassmorphism design system |
| **Static Serving** | WhiteNoise 6.7.0 | Production static asset delivery |
| **WSGI Server** | Gunicorn 22.0.0 | Production application server |

---

## 7. AI/ML Capabilities

CivicSetu includes embedded, serialized machine learning models in the repository root:

1. **Category Classification**:
   - **Artifacts**: `civicsetu_category_model.pkl`, `civicsetu_tfidf_vectorizer.pkl`
   - **Function**: Classifies complaint title and description into one of 5 civic categories.
   - **Preprocessing**: `civicsetu_preprocessing.py` (text normalization, lowercasing, regex cleaning).

2. **Priority Prediction**:
   - **Artifacts**: `priority_model.pkl`, `priority_label_encoder.pkl`, `priority_model_metadata.json`
   - **Function**: Evaluates text, category, and location to predict operational urgency (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).

3. **Department Routing**:
   - **Artifacts**: `department_model.pkl`, `department_lookup_table.json`, `department_model_metadata.json`
   - **Function**: Maps grievances deterministically and via ML fallback to the responsible municipal department.

Detailed documentation is available in [`docs/ai-ml.md`](docs/ai-ml.md).

---

## 8. User Roles

| Role | Access Level & Permissions |
| :--- | :--- |
| **Citizen (`CITIZEN`)** | File complaints, attach images, view personal dashboard, track any complaint via tracking code, submit post-resolution feedback. |
| **Authority (`AUTHORITY`)** | Access department dashboard, view assigned department grievances, transition statuses, upload resolution evidence, view department analytics. |
| **Super Admin (`SUPER_ADMIN`)** | Full administrative rights, manage users, create/deactivate departments, assign authorities, inspect audit logs, view system-wide metrics. |

---

## 9. Civic Categories

The platform supports 5 core civic categories mapped to municipal departments:

| Category | Typical Issues | Assigned Department |
| :--- | :--- | :--- |
| **`DRAINAGE`** | Clogged storm drains, gutter overflow, sewer backup | Sewer / Drainage |
| **`ELECTRICITY`** | Power outage, broken electric poles, exposed wires, streetlight faults | Electrical |
| **`ROAD`** | Potholes, damaged asphalt, missing manhole covers, footpath damage | Public Works (PWD) |
| **`SANITATION`** | Overflowing garbage bins, illegal dumping, street sweeping | Sanitation |
| **`WATER`** | Pipe leaks, contaminated water supply, low water pressure | Water Department |

---

## 10. Complaint Lifecycle

The grievance state machine transitions through strictly defined phases:

```
  [Citizen Submission]
           │
           ▼
      ┌─────────┐
      │ PENDING │
      └────┬────┘
           │
           ├───► [Authority Review & Assignment] ───► ┌─────────────┐
           │                                          │ IN_PROGRESS │
           │                                          └──────┬──────┘
           │                                                 │
           ▼                                                 ▼
     ┌──────────┐                                      ┌──────────┐
     │ REJECTED │                                      │ RESOLVED │
     └──────────┘                                      └────┬─────┘
                                                            │
                                                            ▼
                                                   [Citizen Feedback]
```

- **`PENDING`**: Newly registered grievance awaiting authority review.
- **`IN_PROGRESS`**: Authority has acknowledged the issue and dispatched resolution personnel.
- **`RESOLVED`**: Work completed; resolution proof image and notes uploaded.
- **`REJECTED`**: Complaint declined with required justification notes.

---

## 11. Project Structure

```
CivicSetu/
├── apps/                          # Modular Django applications
│   ├── accounts/                  # Authentication & JWT management
│   ├── ai_engine/                 # Machine learning inference engine
│   ├── ai_predictions/            # AI prediction endpoints and logging
│   ├── audit_logs/                # Administrative security audit trail
│   ├── authority/                 # Authority workflows and analytics
│   ├── complaint_history/         # State transition history records
│   ├── complaint_images/          # Grievance and resolution proof attachments
│   ├── complaints/                # Complaint domain logic and endpoints
│   ├── core/                      # Abstract models, UUID base models, utilities
│   ├── departments/               # Department management & authority mapping
│   ├── feedback/                  # Citizen rating and review system
│   ├── notifications/             # In-app event notifications
│   └── users/                     # User management & profile services
├── config/                        # Django project configuration
│   ├── settings/                  # Settings (base.py, dev.py, prod.py)
│   ├── asgi.py                    # ASGI entrypoint
│   ├── urls.py                    # Platform routing & SPA fallback
│   └── wsgi.py                    # WSGI application entrypoint
├── docs/                          # Technical documentation
│   ├── ai-ml.md                   # Machine learning pipeline documentation
│   ├── api.md                     # REST API reference
│   ├── architecture.md            # System architecture and design
│   ├── deployment.md              # Production deployment guidelines
│   ├── security.md                # Security and authentication architecture
│   └── setup.md                   # Installation and local development guide
├── frontend/                      # React 19 + TypeScript + Vite SPA
│   ├── src/                       # React source components, pages, stores
│   ├── public/                    # Static public assets
│   ├── package.json               # Frontend dependencies & scripts
│   └── vite.config.js             # Vite development & build configuration
├── static/                        # Static assets (CSS, JS, images, compiled SPA)
├── templates/                     # HTML templates (SPA index.html)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git exclusion rules
├── manage.py                      # Django management script
├── requirements.txt               # Python package dependencies
├── schema.yml                     # Exported OpenAPI 3.0 schema
└── toggle_review_mode.py          # Development review phase toggle utility
```

---

## 12. Installation

### Prerequisites
- Python 3.12+
- Node.js 18.x or 20.x+
- MySQL 8.0+
- Git

Clone the repository:
```bash
git clone https://github.com/sujitsahu461/-CivicSetu-AI-Powered-Civic-Engagement-Platform.git
cd -CivicSetu-AI-Powered-Civic-Engagement-Platform
```

---

## 13. Backend Setup

1. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv .venv
   .\.venv\Scripts\activate

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 14. Frontend Setup

1. Navigate to the `frontend/` directory and install packages:
   ```bash
   cd frontend
   npm install
   ```

2. Build the production SPA and deploy assets into Django:
   ```bash
   npm run deploy
   cd ..
   ```

---

## 15. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the following variables are configured:
```ini
DJANGO_ENV=development
DJANGO_SETTINGS_MODULE=config.settings.dev
SECRET_KEY=your-secure-development-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=civicsetu
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306

CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173

FRONTEND_URL=http://localhost:5173
```

---

## 16. Database Configuration

1. Log into MySQL and create the database:
   ```sql
   CREATE DATABASE civicsetu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Apply migrations:
   ```bash
   python manage.py migrate
   ```

3. (Optional) Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

---

## 17. AI Model Setup

All pre-trained scikit-learn model files (`*.pkl`, `*.json`) are included directly in the root directory:
- `civicsetu_category_model.pkl` & `civicsetu_tfidf_vectorizer.pkl`
- `priority_model.pkl` & `priority_label_encoder.pkl`
- `department_model.pkl` & `department_lookup_table.json`

No additional model downloads or external weights are required. The models load automatically on application startup.

---

## 18. Running Tests

The test suite covers authentication, permissions, state transitions, AI classification, and authority workflows:

```bash
python manage.py test
```

**Status**: 212 / 212 automated tests passing (100% pass rate).

---

## 19. Running the Development Server

### Integrated Mode (Django serves API + Built SPA)
```bash
python manage.py runserver 127.0.0.1:8000
```
- **Web App**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger UI**: [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- **Django Admin**: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

### Concurrent Development Mode (Vite HMR)
Run backend in Terminal 1:
```bash
python manage.py runserver 127.0.0.1:8000
```

Run Vite dev server in Terminal 2:
```bash
cd frontend
npm run dev
```
- **Vite React UI**: [http://127.0.0.1:5173/](http://127.0.0.1:5173/) (proxies `/api` and `/media` to 8000)

---

## 20. API Documentation

Interactive Swagger documentation is available at `/api/docs/` when running the server. The raw OpenAPI 3.0 schema is accessible at `/api/schema/` or in the committed [`schema.yml`](schema.yml) file.

Refer to [`docs/api.md`](docs/api.md) for endpoint specifications and sample payloads.

---

## 21. Deployment Notes

- Deploy using Gunicorn behind an NGINX reverse proxy with SSL termination.
- Use WhiteNoise or NGINX to serve collected static files (`python manage.py collectstatic --noinput`).
- Store media files in dedicated, non-executable storage volumes.
- Full deployment instructions are documented in [`docs/deployment.md`](docs/deployment.md).

---

## 22. Security Notes

- JWT authentication with access token expiration and token blacklisting on logout.
- Strict Role-Based Access Control (RBAC) enforced across all API views.
- Upload validation enforcing image MIME types and a 5MB size limit.
- Comprehensive audit logging of authentication, complaint lifecycle, and administrative events.
- Never commit `.env` or secret keys to version control.
- See [`docs/security.md`](docs/security.md) for the complete security specification.

---

## 23. Team / Contributors

- **Sujit Sahu** — Full-Stack Development & AI/ML Architecture ([GitHub](https://github.com/sujitsahu461))

---

## 24. License

This repository is currently maintained without an explicit open-source license. All rights are reserved by the author. Inquiries regarding use, distribution, or licensing should be directed to the repository maintainer.
