from django.contrib import admin

from apps.complaint_history.models import ComplaintHistory
from apps.complaint_images.models import ComplaintImage
from apps.complaints.models import Complaint


class ComplaintImageInline(admin.TabularInline):
    model = ComplaintImage
    extra = 0
    readonly_fields = ("public_id", "uploaded_at")


class ComplaintHistoryInline(admin.TabularInline):
    model = ComplaintHistory
    extra = 0
    readonly_fields = ("public_id", "actor", "action", "old_status", "new_status", "remarks", "created_at")
    can_delete = False


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = (
        "tracking_code",
        "title",
        "status",
        "priority",
        "category",
        "citizen",
        "assigned_authority",
        "created_at",
    )
    list_filter = ("status", "priority", "category", "created_at")
    search_fields = ("tracking_code", "title", "description", "citizen__email", "location_address")
    readonly_fields = ("public_id", "tracking_code", "created_at", "updated_at", "resolved_at")
    ordering = ("-created_at",)
    inlines = [ComplaintImageInline, ComplaintHistoryInline]


@admin.register(ComplaintImage)
class ComplaintImageAdmin(admin.ModelAdmin):
    list_display = ("public_id", "complaint", "uploaded_at")
    search_fields = ("complaint__tracking_code", "caption")
    readonly_fields = ("public_id", "uploaded_at")


@admin.register(ComplaintHistory)
class ComplaintHistoryAdmin(admin.ModelAdmin):
    list_display = ("action", "complaint", "actor", "old_status", "new_status", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("complaint__tracking_code", "remarks", "actor__email")
    readonly_fields = ("public_id", "created_at")
