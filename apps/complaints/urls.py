from django.urls import path

from apps.complaints.views import (
    ComplaintAssignView,
    ComplaintCreateView,
    ComplaintDetailView,
    ComplaintImageUploadView,
    ComplaintListView,
    ComplaintStatusUpdateView,
    ComplaintTimelineView,
    ComplaintTrackingView,
)


urlpatterns = [
    path("", ComplaintListView.as_view(), name="complaint-list"),
    path("create/", ComplaintCreateView.as_view(), name="complaint-create"),
    path("track/<str:tracking_code>/", ComplaintTrackingView.as_view(), name="complaint-track"),
    path("<uuid:public_id>/", ComplaintDetailView.as_view(), name="complaint-detail"),
    path("<uuid:public_id>/status/", ComplaintStatusUpdateView.as_view(), name="complaint-status-update"),
    path("<uuid:public_id>/assign/", ComplaintAssignView.as_view(), name="complaint-assign"),
    path("<uuid:public_id>/images/", ComplaintImageUploadView.as_view(), name="complaint-image-upload"),
    path("<uuid:public_id>/timeline/", ComplaintTimelineView.as_view(), name="complaint-timeline"),
]
