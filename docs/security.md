# CivicSetu — Security Architecture & Guidelines

## 1. Security Overview

CivicSetu incorporates defense-in-depth security principles across authentication, authorization, data validation, audit logging, and asset protection.

---

## 2. Authentication & JWT Security

- **JWT Engine**: Implemented via `djangorestframework-simplejwt`.
- **Token Lifespans**:
  - Access Token: 15 minutes (short-lived to minimize exposure).
  - Refresh Token: 7 days.
- **Token Revocation**:
  - Logout operations send the refresh token to `/api/v1/auth/token/blacklist/` which stores token JTIs in `OutstandingToken` / `BlacklistedToken` tables.
  - Blacklisted tokens are rejected across all subsequent authentication checks.
- **Password Hashing**: Django's PBKDF2 with SHA-256 password hasher with automated salt generation.

---

## 3. Role-Based Access Control (RBAC)

Custom permission classes enforce strict boundary isolation:
- `IsCitizen`: Restricts complaint creation and citizen-specific actions to verified citizen accounts.
- `IsAuthorityUser`: Limits authority command endpoints, resolution tools, and status updates to assigned municipal authority accounts.
- `IsSuperAdminUser`: Protects administrative user management, department creation, authority assignments, and security audit logs.
- **Department Isolation**: Authority users are strictly scoped to grievances filed under their designated department. Cross-department modifications are forbidden.

---

## 4. Input Validation & File Upload Security

- **File Type Restrictions**: Image uploads (complaint evidence and resolution proofs) validate MIME types and file extensions, accepting only `JPEG`, `PNG`, and `WebP`.
- **File Size Caps**: Uploads are restricted to a maximum of 5MB per file to mitigate denial-of-service risks.
- **Media Execution Prevention**: Uploaded media are stored in segregated directories with direct script execution disabled.

---

## 5. Audit Logging & Non-Repudiation

The `apps/audit_logs/` module records critical operational events:
- Authentication events (successful logins, logouts, failed login attempts).
- Complaint state machine transitions (status changes, reassignments, priority changes).
- Administrative modifications (user role alterations, department updates).
- All audit log entries capture actor identity, IP address, timestamp, action type, target model, and detailed change metadata.

---

## 6. Secret Management Best Practices

- **Never commit `.env` files**: All secrets (database credentials, Django `SECRET_KEY`, SMTP passwords) must be injected through environment variables or secure vault solutions.
- **Rotate Exposed Credentials**: In the event that a secret is inadvertently committed or exposed, rotate the credential immediately on the respective server and invalidate active sessions.
- **SSL / TLS Termination**: In production, HTTPS enforcement is mandatory with `SECURE_SSL_REDIRECT = True`, `SESSION_COOKIE_SECURE = True`, and `CSRF_COOKIE_SECURE = True`.
