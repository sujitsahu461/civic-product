import uuid

from django.db import models

from apps.complaints.models import Complaint


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
