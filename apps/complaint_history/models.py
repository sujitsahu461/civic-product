import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.complaints.models import Complaint


class HistoryAction(models.TextChoices):
    CREATED = "CREATED", _("Complaint Created")
    ASSIGNED = "ASSIGNED", _("Authority Assigned")
    STATUS_CHANGED = "STATUS_CHANGED", _("Status Changed")
    IMAGE_ADDED = "IMAGE_ADDED", _("Image Added")
    REOPENED = "REOPENED", _("Complaint Reopened")
    RESOLVED = "RESOLVED", _("Complaint Resolved")
    REJECTED = "REJECTED", _("Complaint Rejected")
    NOTE_ADDED = "NOTE_ADDED", _("Note Added")


class ComplaintHistory(models.Model):
    """Audit trail / timeline log for complaint updates and lifecycle transitions."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="history",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaint_actions",
    )
    action = models.CharField(
        max_length=30,
        choices=HistoryAction.choices,
        default=HistoryAction.CREATED,
    )
    old_status = models.CharField(max_length=30, blank=True, default="")
    new_status = models.CharField(max_length=30, blank=True, default="")
    remarks = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "complaint_history"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["complaint", "created_at"], name="idx_cmp_hist_complaint"),
        ]

    def __str__(self):
        return f"{self.action} on {self.complaint.tracking_code} at {self.created_at}"
