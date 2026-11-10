# Event Processing Guarantees

Gate 3 adds a local idempotent consumer foundation; no broker or external
consumer is implemented.

## Intended foundation

- Outbox writes will be atomic with the owning business transaction.
- A future publisher may provide at-least-once handoff after retry behavior is
  implemented and tested.
- Consumers record `(event_id, consumer_name)` and use idempotent handlers.
- Duplicate delivery must be safe; exactly-once processing is not claimed.
- Failed events require inspectable status, retry metadata and a future
  dead-letter policy.

## Current guarantee

Outbox events are persisted locally, but there is no broker or worker. Existing
notifications remain synchronous in-process behavior. No delivery guarantee is
claimed.

## Future transaction boundary

The business service, outbox insert and domain state update must share one
database transaction. Publishing must occur after commit and must never be
performed by model signals that can observe rolled-back state.

`EventConsumer.process()` runs the handler and processed-event marker in one
transaction. A handler failure rolls back the marker, allowing a later retry.
Successful duplicate deliveries return `False` without invoking the handler.
