import logging

from django.db import transaction

from apps.notifications.models import Notification
from infrastructure.events.outbox import OutboxService
from infrastructure.events.schema import build_event


logger = logging.getLogger(__name__)


class NotificationService:
    """Owns notification creation and read-state operations."""

    @staticmethod
    @transaction.atomic
    def create_notification(
        recipient,
        title,
        message,
        notification_type,
        complaint=None,
        correlation_id=None,
    ):
        notification = Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            complaint=complaint,
        )
        OutboxService.record(
            build_event(
                event_type="NotificationRequested",
                source="notification",
                aggregate_id=notification.public_id,
                correlation_id=correlation_id,
                payload={
                    "notification_id": str(notification.public_id),
                    "recipient_id": str(recipient.public_id),
                    "title": title,
                    "message": message,
                    "notification_type": notification.notification_type,
                    "complaint_id": str(complaint.public_id) if complaint else None,
                },
            )
        )
        logger.info("Notification sent to %s: %s", recipient.email, title)
        return notification

    @staticmethod
    def get_notifications(user, is_read=None):
        queryset = Notification.objects.filter(
            recipient=user
        ).select_related("complaint")
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read)
        return queryset.order_by("-created_at")

    @staticmethod
    def notification_exists(public_id, user):
        return Notification.objects.filter(
            public_id=public_id,
            recipient=user,
        ).exists()

    @staticmethod
    def mark_as_read(notification_ids, user):
        return Notification.objects.filter(
            public_id__in=notification_ids,
            recipient=user,
            is_read=False,
        ).update(is_read=True)

    @staticmethod
    def mark_all_read(user):
        return Notification.objects.filter(
            recipient=user,
            is_read=False,
        ).update(is_read=True)

    @staticmethod
    def get_unread_count(user):
        return Notification.objects.filter(
            recipient=user,
            is_read=False,
        ).count()
