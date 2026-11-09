from django.urls import path

from apps.audit_logs.views import (
    AuditLogDetailView,
    AuditLogListView,
    AuditLogSummaryView,
)

app_name = "audit_logs"

urlpatterns = [
    path("", AuditLogListView.as_view(), name="audit-logs-list"),
    path("summary/", AuditLogSummaryView.as_view(), name="audit-logs-summary"),
    path("<uuid:public_id>/", AuditLogDetailView.as_view(), name="audit-logs-detail"),
]
