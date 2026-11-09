import random
import string
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class ComplaintStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    ASSIGNED = "ASSIGNED", _("Assigned")
    IN_PROGRESS = "IN_PROGRESS", _("In Progress")
    RESOLVED = "RESOLVED", _("Resolved")
    REJECTED = "REJECTED", _("Rejected")
    CLOSED = "CLOSED", _("Closed")


class ComplaintPriority(models.TextChoices):
    LOW = "LOW", _("Low")
    MEDIUM = "MEDIUM", _("Medium")
    HIGH = "HIGH", _("High")
    URGENT = "URGENT", _("Urgent")


class ComplaintCategory(models.TextChoices):
    ROAD = "ROAD", _("Road & Infrastructure")
    WATER = "WATER", _("Water Supply")
    ELECTRICITY = "ELECTRICITY", _("Electricity")
    GARBAGE = "GARBAGE", _("Garbage & Waste")
    DRAINAGE = "DRAINAGE", _("Drainage & Sewage")
    SANITATION = "SANITATION", _("Sanitation & Hygiene")
    STREET_LIGHT = "STREET_LIGHT", _("Street Light")
    PARKS = "PARKS", _("Parks & Public Spaces")
    NOISE = "NOISE", _("Noise Pollution")
    OTHER = "OTHER", _("Other")


def generate_tracking_code():
    """Generates a human-readable tracking code format: CMP-YYYYMMDD-XXXX with collision check."""
    date_str = timezone.now().strftime("%Y%m%d")
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):
        random_str = "".join(random.choices(chars, k=4))
        candidate = f"CMP-{date_str}-{random_str}"
        if not Complaint.objects.filter(tracking_code=candidate).exists():
            return candidate
    # Fallback in extreme collision scenario
    return f"CMP-{date_str}-{''.join(random.choices(chars, k=6))}"


class Complaint(models.Model):
    """Core civic complaint model."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    tracking_code = models.CharField(
        max_length=30, unique=True, editable=False, default=generate_tracking_code
    )
    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints",
    )
    category = models.CharField(
        max_length=20,
        choices=ComplaintCategory.choices,
        default=ComplaintCategory.OTHER,
    )
    assigned_authority = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_complaints",
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=ComplaintStatus.choices,
        default=ComplaintStatus.PENDING,
    )
    priority = models.CharField(
        max_length=20,
        choices=ComplaintPriority.choices,
        default=ComplaintPriority.MEDIUM,
    )
    location_address = models.CharField(max_length=255)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=8, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=11, decimal_places=8, null=True, blank=True
    )
    resolution_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "complaints"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"], name="idx_complaint_status"),
            models.Index(fields=["priority"], name="idx_complaint_priority"),
            models.Index(fields=["tracking_code"], name="idx_complaint_tracking"),
            models.Index(fields=["created_at"], name="idx_complaint_created_at"),
            models.Index(fields=["category"], name="idx_complaint_category"),
        ]

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            self.tracking_code = generate_tracking_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tracking_code} - {self.title} ({self.status})"
