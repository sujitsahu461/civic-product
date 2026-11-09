from django.contrib import admin

from apps.feedback.models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = (
        "public_id",
        "complaint",
        "citizen",
        "rating",
        "satisfaction_level",
        "is_issue_resolved",
        "created_at",
    )
    list_filter = ("rating", "satisfaction_level", "is_issue_resolved", "created_at")
    search_fields = ("complaint__tracking_code", "citizen__email", "comments")
    readonly_fields = ("public_id", "created_at", "updated_at")
