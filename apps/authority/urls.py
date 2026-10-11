from django.urls import path

from apps.authority.views import (
    AuthorityComplaintDetailView,
    AuthorityComplaintListView,
    AuthorityComplaintStatsView,
    AuthorityDashboardRecentView,
    AuthorityDashboardSummaryView,
    AuthorityDepartmentPerformanceView,
    AuthorityPriorityBreakdownView,
    AuthorityPriorityUpdateView,
    AuthorityResolutionImageView,
    AuthorityResolutionNotesView,
    AuthorityStatusUpdateView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
)


urlpatterns = [
    # Dashboard
    path("dashboard/summary/", AuthorityDashboardSummaryView.as_view(), name="authority-dashboard-summary"),
    path("dashboard/recent/", AuthorityDashboardRecentView.as_view(), name="authority-dashboard-recent"),
    # Complaint management
    path("complaints/", AuthorityComplaintListView.as_view(), name="authority-complaint-list"),
    path("complaints/<uuid:public_id>/", AuthorityComplaintDetailView.as_view(), name="authority-complaint-detail"),
    path("complaints/<uuid:public_id>/status/", AuthorityStatusUpdateView.as_view(), name="authority-complaint-status"),
    path("complaints/<uuid:public_id>/notes/", AuthorityResolutionNotesView.as_view(), name="authority-complaint-notes"),
    path("complaints/<uuid:public_id>/resolution-image/", AuthorityResolutionImageView.as_view(), name="authority-complaint-resolution-image"),
    path("complaints/<uuid:public_id>/priority/", AuthorityPriorityUpdateView.as_view(), name="authority-complaint-priority"),
    # Analytics
    path("analytics/stats/", AuthorityComplaintStatsView.as_view(), name="authority-analytics-stats"),
    path("analytics/department/", AuthorityDepartmentPerformanceView.as_view(), name="authority-analytics-department"),
    path("analytics/priority/", AuthorityPriorityBreakdownView.as_view(), name="authority-analytics-priority"),
    # Notifications
    path("notifications/", NotificationListView.as_view(), name="authority-notification-list"),
    path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="authority-notification-unread-count"),
    path("notifications/mark-read/", NotificationMarkReadView.as_view(), name="authority-notification-mark-read"),
    path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view(), name="authority-notification-mark-all-read"),
]
