import uuid
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from apps.core.models import OutboxEvent, OutboxStatus
from apps.core.models import ProcessedEvent
from infrastructure.events.consumer import EventConsumer
from infrastructure.events.outbox import OutboxService, OutboxValidationError


def event_payload(**overrides):
    event = {
        "event_id": uuid.uuid4(),
        "event_type": "ComplaintCreated",
        "event_version": 1,
        "source": "grievance",
        "aggregate_id": uuid.uuid4(),
        "correlation_id": uuid.uuid4(),
        "occurred_at": timezone.now(),
        "payload": {"status": "PENDING"},
    }
    event.update(overrides)
    return event


class OutboxServiceTests(TestCase):
    def test_records_event(self):
        event = OutboxService.record(event_payload())
        self.assertEqual(event.status, OutboxStatus.PENDING)
        self.assertEqual(event.payload, {"status": "PENDING"})

    def test_duplicate_event_id_is_rejected(self):
        event = event_payload()
        OutboxService.record(event)
        with self.assertRaises(OutboxValidationError):
            OutboxService.record(event)

    def test_invalid_event_is_rejected(self):
        with self.assertRaises(OutboxValidationError):
            OutboxService.record(event_payload(payload=["not", "an", "object"]))

    def test_record_rolls_back_with_business_transaction(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                OutboxService.record(event_payload())
                raise RuntimeError("business operation failed")
        self.assertEqual(OutboxEvent.objects.count(), 0)

    def test_record_commits_with_business_transaction(self):
        with transaction.atomic():
            OutboxService.record(event_payload())
        self.assertEqual(OutboxEvent.objects.count(), 1)

    def test_retry_metadata_and_publishing_state(self):
        event = OutboxService.record(event_payload())
        OutboxEvent.objects.filter(pk=event.pk).update(status=OutboxStatus.PROCESSING)
        self.assertEqual(OutboxService.mark_published(event.event_id), 1)
        event.refresh_from_db()
        self.assertEqual(event.status, OutboxStatus.PUBLISHED)

        failed = OutboxService.record(event_payload(event_id=uuid.uuid4()))
        failed = OutboxService.mark_failed(failed.event_id, "temporary failure")
        self.assertEqual(failed.status, OutboxStatus.FAILED)
        self.assertEqual(failed.retry_count, 1)
        self.assertGreater(failed.next_retry_at, timezone.now() - timedelta(seconds=1))

    def test_claim_pending_and_due_failed_events(self):
        pending = OutboxService.record(event_payload())
        failed = OutboxService.record(event_payload(event_id=uuid.uuid4()))
        failed = OutboxService.mark_failed(failed.event_id, "temporary failure", retry_after_seconds=0)

        claimed = list(OutboxService.claim_pending())

        self.assertEqual({event.event_id for event in claimed}, {pending.event_id, failed.event_id})
        self.assertTrue(
            all(event.status == OutboxStatus.PROCESSING for event in claimed)
        )

    def test_integrity_errors_do_not_escape_as_database_details(self):
        event = event_payload()
        OutboxService.record(event)
        with self.assertRaises(OutboxValidationError) as raised:
            OutboxService.record(event)
        self.assertNotIn("UNIQUE constraint", str(raised.exception))


class EventConsumerTests(TestCase):
    def test_duplicate_event_is_not_processed_twice(self):
        event = {"event_id": str(uuid.uuid4())}
        calls = []

        self.assertTrue(
            EventConsumer.process(
                event,
                "reporting",
                lambda value: calls.append(value["event_id"]),
            )
        )
        self.assertFalse(
            EventConsumer.process(
                event,
                "reporting",
                lambda value: calls.append(value["event_id"]),
            )
        )

        self.assertEqual(calls, [event["event_id"]])
        self.assertEqual(ProcessedEvent.objects.count(), 1)

    def test_failed_handler_rolls_back_processed_marker(self):
        event = {"event_id": str(uuid.uuid4())}

        with self.assertRaises(RuntimeError):
            EventConsumer.process(
                event,
                "reporting",
                lambda value: (_ for _ in ()).throw(RuntimeError("handler failed")),
            )

        self.assertFalse(
            ProcessedEvent.objects.filter(
                event_id=event["event_id"],
                consumer_name="reporting",
            ).exists()
        )
