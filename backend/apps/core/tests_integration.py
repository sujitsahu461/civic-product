import uuid

from django.test import TestCase

from apps.accounts.models import User, UserRole
from apps.authority.services import AuthorityComplaintService
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintStatus
from apps.complaints.services import ComplaintService
from apps.core.models import OutboxEvent
from apps.departments.models import Department, DepartmentAuthority
from apps.feedback.services import FeedbackService
from apps.notifications.models import NotificationType


class WorkflowEventIntegrationTests(TestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email=f"event-citizen-{uuid.uuid4()}@example.com",
            role=UserRole.CITIZEN,
            full_name="Event Citizen",
        )
        self.authority = User.objects.create_user(
            email=f"event-authority-{uuid.uuid4()}@example.com",
            role=UserRole.AUTHORITY,
            full_name="Event Authority",
        )
        self.department = Department.objects.create(
            name=f"Event Water {uuid.uuid4()}"
        )
        DepartmentAuthority.objects.create(
            department=self.department,
            user=self.authority,
        )

    def test_complaint_creation_records_event(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.department,
            title="Water leak",
            description="A leaking pipe",
            location_address="Ward 1",
        )

        self.assertTrue(
            OutboxEvent.objects.filter(
                event_type="ComplaintCreated",
                aggregate_id=complaint.public_id,
            ).exists()
        )

    def test_assignment_and_status_record_events(self):
        complaint = Complaint.objects.create(
            citizen=self.citizen,
            category=ComplaintCategory.WATER,
            title="Pending leak",
            description="Needs repair",
            location_address="Ward 1",
        )

        ComplaintService.assign_authority(
            complaint,
            self.authority,
            self.authority,
            "Assigned for repair",
        )
        AuthorityComplaintService.update_complaint_status(
            complaint,
            self.authority,
            ComplaintStatus.RESOLVED,
            "Repaired",
        )

        events = set(
            OutboxEvent.objects.filter(
                aggregate_id=complaint.public_id
            ).values_list("event_type", flat=True)
        )
        self.assertTrue(
            {
                "ComplaintAssigned",
                "ComplaintStatusChanged",
                "ComplaintResolved",
            }.issubset(events)
        )

    def test_feedback_and_notification_requested_events_are_recorded(self):
        complaint = Complaint.objects.create(
            citizen=self.citizen,
            assigned_authority=self.authority,
            category=ComplaintCategory.WATER,
            title="Resolved leak",
            description="Repaired",
            status=ComplaintStatus.RESOLVED,
            location_address="Ward 1",
        )

        FeedbackService.submit_feedback(
            complaint,
            self.citizen,
            {"rating": 5},
        )

        self.assertTrue(
            OutboxEvent.objects.filter(event_type="FeedbackSubmitted").exists()
        )
        self.assertTrue(
            OutboxEvent.objects.filter(event_type="NotificationRequested").exists()
        )
        notification_event = OutboxEvent.objects.get(
            event_type="NotificationRequested"
        )
        self.assertEqual(
            notification_event.payload["notification_type"],
            NotificationType.RESOLUTION_UPDATE,
        )
        self.assertIn("title", notification_event.payload)
        self.assertIn("message", notification_event.payload)

    def test_event_failure_rolls_back_workflow(self):
        from unittest.mock import patch

        with patch(
            "apps.complaints.services.OutboxService.record",
            side_effect=RuntimeError("outbox unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                ComplaintService.create_complaint(
                    citizen=self.citizen,
                    department=self.department,
                    title="Broken pipe",
                    description="Outbox should roll back this complaint",
                    location_address="Ward 1",
                )

        self.assertFalse(
            Complaint.objects.filter(title="Broken pipe").exists()
        )
