# CivicSetu — System Architecture & Design

## 1. System Overview

CivicSetu is an enterprise-grade civic grievance redressal and municipal engagement platform designed to streamline citizen complaint registration, provide AI-assisted automated triage and department routing, and deliver transparent lifecycle tracking with auditability.

```
                              ┌─────────────────────────────────────────┐
                              │            CivicSetu Clients            │
                              │  (React 19 SPA / Citizen & Authority)   │
                              └────────────────────┬────────────────────┘
                                                   │  REST API / JWT
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │           API Gateway / Django          │
                              │           Django REST Framework         │
                              └───────┬─────────────────────────┬───────┘
                                      │                         │
                                      ▼                         ▼
        ┌───────────────────────────────────┐     ┌───────────────────────────────────┐
        │        CivicSetu AI Engine        │     │       Data & Storage Layer        │
        │  • Category Classifier (TF-IDF)   │     │  • MySQL 8.0 (InnoDB, Relational) │
        │  • Priority Predictor (Pipeline)  │     │  • Media Storage (Images/Proofs)  │
        │  • Department Router & Lookup     │     │  • Token Blacklist & Audit Logs   │
        └───────────────────────────────────┘     └───────────────────────────────────┘
```

---

## 2. Core Architectural Principles

- **Modular Monolith**: Organized into loosely-coupled Django applications under `apps/` with clear domain boundaries (`accounts`, `users`, `departments`, `complaints`, `complaint_history`, `complaint_images`, `authority`, `feedback`, `notifications`, `audit_logs`, `ai_engine`, `ai_predictions`).
- **Role-Based Access Control (RBAC)**: Enforced via custom DRF permission classes distinguishing between:
  - `CITIZEN`: Grievance submission, personal tracking, profile management, feedback.
  - `AUTHORITY`: Department-scoped grievance redressal, status updates, evidence submission, analytics.
  - `SUPER_ADMIN`: Cross-department management, user administration, system-wide analytics, audit logs.
- **Auditable Complaint Lifecycle**: Compliant with a finite state machine (`PENDING` -> `IN_PROGRESS` -> `RESOLVED` / `REJECTED`). Every transition generates immutable `ComplaintHistory` records and administrative audit logs.
- **Embedded AI/ML Intelligence**: Pre-trained scikit-learn models evaluate grievance content synchronously or upon submission to recommend category classification, urgency prioritization, and municipal department assignment.

---

## 3. Application Component Layout

```
CivicSetu/
├── apps/
│   ├── accounts/          # Authentication, JWT issuance/refresh, password reset
│   ├── ai_engine/         # Core ML inference engine (TF-IDF, Priority, Department)
│   ├── ai_predictions/    # REST endpoints and persistent logging for AI predictions
│   ├── audit_logs/        # Immutable system and security audit trails
│   ├── authority/         # Authority dashboard, resolution workflows, analytics
│   ├── complaint_history/ # Lifecycle state machine history and transition events
│   ├── complaint_images/  # Grievance and resolution proof attachments
│   ├── complaints/        # Grievance CRUD, public tracking, filtering
│   ├── core/              # Base models (UUID primary keys, timestamps), utilities
│   ├── departments/       # Municipal department registry and authority assignments
│   ├── feedback/          # Citizen post-resolution ratings and reviews
│   ├── notifications/     # In-app notification engine and event delivery
│   └── users/             # User profile management and administrative user directory
├── config/
│   ├── settings/          # Environment-driven settings (base, dev, prod)
│   ├── asgi.py            # ASGI entrypoint
│   ├── wsgi.py            # WSGI production server entrypoint
│   └── urls.py            # Platform URL routing and SPA catch-all
├── frontend/              # React 19 + TypeScript + Vite Single-Page Application
├── static/                # Static assets and compiled SPA distribution files
├── templates/             # Django templates (serves compiled SPA index.html)
└── docs/                  # Comprehensive technical documentation
```

---

## 4. Database Schema Relationships

- **User**: Custom user entity (`CITIZEN`, `AUTHORITY`, `SUPER_ADMIN`).
- **Department**: Municipal entity (e.g., Road, Water Supply, Electricity, Sanitation, Drainage).
- **DepartmentAuthority**: Many-to-many relationship mapping users with role `AUTHORITY` to specific departments with designations.
- **Complaint**: The central grievance record, featuring a human-readable tracking code (`CMP-YYYYMMDD-XXXX`), status, priority, category, coordinates, address, and citizen foreign key.
- **ComplaintImage**: Stores photographic evidence uploaded by citizens during submission or authorities during resolution.
- **ComplaintHistory**: Tracks all status transitions, assigned actors, notes, and timestamps.
- **Notification**: Alerts delivered to citizens and authorities on status changes.
- **Feedback**: Post-resolution satisfaction rating (1-5 stars) and comments.
- **AuditLog**: Administrative log capturing critical authentication, authority, and data modification events.
