from django.urls import path

from apps.feedback.views import (
    AuthorityFeedbackListView,
    AuthorityFeedbackStatsView,
    CitizenFeedbackListView,
    ComplaintFeedbackDetailView,
    DepartmentFeedbackStatsView,
    SubmitFeedbackView,
)

app_name = "feedback"

urlpatterns = [
    path("submit/", SubmitFeedbackView.as_view(), name="feedback-submit"),
    path("my-feedbacks/", CitizenFeedbackListView.as_view(), name="citizen-feedbacks"),
    path("complaint/<uuid:complaint_public_id>/", ComplaintFeedbackDetailView.as_view(), name="complaint-feedback"),
    path("department/<str:category>/stats/", DepartmentFeedbackStatsView.as_view(), name="department-feedback-stats"),
    path("authority/stats/", AuthorityFeedbackStatsView.as_view(), name="authority-feedback-stats"),
    path("authority/feedbacks/", AuthorityFeedbackListView.as_view(), name="authority-feedback-list"),
]
