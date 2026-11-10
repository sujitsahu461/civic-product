# CivicSetu Domain Boundaries

Phase 1 establishes ownership inside the existing Django modular monolith. These
are code and data ownership boundaries, not independently deployed services.

| Domain | Owning Django app(s) | Owns |
|---|---|---|
| Identity | `accounts`, identity-related `users` code | User credentials, roles, JWT lifecycle, account status |
| Grievance | `complaints`, `complaint_history` | Complaint lifecycle, tracking, status transitions and timeline |
| Department & Routing | `departments`, `complaints/scoping.py` | Departments, officer assignments, visibility and routing |
| Triage | `complaints/services.py` | Deterministic category and priority evaluation |
| Media | `complaint_images`, upload portions of `complaints` | Evidence metadata and file validation |
| Notification | `notifications` | In-app notification creation, querying and read state |
| Feedback | `feedback` | Citizen ratings and resolution feedback |
| Reporting | `authority/services.py`, department analytics services | Aggregates and dashboard projections |
| Audit | `audit_logs` | Append-oriented security and activity records |

`authority` is an application-facing orchestration and reporting module. It may
coordinate Grievance, Notification and Audit operations, but it does not own
their models or business rules.

## Phase 1 decisions

- Notification operations now live in `apps.notifications.services`.
- `apps.authority.services.NotificationService` remains a compatibility alias,
  preserving existing imports while making Notification the owner.
- No database schema, API endpoint or response contract was changed.
- Existing direct model relationships remain documented until an approved
  contract/event migration replaces them.
