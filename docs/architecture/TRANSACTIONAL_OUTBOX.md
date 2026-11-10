# Transactional Outbox Design

## Gate 2 status

The additive `OutboxEvent` model, migration and local management service are
implemented. No existing table or record is changed.

## Proposed record

`OutboxEvent` contains:

- Unique `event_id`
- `event_type` and `event_version`
- `source` and `aggregate_id`
- JSON `payload`
- `occurred_at`, `created_at`, `published_at`, `next_retry_at`
- Status: `PENDING`, `PROCESSING`, `PUBLISHED` or `FAILED`
- `retry_count` and safe `last_error`
- Optional correlation and idempotency keys

Indexes support pending/due events, aggregate lookup and event-version lookup.
Event IDs and idempotency keys are unique. `claim_pending()` locks selected rows
inside a transaction and marks them `PROCESSING`; a future worker must use a
database with row-lock semantics for multi-worker safety.

## Transaction rule

The owning service must call `OutboxService.record()` inside its existing
`transaction.atomic` block. If the business operation rolls back, the outbox
row must not exist. If the outbox insert fails, the business operation must
roll back.

## Migration risk assessment

The migration is additive and creates only the new outbox table and indexes.
The SQL was inspected before application, and the test runner applies it to a
fresh test database. No production connection was selected and no existing
table or record was altered or deleted.
