# Domain Event Catalogue

## Common envelope

```json
{
  "event_id": "uuid",
  "event_type": "ComplaintCreated",
  "event_version": 1,
  "occurred_at": "2026-11-09T12:00:00Z",
  "source": "grievance",
  "aggregate_id": "uuid",
  "correlation_id": "uuid",
  "payload": {}
}
```

`event_id`, `aggregate_id` and `correlation_id` are UUID strings. `payload`
contains only data needed by declared consumers.

## Catalogue

| Event | Owner | Aggregate | Initial consumers | Payload classification |
|---|---|---|---|---|
| UserRegistered | Identity | User UUID | Audit, Reporting | Restricted: role/status; no credentials |
| UserProfileUpdated | Identity | User UUID | Audit | Restricted: changed field names, not secrets |
| UserRoleChanged | Identity | User UUID | Audit, Reporting | Restricted |
| ComplaintCreated | Grievance | Complaint UUID | Notification, Audit, Reporting | Internal: category/status/priority/location summary |
| ComplaintAssigned | Grievance | Complaint UUID | Notification, Audit, Reporting | Internal: assignee UUID, department UUID |
| ComplaintStatusChanged | Grievance | Complaint UUID | Notification, Audit, Reporting | Internal: old/new status and safe remarks |
| ComplaintResolved | Grievance | Complaint UUID | Notification, Feedback, Audit, Reporting | Internal |
| ComplaintRejected | Grievance | Complaint UUID | Notification, Audit, Reporting | Internal: safe rejection reason |
| DepartmentCreated | Department | Department UUID | Audit, Reporting | Internal: name/config, no secrets |
| DepartmentUpdated | Department | Department UUID | Audit, Reporting | Internal |
| RoutingRuleChanged | Department | Department UUID | Triage, Grievance, Audit | Internal configuration |
| ComplaintCategorized | Triage | Complaint UUID | Grievance, Reporting | Internal |
| ComplaintPriorityChanged | Triage | Complaint UUID | Grievance, Notification, Audit | Internal |
| EvidenceUploaded | Media | Media UUID | Grievance, Notification, Audit | Restricted: metadata only |
| EvidenceDeleted | Media | Media UUID | Grievance, Audit | Restricted: metadata only |
| NotificationRequested | Notification | Notification UUID | Notification delivery adapter | Restricted: recipient UUID and template data |
| NotificationCreated | Notification | Notification UUID | Audit, Reporting | Restricted |
| NotificationDeliveryFailed | Notification | Notification UUID | Audit, Reporting | Restricted: safe error category |
| FeedbackSubmitted | Feedback | Feedback UUID | Notification, Audit, Reporting | Internal: rating and safe comment metadata |
| FeedbackUpdated | Feedback | Feedback UUID | Notification, Audit, Reporting | Internal |
| AuditEventRecorded | Audit | Audit UUID | Reporting/retention tooling | Restricted |
| ReportGenerationRequested | Reporting | Report request UUID | Reporting worker | Internal |
| ReportGenerationCompleted | Reporting | Report request UUID | Audit, requester | Internal: result metadata only |

No event includes passwords, JWTs, reset tokens, raw private evidence URLs or
unnecessary personal data.
