import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="OutboxEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "event_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        unique=True,
                    ),
                ),
                ("event_type", models.CharField(max_length=100)),
                ("event_version", models.PositiveIntegerField(default=1)),
                ("source", models.CharField(max_length=50)),
                ("aggregate_id", models.UUIDField()),
                ("correlation_id", models.UUIDField(blank=True, null=True)),
                ("idempotency_key", models.CharField(max_length=200, unique=True)),
                ("payload", models.JSONField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("PROCESSING", "Processing"),
                            ("PUBLISHED", "Published"),
                            ("FAILED", "Failed"),
                        ],
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                ("retry_count", models.PositiveIntegerField(default=0)),
                ("next_retry_at", models.DateTimeField(blank=True, null=True)),
                ("last_error", models.CharField(blank=True, default="", max_length=500)),
                ("occurred_at", models.DateTimeField()),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "outbox_events",
                "ordering": ["created_at"],
                "indexes": [
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
                ],
            },
        ),
    ]
