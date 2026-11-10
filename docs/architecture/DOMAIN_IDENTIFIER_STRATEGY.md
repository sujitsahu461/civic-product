# Domain Identifier Strategy

## Gate 1 status

This is a design document only. No model, migration, database, API or
production-data changes are included in Gate 1.

## Rules

1. Preserve existing integer primary keys and Django foreign keys.
2. Use existing `public_id` UUIDs as stable identifiers in future service
   contracts and events.
3. Use `tracking_code` only as the human-facing Complaint lookup identifier.
4. Never expose passwords, JWTs, reset tokens or private file paths in events.
5. New cross-domain contracts use UUID strings, not database integer IDs.
6. Every event aggregate identifier is the owning domain object's public UUID.

## Inventory

| Domain | Model/table | Internal primary key | Stable public identifier | Cross-domain references |
|---|---|---|---|---|
| Identity | `User` / `users` | Integer Django PK | `public_id` UUID | Complaint, DepartmentAuthority, Notification, Feedback, AuditLog, Media uploader |
| Grievance | `Complaint` / `complaints` | Integer Django PK | `public_id` UUID; `tracking_code` human lookup | User citizen/assignee, History, Media, Notification, Feedback |
| Grievance | `ComplaintHistory` / `complaint_history` | Integer Django PK | `public_id` UUID | Complaint, User actor |
| Department & Routing | `Department` / `departments` | Integer Django PK | `public_id` UUID; slug human/config key | DepartmentAuthority, routing/scoping |
| Department & Routing | `DepartmentAuthority` / `department_authorities` | Integer Django PK | No public UUID currently | Department, User |
| Media | `ComplaintImage` / `complaint_images` | Integer Django PK | `public_id` UUID | Complaint |
| Media | `ComplaintAttachment` / `complaint_attachments` | Integer Django PK | `public_id` UUID | Complaint, User uploader |
| Notification | `Notification` / `notifications` | Integer Django PK | `public_id` UUID | User recipient, Complaint |
| Feedback | `Feedback` / `feedback` | Integer Django PK | `public_id` UUID | Complaint, User citizen |
| Audit | `AuditLog` / `audit_logs` | Integer Django PK | `public_id` UUID | User actor; generic entity ID |
| Triage | No separate model | N/A | Complaint `public_id` is aggregate reference | Complaint category/priority |
| Reporting | No separate model | N/A | Source aggregate UUIDs | Reads Grievance/Feedback data |

## Migration strategy and risks

Before any database change, inspect the generated migration and obtain
approval. A future non-destructive migration may add a UUID to
`DepartmentAuthority`, backfill it, validate uniqueness, and only then use it
in contracts. Existing integer keys and foreign keys must remain during a
dual-read/dual-write period.

Main risks are incomplete backfills, duplicate identifiers, stale event
references and accidental API serialization changes. Rollback is to stop
contract publication and retain the existing integer-backed schema; no
existing column should be removed until consumers and backfills are verified.
