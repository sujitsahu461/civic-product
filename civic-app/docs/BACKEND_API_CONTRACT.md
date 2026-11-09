# Verified CivicSetu API contract

Source: sibling backend `config/urls.py`, app `urls.py`, views, serializers, and `schema.yml`, inspected 2026-10-14. Source verification is complete for the routes below; live HTTP verification is blocked because no running backend URL/test account was available.

| Mobile capability | Django route | Contract evidence |
|---|---|---|
| Login | `POST /api/v1/auth/login/` | VERIFIED IN SOURCE: AllowAny; JSON email/password; returns user and access/refresh tokens |
| Registration | `POST /api/v1/auth/register/` | VERIFIED IN SOURCE: AllowAny; email, password, full_name, optional phone, role; returns tokens |
| Session | `GET /api/v1/auth/me/` | VERIFIED IN SOURCE: JWT-protected user profile |
| Refresh | `POST /api/v1/auth/refresh/` | VERIFIED IN SOURCE: accepts refresh token and returns a token pair |
| Logout | `POST /api/v1/auth/logout/` | VERIFIED IN SOURCE: JWT-protected; accepts refresh and blacklists it |
| Complaints | `GET /api/v1/complaints/` | VERIFIED IN SOURCE: JWT + active user; paginated and role-scoped |
| Complaint detail | `GET /api/v1/complaints/{public_id}/` | VERIFIED IN SOURCE: JWT + ownership/authority/admin permission |
| Create complaint | `POST /api/v1/complaints/create/` | VERIFIED IN SOURCE: AllowAny; title, description, optional category/priority/address/coordinates; multipart `images` supported |
| Public tracking | `GET /api/v1/complaints/track/{tracking_code}/` | VERIFIED IN SOURCE: public tracking serializer; live behavior untested |
| Timeline | `GET /api/v1/complaints/{public_id}/timeline/` | VERIFIED IN SOURCE: JWT + ownership/authority/admin permission |
| Notifications | `GET /api/v1/notifications/` | VERIFIED IN SOURCE: returns `{unread_count, notifications}` for authenticated user |
| Mark read | `POST /api/v1/notifications/{public_id}/mark-read/` | VERIFIED IN SOURCE: recipient-scoped authenticated update |
| Profile | `GET /api/v1/users/profile/citizen/` and `PATCH /api/v1/users/profile/update/` | VERIFIED IN SOURCE: citizen read endpoint and writable fields `full_name`, `phone`, `bio`, `address` |

The mobile client must use the backend's canonical `public_id`, `tracking_code`, status, and timestamps. It must not create authoritative local complaint records or connect to PostgreSQL directly.

Live verification status: BLOCKED pending a reachable non-production Django server and test credentials. No mobile flow treats a failed request as success.
