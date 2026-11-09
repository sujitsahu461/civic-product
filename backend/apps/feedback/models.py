import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.complaints.models import Complaint


class SatisfactionLevel(models.TextChoices):
    VERY_UNSATISFIED = "VERY_UNSATISFIED", _("Very Unsatisfied")
    UNSATISFIED = "UNSATISFIED", _("Unsatisfied")
    NEUTRAL = "NEUTRAL", _("Neutral")
    SATISFIED = "SATISFIED", _("Satisfied")
    VERY_SATISFIED = "VERY_SATISFIED", _("Very Satisfied")


class ResolutionQuality(models.TextChoices):
    POOR = "POOR", _("Poor")
    FAIR = "FAIR", _("Fair")
    GOOD = "GOOD", _("Good")
    EXCELLENT = "EXCELLENT", _("Excellent")


class TimelinessRating(models.TextChoices):
    DELAYED = "DELAYED", _("Delayed")
    ON_TIME = "ON_TIME", _("On Time")
    QUICK = "QUICK", _("Faster than expected")


class Feedback(models.Model):
    """Citizen rating and feedback submitted upon complaint resolution."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    complaint = models.OneToOneField(
        Complaint,
        on_delete=models.CASCADE,
        related_name="feedback",
    )
    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_feedbacks",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text=_("Rating score between 1 (worst) and 5 (best)"),
    )
    satisfaction_level = models.CharField(
        max_length=20,
        choices=SatisfactionLevel.choices,
        default=SatisfactionLevel.SATISFIED,
    )
    resolution_quality = models.CharField(
        max_length=20,
        choices=ResolutionQuality.choices,
        default=ResolutionQuality.GOOD,
    )
    timeliness = models.CharField(
        max_length=20,
        choices=TimelinessRating.choices,
        default=TimelinessRating.ON_TIME,
    )
    comments = models.TextField(blank=True, default="")
    is_issue_resolved = models.BooleanField(
        default=True,
        help_text=_("Citizen confirmation whether the civic issue was actually resolved"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "feedback"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["rating"], name="idx_feedback_rating"),
            models.Index(fields=["created_at"], name="idx_feedback_created_at"),
            models.Index(fields=["citizen"], name="idx_feedback_citizen"),
        ]

    def __str__(self):
        return f"Feedback for {self.complaint.tracking_code}: {self.rating}★ by {self.citizen.email}"
