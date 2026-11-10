# Service Contracts

## Contract rules

- Contracts describe logical domain interfaces inside the current monolith.
- Version 1 is additive and uses UUID strings for cross-domain identifiers.
- Domain services own validation and authorization decisions.
- Consumers receive stable result objects or typed domain errors; ORM models
  must not be required by future external consumers.
- Existing `/api/v1/` endpoints remain unchanged during Phase 2.

## Contract matrix

| Domain | Public operations | Inputs | Outputs | Authorization |
|---|---|---|---|---|
| Identity | Register, authenticate, refresh, revoke, update profile | Email, password, role-safe profile fields, refresh token | User UUID, role, status, tokens only at auth boundary | Public registration is citizen-only; account owner/admin rules |
| Grievance | Create, track, assign, transition status, list timeline | Complaint UUID/tracking code, category, priority, location, actor UUID, remarks | Complaint UUID, tracking code, status, priority, timeline summary | Citizen ownership; department-scoped authority; admin override |
| Department & Routing | Create/update department, assign officer, resolve category routing | Department UUID, user UUID, category/routing data | Department UUID, active state, assignment result | Super admin; routing reads are scoped |
| Triage | Evaluate category and priority | Title, description, requested category/priority | Category, priority, rule version | Internal workflow only |
| Media | Validate/upload/list evidence | Complaint UUID, uploader UUID, metadata and file handle | Media UUID, type, metadata, access state | Complaint owner or authorized officer/admin |
| Notification | Create, list, count unread, mark read | Recipient UUID, complaint UUID, message type/content | Notification UUID, read state, timestamps | Recipient read access; internal creation |
| Feedback | Submit and calculate metrics | Complaint UUID, citizen UUID, ratings and comments | Feedback UUID, rating summary | Complaint owner after resolution; admin/reporting reads |
| Reporting | Build dashboard aggregates and exports | Scope, department, date range | Versioned aggregate/report result | Department scope or admin |
| Audit | Record and query audit events | Actor UUID, action, entity type/UUID, safe metadata | Audit UUID and query results | Write from authorized workflows; admin reads |

## Error contract

Internal service contracts should use explicit categories: `validation_error`,
`authorization_error`, `not_found`, `conflict`, `transient_failure` and
`permanent_failure`. Error details must not include credentials, tokens,
private evidence URLs or raw database exceptions.
