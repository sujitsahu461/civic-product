import uuid
from datetime import datetime
from typing import Any


def build_event(
    *,
    event_type: str,
    source: str,
    aggregate_id,
    payload: dict[str, Any],
    correlation_id=None,
    event_version: int = 1,
) -> dict[str, Any]:
    """Build the validated shape expected by the local outbox."""
    if not event_type or not source:
        raise ValueError("Event type and source are required.")
    if not isinstance(payload, dict):
        raise ValueError("Event payload must be an object.")
    return {
        "event_id": uuid.uuid4(),
        "event_type": event_type,
        "event_version": event_version,
        "occurred_at": datetime.now().astimezone(),
        "source": source,
        "aggregate_id": uuid.UUID(str(aggregate_id)),
        "correlation_id": (
            uuid.UUID(str(correlation_id)) if correlation_id else uuid.uuid4()
        ),
        "payload": payload,
    }
