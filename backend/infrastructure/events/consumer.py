from collections.abc import Callable
from typing import Any

from django.db import transaction

from apps.core.models import ProcessedEvent


class EventConsumer:
    """Idempotent local consumer foundation; no broker is implied."""

    @staticmethod
    @transaction.atomic
    def process(
        event: dict[str, Any],
        consumer_name: str,
        handler: Callable[[dict[str, Any]], None],
    ) -> bool:
        event_id = str(event.get("event_id", ""))
        if not event_id or not consumer_name:
            raise ValueError("Event ID and consumer name are required.")

        processed, created = ProcessedEvent.objects.get_or_create(
            event_id=event_id,
            consumer_name=consumer_name,
        )
        if not created:
            return False

        handler(event)
        processed.mark_processed()
        return True
