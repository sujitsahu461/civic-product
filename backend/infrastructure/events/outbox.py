import uuid
from datetime import timedelta
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.core.models import OutboxEvent, OutboxStatus


class OutboxValidationError(ValueError):
    pass


class OutboxService:
    """Records and manages events without delivering them to a broker."""

    @staticmethod
    def record(event: dict[str, Any]) -> OutboxEvent:
        required = (
            "event_id",
            "event_type",
            "event_version",
            "source",
            "aggregate_id",
            "occurred_at",
            "payload",
        )
        missing = [field for field in required if field not in event]
        if missing:
            raise OutboxValidationError(
                f"Missing event fields: {', '.join(missing)}"
            )
        if not isinstance(event["payload"], dict):
            raise OutboxValidationError("Event payload must be an object.")
        try:
            event_id = uuid.UUID(str(event["event_id"]))
            aggregate_id = uuid.UUID(str(event["aggregate_id"]))
            correlation_id = (
                uuid.UUID(str(event["correlation_id"]))
                if event.get("correlation_id")
                else None
            )
        except (ValueError, TypeError, AttributeError) as exc:
            raise OutboxValidationError("Event identifiers must be valid UUIDs.") from exc

        idempotency_key = event.get(
            "idempotency_key",
            f"{event['event_type']}:{event['event_version']}:{event_id}",
        )
        try:
            return OutboxEvent.objects.create(
                event_id=event_id,
                event_type=event["event_type"],
                event_version=event["event_version"],
                source=event["source"],
                aggregate_id=aggregate_id,
                correlation_id=correlation_id,
                idempotency_key=idempotency_key,
                payload=event["payload"],
                occurred_at=event["occurred_at"],
            )
        except IntegrityError as exc:
            raise OutboxValidationError(
                "Event ID or idempotency key already exists."
            ) from exc

    @staticmethod
    def claim_pending(limit=100):
        now = timezone.now()
        with transaction.atomic():
            events = list(
                OutboxEvent.objects.select_for_update()
                .filter(
                    Q(
                        status=OutboxStatus.PENDING,
                        next_retry_at__isnull=True,
                    )
                    | Q(
                        status=OutboxStatus.FAILED,
                        next_retry_at__lte=now,
                    )
                )
                .order_by("created_at")[:limit]
            )
            ids = [event.id for event in events]
            if ids:
                OutboxEvent.objects.filter(id__in=ids).update(
                    status=OutboxStatus.PROCESSING,
                    updated_at=now,
                )
            return OutboxEvent.objects.filter(id__in=ids).order_by("created_at")

    @staticmethod
    def mark_published(event_id):
        return OutboxEvent.objects.filter(
            event_id=event_id,
            status=OutboxStatus.PROCESSING,
        ).update(
            status=OutboxStatus.PUBLISHED,
            published_at=timezone.now(),
            last_error="",
        )

    @staticmethod
    def mark_failed(event_id, error, retry_after_seconds=60):
        event = OutboxEvent.objects.get(event_id=event_id)
        event.status = OutboxStatus.FAILED
        event.retry_count += 1
        event.next_retry_at = timezone.now() + timedelta(seconds=retry_after_seconds)
        event.last_error = str(error)[:500]
        event.save(
            update_fields=[
                "status",
                "retry_count",
                "next_retry_at",
                "last_error",
                "updated_at",
            ]
        )
        return event
