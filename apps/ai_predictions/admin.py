from django.contrib import admin

from apps.ai_predictions.models import AIPredictionLog


@admin.register(AIPredictionLog)
class AIPredictionLogAdmin(admin.ModelAdmin):
    list_display = (
        "public_id",
        "predicted_category",
        "predicted_priority",
        "urgency_score",
        "confidence_score",
        "sentiment",
        "created_at",
    )
    list_filter = ("predicted_category", "predicted_priority", "sentiment", "created_at")
    search_fields = ("complaint__tracking_code", "detected_keywords")
    readonly_fields = ("public_id", "created_at")
