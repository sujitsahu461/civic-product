import uuid

from django.conf import settings
from django.db import models

from apps.complaints.models import Complaint


class AttachmentType(models.TextChoices):
    IMAGE = "IMAGE", "Image"
    AUDIO = "AUDIO", "Audio Recording"
    VIDEO = "VIDEO", "Video Evidence"


class ComplaintImage(models.Model):
    """Image attachment associated with a civic complaint."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="complaint_images/%Y/%m/")
    caption = models.CharField(max_length=255, blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "complaint_images"
        ordering = ["uploaded_at"]
        indexes = [
            models.Index(fields=["complaint", "uploaded_at"], name="idx_cmp_img_complaint"),
        ]

    def __str__(self):
        return f"Image for {self.complaint.tracking_code} ({self.public_id})"


class ComplaintAttachment(models.Model):
    """Multimodal attachment (image, audio recording, video) for civic complaints."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="complaint_attachments/%Y/%m/")
    attachment_type = models.CharField(
        max_length=10,
        choices=AttachmentType.choices,
        default=AttachmentType.IMAGE,
    )
    original_filename = models.CharField(max_length=255, blank=True, default="")
    content_type = models.CharField(max_length=100, blank=True, default="")
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    caption = models.CharField(max_length=255, blank=True, default="")
    duration_seconds = models.FloatField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_complaint_attachments",
    )

    class Meta:
        db_table = "complaint_attachments"
        ordering = ["uploaded_at"]
        indexes = [
            models.Index(fields=["complaint", "uploaded_at"], name="idx_cmp_att_complaint"),
            models.Index(fields=["attachment_type"], name="idx_cmp_att_type"),
        ]

    def __str__(self):
        return f"{self.attachment_type} attachment for {self.complaint.tracking_code} ({self.public_id})"
