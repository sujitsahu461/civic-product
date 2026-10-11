import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.complaints.models import Complaint, ComplaintCategory, ComplaintPriority


class SentimentType(models.TextChoices):
    POSITIVE = "POSITIVE", _("Positive")
    NEUTRAL = "NEUTRAL", _("Neutral")
    NEGATIVE = "NEGATIVE", _("Negative")
    CRITICAL = "CRITICAL", _("Critical / Distress")


class AIPredictionLog(models.Model):
    """Stores AI classification, urgency scoring, and duplicate prediction records."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="ai_predictions",
    )
    predicted_category = models.CharField(
        max_length=30,
        choices=ComplaintCategory.choices,
        default=ComplaintCategory.OTHER,
    )
    confidence_score = models.FloatField(
        default=0.85,
        help_text=_("Model classification confidence between 0.0 and 1.0"),
    )
    urgency_score = models.PositiveSmallIntegerField(
        default=50,
        help_text=_("Urgency score from 1 (lowest) to 100 (critical hazard)"),
    )
    predicted_priority = models.CharField(
        max_length=20,
        choices=ComplaintPriority.choices,
        default=ComplaintPriority.MEDIUM,
    )
    detected_keywords = models.JSONField(
        default=list,
        blank=True,
        help_text=_("Keywords extracted from complaint text"),
    )
    hazard_tags = models.JSONField(
        default=list,
        blank=True,
        help_text=_("Safety and hazard indicators detected by AI"),
    )
    sentiment = models.CharField(
        max_length=20,
        choices=SentimentType.choices,
        default=SentimentType.NEGATIVE,
    )
    estimated_resolution_hours = models.PositiveIntegerField(
        default=48,
        help_text=_("AI estimated SLA resolution time in hours"),
    )
    predicted_department = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text=_("AI predicted/routed department name"),
    )
    requires_human_review = models.BooleanField(
        default=False,
        help_text=_("Flagged if AI model and lookup table disagreed or low confidence"),
    )
    potential_duplicate_of = models.ForeignKey(
        Complaint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duplicate_predictions",
    )
    similarity_score = models.FloatField(
        null=True,
        blank=True,
        help_text=_("Duplicate similarity score between 0.0 and 1.0"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_prediction_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["predicted_category"], name="idx_ai_pred_cat"),
            models.Index(fields=["urgency_score"], name="idx_ai_pred_urgency"),
            models.Index(fields=["created_at"], name="idx_ai_pred_created_at"),
        ]

    def __str__(self):
        return f"AI Prediction [{self.predicted_category} - {self.predicted_priority}] Conf: {self.confidence_score:.2f}"
