import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class NotificationType(models.TextChoices):
    COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED", _("Complaint Assigned")
    STATUS_CHANGED = "STATUS_CHANGED", _("Status Changed")
    NEW_COMPLAINT = "NEW_COMPLAINT", _("New Complaint")
    RESOLUTION_UPDATE = "RESOLUTION_UPDATE", _("Resolution Update")
    PRIORITY_CHANGED = "PRIORITY_CHANGED", _("Priority Changed")
    SYSTEM = "SYSTEM", _("System Notification")


class Notification(models.Model):
    """In-app notification delivered to a user."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    complaint = models.ForeignKey(
        "complaints.Complaint",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"], name="idx_notif_recipient_read"),
            models.Index(fields=["created_at"], name="idx_notif_created_at"),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient.email}"
