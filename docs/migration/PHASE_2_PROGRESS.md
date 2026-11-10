# Phase 2 Progress: Gate 3 Workflow Integration

## Status

Gate 1 and Gate 2 are complete. Gate 3 workflow integration and idempotency
foundations are implemented for review. The only schema additions are the
`outbox_events` and `processed_events` tables; existing tables and records were
not modified.

## Completed

- Verified the current baseline: `python manage.py test` — **205 tests passed**
  in 203.542 seconds.
- Documented existing integer primary keys, public UUIDs, tracking identifiers
  and cross-domain references.
- Defined UUID-based versioned service contract rules.
- Catalogued the initial domain events and payload classifications.
- Defined event compatibility and rollout rules.
- Defined transactional outbox and future idempotent-consumer boundaries.
- Added `OutboxEvent`, `OutboxService` and a local publisher interface.
- Added transaction, duplicate, validation, retry and claim tests.
- Inspected the migration SQL before test-database application.
- Applied `core.0001_outboxevent` and `core.0002_processedevent` locally after
  inspecting their generated SQL.
- Integrated ComplaintCreated, ComplaintAssigned, ComplaintStatusChanged,
  ComplaintResolved, ComplaintRejected, FeedbackSubmitted and
  NotificationRequested into existing service transactions.
- Added `ProcessedEvent` and `EventConsumer` for idempotent local processing;
  failed handlers roll back their marker and successful duplicates are skipped.
- Propagated one correlation ID through each integrated workflow and its
  synchronous notification requests.

## Not implemented in Gate 3

- No broker or external publisher.
- No external consumer, dead-letter worker or retry runner.
- No event delivery guarantee is claimed until a publisher is connected.

## Verification

- `python manage.py test apps.core.tests apps.core.tests_integration` —
  **14 tests passed**.
- `python manage.py test` — **219 tests passed**.
- `python manage.py check` — **0 issues**.
- `python manage.py makemigrations --check --dry-run` — **no changes detected**.
- `python -m compileall -q apps infrastructure` — **passed**.
- `python manage.py sqlmigrate core 0001` and `core 0002` — inspected before
  application.
- `python manage.py makemigrations --check --dry-run` — no changes detected
  after Gate 3 implementation.
- PostgreSQL-backed verification was attempted with
  `config.settings.test_postgres`, but the installed `psycopg2` native
  extension was blocked by the Windows Application Control policy. No
  PostgreSQL test result is claimed from this environment.

## Gate decision

Gate 3 implementation is complete and ready for review. Workflow integration
does not claim external delivery guarantees; Gate 4 verification remains
required and must be approved separately.

Gate 4 local verification is complete for SQLite: regression, compilation,
system checks, migration consistency, event contracts, rollback behavior and
idempotent processing passed. PostgreSQL parity remains an environment-blocked
verification item and must be rerun where the configured PostgreSQL driver can
load.
