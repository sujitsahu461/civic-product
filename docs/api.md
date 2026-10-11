# CivicSetu — REST API Documentation

CivicSetu exposes a versioned RESTful API under `/api/v1/`. OpenAPI 3.0 specification is available at `/api/schema/`, and an interactive Swagger UI is available at `/api/docs/`.

---

## 1. Authentication (`/api/v1/auth/`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register/` | Register citizen or authority | Public |
| `POST` | `/api/v1/auth/login/` | Authenticate and obtain JWT access/refresh tokens | Public |
| `POST` | `/api/v1/auth/token/refresh/` | Refresh expired access token | Public (valid refresh token) |
| `POST` | `/api/v1/auth/token/blacklist/` | Invalidate token on logout | Authenticated |
| `GET` | `/api/v1/auth/me/` | Fetch current session user profile & role | Authenticated |
| `POST` | `/api/v1/auth/forgot-password/` | Initiate password recovery via SMTP email | Public |
| `POST` | `/api/v1/auth/reset-password/` | Complete password reset with verification token | Public |

---

## 2. User Management (`/api/v1/users/`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/profile/` | Retrieve user profile details | Authenticated |
| `PUT/PATCH` | `/api/v1/users/profile/update/` | Update profile information | Authenticated |
| `POST` | `/api/v1/users/profile/upload-image/` | Upload profile avatar | Authenticated |
| `POST` | `/api/v1/users/change-password/` | Change password with current password confirmation | Authenticated |
| `GET` | `/api/v1/users/search/` | Search and filter user accounts | Super Admin |

---

## 3. Department Management (`/api/v1/departments/`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/departments/` | List all municipal departments | Public / Authenticated |
| `GET` | `/api/v1/departments/<id>/` | Retrieve specific department details | Public / Authenticated |
| `POST` | `/api/v1/departments/create/` | Register new municipal department | Super Admin |
| `PUT/PATCH` | `/api/v1/departments/<id>/update/` | Modify department attributes | Super Admin |
| `GET` | `/api/v1/departments/<id>/statistics/` | Department-scoped grievance statistics | Authority / Admin |
| `POST` | `/api/v1/departments/<id>/authorities/assign/` | Assign authority personnel to department | Super Admin |
| `DELETE` | `/api/v1/departments/<id>/authorities/<user_id>/` | Remove authority personnel assignment | Super Admin |

---

## 4. Complaints & Grievances (`/api/v1/complaints/`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/complaints/` | List complaints (scoped by role: Citizen sees own, Authority sees department) | Authenticated |
| `POST` | `/api/v1/complaints/` | File new grievance (supports image upload) | Citizen |
| `GET` | `/api/v1/complaints/<id>/` | Retrieve complaint detail with timeline | Authenticated |
| `GET` | `/api/v1/complaints/track/<tracking_code>/` | Public tracking by `CMP-YYYYMMDD-XXXX` | Public |
| `POST` | `/api/v1/complaints/<id>/images/` | Attach supplementary image evidence | Complaint Owner / Authority |
| `GET` | `/api/v1/complaints/<id>/timeline/` | Retrieve status transition audit history | Authenticated |

---

## 5. Authority Command & Workflow (`/api/v1/authority/`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/authority/dashboard/summary/` | Summary metrics: total, pending, resolved, SLA | Authority / Admin |
| `GET` | `/api/v1/authority/complaints/` | Department grievance queue with filters | Authority / Admin |
| `PATCH` | `/api/v1/authority/complaints/<id>/status/` | Transition state (`IN_PROGRESS`, `RESOLVED`, `REJECTED`) | Authority / Admin |
| `PATCH` | `/api/v1/authority/complaints/<id>/priority/` | Adjust complaint priority level | Authority / Admin |
| `POST` | `/api/v1/authority/complaints/<id>/resolve/` | Submit resolution proof image and notes | Authority / Admin |
| `GET` | `/api/v1/authority/analytics/stats/` | Department performance statistics | Authority / Admin |

---

## 6. AI Engine Endpoints (`/api/v1/ai/`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/predict-category/` | Classify text into civic category | Authenticated |
| `POST` | `/api/v1/ai/predict-priority/` | Predict urgency priority level | Authenticated |
| `POST` | `/api/v1/ai/route-department/` | Route grievance to responsible department | Authenticated |
| `POST` | `/api/v1/ai/triage/` | Combined automated triage (Category + Priority + Department) | Authenticated |

---

## 7. Citizen Feedback & Notifications

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/feedback/submit/` | Submit 1-5 star rating and feedback on resolved complaints | Citizen |
| `GET` | `/api/v1/notifications/` | Retrieve user notification inbox | Authenticated |
| `PATCH` | `/api/v1/notifications/<id>/read/` | Mark individual notification as read | Authenticated |
| `GET` | `/api/v1/notifications/unread-count/` | Count unread notifications | Authenticated |
| `GET` | `/api/v1/audit-logs/` | Query immutable audit logs | Super Admin |
