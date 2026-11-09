from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.complaints.models import ComplaintCategory, ComplaintPriority, ComplaintStatus
from apps.complaints.serializers import ComplaintDetailSerializer, ComplaintListSerializer
from apps.notifications.models import Notification, NotificationType


User = get_user_model()


# ---------------------------------------------------------------------------
# Dashboard Serializers
# ---------------------------------------------------------------------------


class DashboardSummarySerializer(serializers.Serializer):
    """Read-only aggregate dashboard data."""

    total_complaints = serializers.IntegerField()
    directly_assigned = serializers.IntegerField()
    today_new = serializers.IntegerField()
    urgent_active = serializers.IntegerField()
    pending = serializers.IntegerField()
    assigned = serializers.IntegerField(required=False, default=0)
    in_progress = serializers.IntegerField()
    resolved = serializers.IntegerField()
    rejected = serializers.IntegerField()
    closed = serializers.IntegerField()


# ---------------------------------------------------------------------------
# Authority Complaint Serializers
# ---------------------------------------------------------------------------


class AuthorityStatusUpdateSerializer(serializers.Serializer):
    """Authority status update with resolution remarks."""

    status = serializers.ChoiceField(choices=ComplaintStatus.choices)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class ResolutionNotesSerializer(serializers.Serializer):
    """Add/update resolution notes on a complaint."""

    notes = serializers.CharField(min_length=1)


class ResolutionImageUploadSerializer(serializers.Serializer):
    """Upload a resolution image."""

    image = serializers.ImageField()
    caption = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class PriorityUpdateSerializer(serializers.Serializer):
    """Update complaint priority."""

    priority = serializers.ChoiceField(choices=ComplaintPriority.choices)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class AuthorityComplaintFilterSerializer(serializers.Serializer):
    """Filter parameters for authority complaint list."""

    q = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=ComplaintStatus.choices, required=False)
    priority = serializers.ChoiceField(choices=ComplaintPriority.choices, required=False)
    category = serializers.ChoiceField(choices=ComplaintCategory.choices, required=False)


# ---------------------------------------------------------------------------
# Analytics Serializers
# ---------------------------------------------------------------------------


class StatusBreakdownItemSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class DailyTrendItemSerializer(serializers.Serializer):
    date = serializers.CharField()
    count = serializers.IntegerField()


class ComplaintStatsSerializer(serializers.Serializer):
    """Complaint statistics with status breakdown and trend data."""

    period_days = serializers.IntegerField()
    total_complaints = serializers.IntegerField()
    status_breakdown = serializers.DictField(child=StatusBreakdownItemSerializer())
    avg_resolution_hours = serializers.FloatField(allow_null=True)
    sla_compliance_rate = serializers.FloatField(default=100.0)
    daily_trend = DailyTrendItemSerializer(many=True)
    total_feedbacks = serializers.IntegerField(default=0)
    average_rating = serializers.FloatField(default=0.0)


class CategoryPerformanceItemSerializer(serializers.Serializer):
    """Per-category complaint breakdown."""
    category = serializers.CharField()
    category_display = serializers.CharField()
    total = serializers.IntegerField()
    resolved = serializers.IntegerField()
    pending = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    resolution_rate = serializers.FloatField()


class PriorityBreakdownItemSerializer(serializers.Serializer):
    priority = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class PriorityBreakdownSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    breakdown = PriorityBreakdownItemSerializer(many=True)



# ---------------------------------------------------------------------------
# Notification Serializers
# ---------------------------------------------------------------------------


class NotificationSerializer(serializers.ModelSerializer):
    """Read-only notification representation."""

    complaint_tracking_code = serializers.CharField(
        source="complaint.tracking_code", read_only=True, default=None
    )
    complaint_public_id = serializers.UUIDField(
        source="complaint.public_id", read_only=True, default=None
    )

    class Meta:
        model = Notification
        fields = (
            "public_id",
            "title",
            "message",
            "notification_type",
            "complaint_tracking_code",
            "complaint_public_id",
            "is_read",
            "created_at",
        )
        read_only_fields = fields


class MarkReadSerializer(serializers.Serializer):
    """Mark specific notifications as read."""

    notification_ids = serializers.ListField(
        child=serializers.UUIDField(), min_length=1
    )


class UnreadCountSerializer(serializers.Serializer):
    """Unread notification count response."""

    unread_count = serializers.IntegerField()
