import uuid

from django.db import models


class OutboxStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    PUBLISHED = "PUBLISHED", "Published"
    FAILED = "FAILED", "Failed"


class OutboxEvent(models.Model):
    event_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    event_type = models.CharField(max_length=100)
    event_version = models.PositiveIntegerField(default=1)
    source = models.CharField(max_length=50)
    aggregate_id = models.UUIDField()
    correlation_id = models.UUIDField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=200, unique=True)
    payload = models.JSONField()
    status = models.CharField(
        max_length=20,
        choices=OutboxStatus.choices,
        default=OutboxStatus.PENDING,
    )
    retry_count = models.PositiveIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=500, blank=True, default="")
    occurred_at = models.DateTimeField()
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "outbox_events"
        indexes = [
            models.Index(
                fields=["status", "next_retry_at"],
                name="idx_outbox_pending_retry",
            ),
            models.Index(
                fields=["aggregate_id", "created_at"],
                name="idx_outbox_aggregate_created",
            ),
            models.Index(
                fields=["event_type", "event_version"],
                name="idx_outbox_event_version",
            ),
        ]
        ordering = ["created_at"]


class ProcessedEvent(models.Model):
    event_id = models.CharField(max_length=100)
    consumer_name = models.CharField(max_length=100)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "processed_events"
        constraints = [
            models.UniqueConstraint(
                fields=["event_id", "consumer_name"],
                name="uq_processed_event_consumer",
            ),
        ]
        indexes = [
            models.Index(
                fields=["consumer_name", "processed_at"],
                name="idx_processed_consumer_time",
            ),
        ]

    def mark_processed(self):
        from django.utils import timezone

        self.processed_at = timezone.now()
        self.save(update_fields=["processed_at"])
