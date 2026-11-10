# CivicSetu Database Ownership

Phase 1 does not split or migrate database tables. The current database remains
shared so existing transactions, API behavior and production data are
preserved.

| Logical owner | Current tables/models | Future ownership direction |
|---|---|---|
| Identity | `accounts_user` and related auth tables | Identity schema |
| Grievance | `complaints`, `complaint_history` | Grievance schema |
| Department & Routing | `departments`, `department_authorities` | Department schema |
| Media | `complaint_images`, `complaint_attachments` | Media schema/object metadata |
| Notification | `notifications` | Notification schema |
| Feedback | `feedback` | Feedback schema |
| Audit | `audit_logs` | Audit schema |

## Invariants

- No production database changes are part of Phase 1.
- Existing foreign keys and transaction boundaries remain intact.
- Public UUIDs are the intended future cross-domain identifiers.
- A future extraction must use an outbox and a reversible backfill before
  removing a cross-domain foreign key.
