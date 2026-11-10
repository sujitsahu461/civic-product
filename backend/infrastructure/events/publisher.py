from abc import ABC, abstractmethod
from typing import Any


class EventPublisher(ABC):
    """Delivery boundary for future broker adapters."""

    @abstractmethod
    def publish(self, event: dict[str, Any]) -> None:
        raise NotImplementedError


class LocalEventPublisher(EventPublisher):
    """No-op delivery adapter used until a broker is approved."""

    def publish(self, event: dict[str, Any]) -> None:
        return None
