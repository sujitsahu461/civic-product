# CivicSetu V1 System Audit & Baseline Specification

## 1. Executive Summary
This audit documents the architecture, data models, endpoints, frontend views, multimedia handling, and AI/ML dependencies of **CivicSetu V1** prior to the citizen portal refactor, internationalization (English, Odia, Hindi), multimedia complaints expansion, and full AI/ML decommissioning.

---

## 2. Backend Applications & Domain Mapping

| App | Domain Responsibility | Key Models | URL Prefix |
| :--- | :--- | :--- | :--- |
| `apps.accounts` | User registration, login, JWT token management, password reset | `User`, `UserRole` | `/api/v1/auth/` |
| `apps.users` | User profile retrieval, updates, avatar handling | `User` profile fields | `/api/v1/users/` |
| `apps.departments` | Municipal departments and staff assignment | `Department`, `DepartmentAuthority` | `/api/v1/departments/` |
| `apps.complaints` | Core grievance filing, status lifecycle, history, public tracking | `Complaint` | `/api/v1/complaints/` |
| `apps.complaint_images` | Evidence image attachments for complaints | `ComplaintImage` | (nested in complaints) |
| `apps.complaint_history` | Audit log of complaint transitions and actor actions | `ComplaintHistory` | (nested in complaints) |
| `apps.authority` | Department-scoped authority queues, escalations, resolution proof | Authority workflows | `/api/v1/authority/` |
| `apps.feedback` | Citizen post-resolution ratings (1-5 stars) and comments | `Feedback` | `/api/v1/feedback/` |
| `apps.notifications` | In-app user notifications for lifecycle updates | `Notification` | `/api/v1/notifications/` |
| `apps.audit_logs` | Immutable administrative security audit trail | `AuditLog` | `/api/v1/audit-logs/` |
| `apps.ai_engine` | *(Targeted for Decommission)* Scikit-learn TF-IDF classifiers and models | N/A (Pickle models) | Internal service |
| `apps.ai_predictions` | *(Targeted for Decommission)* Triage REST endpoints, hazard detection, duplicate scan | `AIPredictionLog` | `/api/v1/ai/` |

---

## 3. Data Model & Attachment Audit

### 3.1 `Complaint` Model (`apps/complaints/models.py`)
- **Identifiers**: `id` (Auto PK), `public_id` (UUID), `tracking_code` (`CMP-YYYYMMDD-XXXX`).
- **Attributes**: `citizen` (FK, nullable for anonymous reporting), `category` (`ROAD`, `WATER`, `ELECTRICITY`, `DRAINAGE`, `SANITATION`), `title`, `description`, `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `status` (`PENDING`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`), `location_address`, `latitude`, `longitude`, `assigned_authority`, `resolution_notes`, `resolved_at`, timestamps.
- **Relationships**: `images` (reverse FK to `ComplaintImage`), `history` (reverse FK to `ComplaintHistory`), `feedback` (reverse OneToOne to `Feedback`).

### 3.2 Evidence Attachments (`ComplaintImage`)
- **Current schema**: Only stores images via `ImageField(upload_to="complaint_images/%Y/%m/")`.
- **Limitation**: No support for audio files or video evidence.
- **V1 Target**: Introduce a generalized `ComplaintAttachment` model supporting `IMAGE`, `AUDIO`, `VIDEO` with verified content type, file size, original filename, and duration metadata, while retaining full backwards compatibility with historical `ComplaintImage` records.

---

## 4. Frontend Route & Component Mapping

| Route | Component | Role / Purpose |
| :--- | :--- | :--- |
| `/` | `Landing.jsx` | Public landing page, quick action links, platform statistics |
| `/citizen/submit` | `SubmitComplaint.tsx` | Citizen grievance reporting (Title, Desc, Category, Location, Media) |
| `/citizen/track` | `TrackComplaint.tsx` | Public & citizen tracking by code, timeline display, rating feedback |
| `/citizen/history` | `ComplaintHistory.tsx` | Authenticated citizen history table, status badges, details drawer |
| `/citizen/dashboard` | `CitizenDashboard.tsx` | Citizen summary metrics, quick actions, recent grievances |
| `/citizen/profile` | `CitizenProfile.tsx` | Citizen contact details, address/ward settings |
| `/citizen/notifications` | `CitizenNotifications.tsx` | Lifecycle notification drawer/list |
| `/login`, `/register` | `CitizenLogin.tsx`, `CitizenSignup.tsx` | Citizen authentication & registration |
| `/map` | `MapView.tsx` | Geospatial incident map view with markers |
| `/authority/*` | `AuthorityDashboard`, `ComplaintManagement`, etc. | Municipal officer workflow queue, resolution proof, assignment |
| `/admin/*` | `SuperAdminDashboard`, `UserManagement`, etc. | Administrative dashboard and master records |

---

## 5. Baseline Test Status
- **Backend Test Suite**: `python manage.py test --settings=config.settings.test`
  - Total tests: **212**
  - Result: **212 / 212 Passing (100%)**
- **Frontend Build**: `npm run build`
  - Bundler: Vite 8.2.1 + React 19.2.8
  - Result: **Clean build in ~750ms**, zero syntax or type blocking issues.
