# Event Versioning

## Naming and envelope

Event names are past-tense domain facts in PascalCase. Every event has an
integer `event_version`; the envelope is version 1 for the initial design.

## Compatibility rules

- Additive payload fields are backward compatible.
- Removing or renaming fields requires a new event version.
- Changing field meaning, identifier semantics or classification requires a new
  version.
- Consumers must ignore unknown fields.
- Producers must not publish a new version until declared consumers support it.
- The event type and version are part of the idempotency key.

## Validation

Gate 1 defines the required fields and classifications. Gate 2 must implement
runtime envelope validation before writing an outbox record. Invalid events
must fail before persistence and must not be retried as delivery failures.

## Rollout

Use additive dual-read compatibility first. Publish one version at a time,
monitor consumer compatibility, and retain old consumers until all events of
the previous version are drained or explicitly replayed.
