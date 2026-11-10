from rest_framework import serializers
from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    complaint_tracking_code = serializers.CharField(
        source="complaint.tracking_code", read_only=True, default=None
    )
    complaint_title = serializers.CharField(
        source="complaint.title", read_only=True, default=None
    )

    class Meta:
        model = Notification
        fields = (
            "public_id",
            "title",
            "message",
            "notification_type",
            "complaint",
            "complaint_tracking_code",
            "complaint_title",
            "is_read",
            "created_at",
        )
        read_only_fields = fields


class AuthorityNotificationSerializer(serializers.ModelSerializer):
    """Notification representation used by the authority dashboard."""

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
