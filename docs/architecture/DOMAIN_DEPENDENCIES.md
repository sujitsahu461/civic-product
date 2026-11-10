# CivicSetu Domain Dependencies

## Current dependency direction

```text
Identity ───────────────┐
Department & Routing ───┼──► Grievance
Triage ─────────────────┘       │
                                ├──► Media
                                ├──► Notification
                                ├──► Feedback
                                └──► Reporting
All user-facing workflows ─────────► Audit
```

The diagram describes logical ownership, while the current monolith still uses
some direct Django foreign keys and imports.

## Reduced coupling in Phase 1

- Notification persistence and read-state operations were moved from
  `apps.authority.services` to `apps.notifications.services`.
- Authority views now import the Notification service from its owning domain.
- Complaint creation and feedback submission now call the owning Notification
  service instead of constructing Notification records directly.
- Backend notification views and authority notification serialization now use
  Notification-domain interfaces and serializers.
- The old authority import remains an alias for compatibility and is covered by
  a boundary test.

## Explicitly unresolved dependencies

1. `ComplaintHistory` has a foreign key to `Complaint`; timeline extraction
   requires an identifier-based contract and a data migration, so it remains
   unchanged in Phase 1.
2. `Feedback` has a one-to-one foreign key to `Complaint`; feedback validation
   currently needs complaint state and must be replaced with a Grievance
   interface before extraction.
3. `Notification` references both users and complaints; these relationships
   will eventually become stable identifiers/events.
4. Authority analytics query Grievance tables directly; this is reporting
   coupling and should move to a projection/read-model boundary later.
5. Account, user, department and complaint workflows call the Audit service
   synchronously. Audit remains a local interface until an outbox is approved.
