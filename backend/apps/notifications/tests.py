from unittest.mock import patch

from django.db import DatabaseError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import User, UserRole
from apps.authority.services import AuthorityComplaintService
from apps.complaint_history.models import ComplaintHistory
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintStatus
from apps.complaints.services import ComplaintService
from apps.departments.models import Department, DepartmentAuthority
from apps.feedback.models import Feedback
from apps.feedback.services import FeedbackService
from apps.notifications.models import Notification, NotificationType
from apps.notifications.services import NotificationService


def make_user(email, role):
    return User.objects.create_user(email=email, role=role)


class NotificationBoundaryTests(APITestCase):
    def setUp(self):
        self.citizen = make_user("notification-citizen@example.com", UserRole.CITIZEN)
        self.authority = make_user("notification-authority@example.com", UserRole.AUTHORITY)

    def test_notification_service_is_owned_by_notifications_domain(self):
        from apps.authority.services import NotificationService as AuthorityNotificationService

        self.assertIs(AuthorityNotificationService, NotificationService)

    def test_database_write_failure_is_propagated(self):
        with patch(
            "apps.notifications.services.Notification.objects.create",
            side_effect=DatabaseError("notification database unavailable"),
        ):
            with self.assertRaises(DatabaseError):
                NotificationService.create_notification(
                    self.authority,
                    "Test",
                    "Message",
                    NotificationType.SYSTEM,
                )

    def test_notification_read_and_mark_operations_use_service(self):
        read = NotificationService.create_notification(
            self.authority, "Read", "Message", NotificationType.SYSTEM
        )
        unread = NotificationService.create_notification(
            self.authority, "Unread", "Message", NotificationType.SYSTEM
        )
        NotificationService.mark_as_read([read.public_id], self.authority)

        self.assertEqual(NotificationService.get_notifications(self.authority).count(), 2)
        self.assertEqual(
            NotificationService.get_notifications(self.authority, is_read=False).count(),
            1,
        )
        self.assertTrue(Notification.objects.get(pk=read.pk).is_read)
        self.assertFalse(Notification.objects.get(pk=unread.pk).is_read)

    def test_notification_api_preserves_read_and_mark_response_contracts(self):
        notification = NotificationService.create_notification(
            self.authority, "Unread", "Message", NotificationType.SYSTEM
        )
        client = self.client
        client.force_authenticate(user=self.authority)

        list_response = client.get(reverse("notification-list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["unread_count"], 1)
        self.assertEqual(len(list_response.json()["notifications"]), 1)

        mark_response = client.post(
            reverse("notification-mark-read", kwargs={"public_id": notification.public_id})
        )
        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(
            mark_response.json(),
            {"detail": "Notification marked as read."},
        )

        mark_all_response = client.post(reverse("notification-mark-all-read"))
        self.assertEqual(mark_all_response.status_code, 200)
        self.assertEqual(
            mark_all_response.json(),
            {"detail": "0 notifications marked as read."},
        )


class NotificationFailureWorkflowTests(TestCase):
    def setUp(self):
        self.citizen = make_user("workflow-citizen@example.com", UserRole.CITIZEN)
        self.authority = make_user("workflow-authority@example.com", UserRole.AUTHORITY)
        self.department, _ = Department.objects.get_or_create(name="Water")
        DepartmentAuthority.objects.create(
            department=self.department,
            user=self.authority,
        )

    def test_notification_failure_during_complaint_creation_preserves_complaint(self):
        with patch(
            "apps.notifications.services.NotificationService.create_notification",
            side_effect=RuntimeError("notification delivery failed"),
        ):
            complaint = ComplaintService.create_complaint(
                citizen=self.citizen,
                department=self.department,
                title="Water leak",
                description="Pipe leak near the road",
                location_address="Ward 1",
            )

        self.assertTrue(Complaint.objects.filter(pk=complaint.pk).exists())
        self.assertEqual(complaint.status, ComplaintStatus.PENDING)

    def test_notification_failure_during_feedback_rolls_back_feedback(self):
        complaint = Complaint.objects.create(
            citizen=self.citizen,
            assigned_authority=self.authority,
            category=ComplaintCategory.WATER,
            title="Resolved leak",
            description="The leak was repaired",
            status=ComplaintStatus.RESOLVED,
            location_address="Ward 1",
        )

        with patch(
            "apps.feedback.services.NotificationService.create_notification",
            side_effect=RuntimeError("notification delivery failed"),
        ):
            with self.assertRaises(RuntimeError):
                FeedbackService.submit_feedback(
                    complaint,
                    self.citizen,
                    {"rating": 4},
                )

        self.assertEqual(Feedback.objects.filter(complaint=complaint).count(), 0)

    def test_notification_failure_during_authority_status_update_rolls_back_status(self):
        complaint = Complaint.objects.create(
            citizen=self.citizen,
            assigned_authority=self.authority,
            category=ComplaintCategory.WATER,
            title="Pending leak",
            description="The leak is pending",
            status=ComplaintStatus.PENDING,
            location_address="Ward 1",
        )

        with patch(
            "apps.authority.services.NotificationService.create_notification",
            side_effect=RuntimeError("notification delivery failed"),
        ):
            with self.assertRaises(RuntimeError):
                AuthorityComplaintService.update_complaint_status(
                    complaint,
                    self.authority,
                    ComplaintStatus.IN_PROGRESS,
                )

        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.PENDING)
        self.assertEqual(ComplaintHistory.objects.filter(complaint=complaint).count(), 0)
