from django.urls import path

from apps.ai_predictions.views import (
    AICityInsightsView,
    AIDuplicateDetectionView,
    AITriageClassifyView,
    ComplaintAIPredictionView,
)

app_name = "ai_predictions"

urlpatterns = [
    path("classify/", AITriageClassifyView.as_view(), name="ai-classify"),
    path("detect-duplicates/", AIDuplicateDetectionView.as_view(), name="ai-detect-duplicates"),
    path("city-insights/", AICityInsightsView.as_view(), name="ai-city-insights"),
    path("complaint/<uuid:complaint_public_id>/prediction/", ComplaintAIPredictionView.as_view(), name="complaint-ai-prediction"),
]
