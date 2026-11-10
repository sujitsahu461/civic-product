# Phase 1 Progress: Modular Architecture Enforcement

## Status

Phase 1 is implemented within the existing Django monolith. No microservice
project, schema migration or API change was introduced.

## Completed

- Verified the current Django baseline before changes.
- Defined ownership for the nine target domains.
- Moved notification service implementation to the `notifications` domain.
- Preserved `apps.authority.services.NotificationService` as a compatibility
  alias.
- Routed backend notification listing and mark-as-read operations through the
  Notification service while preserving their existing response formats.
- Moved the authority dashboard notification serializer into the Notification
  domain.
- Added notification database-failure, workflow-failure, API, read-state and
  compatibility boundary tests.
- Documented domain boundaries, dependencies and database ownership.

## Not included

- No service extraction.
- No Docker/Azure infrastructure.
- No message broker, outbox or event bus.
- No database decomposition or migration.
- No API/BFF changes.
- No deletion of duplicate directories.

## Remaining risks

- Cross-domain foreign keys still exist between Complaint, Feedback, History,
  Media, Notification and User models.
- Authority reporting still reads Grievance models directly.
- Audit calls remain synchronous and implementation-coupled.
- The repository contains duplicate/legacy directory layouts whose usage has
  not been proven; they were not deleted.

## Verification

- Baseline: `python manage.py test` — **198 tests passed** in 221.417 seconds.
- Affected domains: `python manage.py test apps.notifications apps.authority
  apps.complaints apps.feedback` — **99 tests passed** in 118.081 seconds.
- Final regression: `python manage.py test` — **205 tests passed** in
  215.535 seconds.
- Python compilation: `python -m compileall -q apps` — **passed**.

The increase from 198 to 205 includes the new ownership, API and failure-path
tests.

## Closure status

Phase 1 is **closed** within the modular monolith. No schema, production
database, API endpoint or response contract was changed. Phase 2 and service
extraction remain out of scope and require explicit approval.
