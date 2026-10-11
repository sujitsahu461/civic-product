import io
import tempfile
from PIL import Image

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.complaint_history.models import ComplaintHistory, HistoryAction
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from apps.complaints.services import ComplaintService
from apps.departments.models import Department, DepartmentAuthority
from apps.notifications.models import Notification, NotificationType
from apps.authority.services import (
    AuthorityAnalyticsService,
    AuthorityComplaintService,
    AuthorityDashboardService,
    NotificationService,
)


User = get_user_model()
TEMP_MEDIA = tempfile.mkdtemp()


def _create_test_image(name="test.png", size=(100, 100), fmt="PNG"):
    image = Image.new("RGB", size, color="red")
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return SimpleUploadedFile(name=name, content=buf.getvalue(), content_type=f"image/{fmt.lower()}")


def _make_user(role=UserRole.CITIZEN, email=None, password="StrongPass123!", **kwargs):
    email = email or f"{role.lower()}_{id(role)}@example.com"
    return User.objects.create_user(
        email=email, password=password, full_name=f"Test {role}", role=role, **kwargs,
    )


def _get_department(name="Road"):
    dept, _ = Department.objects.get_or_create(name=name)
    return dept


def _create_complaint(citizen, dept=None, title="Test Complaint", **kwargs):
    return ComplaintService.create_complaint(
        citizen=citizen,
        category=kwargs.get("category", ComplaintCategory.ROAD),
        title=title,
        description=kwargs.get("description", "Test description"),
        location_address=kwargs.get("location_address", "Test Address"),
        priority=kwargs.get("priority", ComplaintPriority.MEDIUM),
    )


# ===========================================================================
# Notification Service Tests
# ===========================================================================


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user(UserRole.AUTHORITY, email="notif_auth@example.com")

    def test_create_notification(self):
        notif = NotificationService.create_notification(
            recipient=self.user,
            title="Test",
            message="Test message",
            notification_type=NotificationType.SYSTEM,
        )
        self.assertEqual(notif.recipient, self.user)
        self.assertFalse(notif.is_read)

    def test_get_notifications_filter_read(self):
        NotificationService.create_notification(self.user, "Read", "msg", NotificationType.SYSTEM)
        n2 = NotificationService.create_notification(self.user, "Unread", "msg", NotificationType.SYSTEM)
        Notification.objects.filter(pk=n2.pk).update(is_read=True)

        unread = NotificationService.get_notifications(self.user, is_read=False)
        self.assertEqual(unread.count(), 1)
        read = NotificationService.get_notifications(self.user, is_read=True)
        self.assertEqual(read.count(), 1)

    def test_mark_as_read(self):
        n1 = NotificationService.create_notification(self.user, "N1", "msg", NotificationType.SYSTEM)
        n2 = NotificationService.create_notification(self.user, "N2", "msg", NotificationType.SYSTEM)
        updated = NotificationService.mark_as_read([n1.public_id], self.user)
        self.assertEqual(updated, 1)
        n1.refresh_from_db()
        n2.refresh_from_db()
        self.assertTrue(n1.is_read)
        self.assertFalse(n2.is_read)

    def test_mark_all_read(self):
        NotificationService.create_notification(self.user, "N1", "msg", NotificationType.SYSTEM)
        NotificationService.create_notification(self.user, "N2", "msg", NotificationType.SYSTEM)
        updated = NotificationService.mark_all_read(self.user)
        self.assertEqual(updated, 2)
        self.assertEqual(NotificationService.get_unread_count(self.user), 0)

    def test_unread_count(self):
        NotificationService.create_notification(self.user, "N1", "msg", NotificationType.SYSTEM)
        NotificationService.create_notification(self.user, "N2", "msg", NotificationType.SYSTEM)
        self.assertEqual(NotificationService.get_unread_count(self.user), 2)


# ===========================================================================
# Authority Dashboard Service Tests
# ===========================================================================


class AuthorityDashboardServiceTests(TestCase):
    def setUp(self):
        self.authority = _make_user(UserRole.AUTHORITY, email="dash_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="dash_cit@example.com")
        self.dept = _get_department("Road")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)

        self.c1 = _create_complaint(self.citizen, self.dept, "Pothole A")
        self.c2 = _create_complaint(self.citizen, self.dept, "Pothole B", priority=ComplaintPriority.URGENT)

    def test_dashboard_summary(self):
        summary = AuthorityDashboardService.get_dashboard_summary(self.authority)
        self.assertEqual(summary["total_complaints"], 2)
        self.assertEqual(summary["pending"], 2)
        self.assertEqual(summary["urgent_active"], 1)
        self.assertGreaterEqual(summary["today_new"], 2)

    def test_recent_complaints(self):
        recent = AuthorityDashboardService.get_recent_complaints(self.authority, limit=5)
        self.assertEqual(len(recent), 2)
        # Most recent first
        self.assertEqual(recent[0].title, "Pothole B")


# ===========================================================================
# Authority Complaint Service Tests
# ===========================================================================


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class AuthorityComplaintServiceTests(TestCase):
    def setUp(self):
        self.authority = _make_user(UserRole.AUTHORITY, email="cmp_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="cmp_cit@example.com")
        self.dept = _get_department("Water")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)
        self.complaint = _create_complaint(self.citizen, self.dept, "Water Pipe Leak")

    def test_get_assigned_complaints(self):
        qs = AuthorityComplaintService.get_assigned_complaints(self.authority)
        self.assertEqual(qs.count(), 1)

    def test_get_assigned_with_search(self):
        qs = AuthorityComplaintService.get_assigned_complaints(self.authority, query="pipe")
        self.assertEqual(qs.count(), 1)
        qs2 = AuthorityComplaintService.get_assigned_complaints(self.authority, query="nonexistent")
        self.assertEqual(qs2.count(), 0)

    def test_update_status_notifies_citizen(self):
        AuthorityComplaintService.update_complaint_status(
            self.complaint, self.authority, ComplaintStatus.IN_PROGRESS, "Looking into it."
        )
        self.complaint.refresh_from_db()
        self.assertEqual(self.complaint.status, ComplaintStatus.IN_PROGRESS)
        # Citizen should receive a notification
        notifs = Notification.objects.filter(recipient=self.citizen)
        self.assertTrue(notifs.exists())
        self.assertEqual(notifs.first().notification_type, NotificationType.STATUS_CHANGED)

    def test_add_resolution_notes(self):
        AuthorityComplaintService.add_resolution_notes(
            self.complaint, self.authority, "Fixed the pipe."
        )
        self.complaint.refresh_from_db()
        self.assertEqual(self.complaint.resolution_notes, "Fixed the pipe.")
        # History should have NOTE_ADDED event
        self.assertTrue(
            ComplaintHistory.objects.filter(
                complaint=self.complaint, action=HistoryAction.NOTE_ADDED
            ).exists()
        )
        # Citizen should receive notification
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen, notification_type=NotificationType.RESOLUTION_UPDATE
            ).exists()
        )

    def test_upload_resolution_image(self):
        img = _create_test_image("evidence.png")
        result = AuthorityComplaintService.upload_resolution_image(
            self.complaint, self.authority, img, "Evidence photo"
        )
        self.assertEqual(result.caption, "Evidence photo")
        self.assertEqual(self.complaint.images.count(), 1)

    def test_update_priority(self):
        AuthorityComplaintService.update_priority(
            self.complaint, self.authority, ComplaintPriority.URGENT, "Urgent leak."
        )
        self.complaint.refresh_from_db()
        self.assertEqual(self.complaint.priority, ComplaintPriority.URGENT)
        # Citizen should get notification
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.citizen, notification_type=NotificationType.PRIORITY_CHANGED
            ).exists()
        )


# ===========================================================================
# Authority Analytics Service Tests
# ===========================================================================


class AuthorityAnalyticsServiceTests(TestCase):
    def setUp(self):
        self.authority = _make_user(UserRole.AUTHORITY, email="analytics_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="analytics_cit@example.com")
        self.dept = _get_department("Electricity")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)

        _create_complaint(self.citizen, self.dept, "Power Cut", priority=ComplaintPriority.HIGH)
        _create_complaint(self.citizen, self.dept, "Transformer", priority=ComplaintPriority.URGENT)

    def test_get_complaint_stats(self):
        stats = AuthorityAnalyticsService.get_complaint_stats(self.authority, days=30)
        self.assertEqual(stats["total_complaints"], 2)
        self.assertIn("status_breakdown", stats)
        self.assertIn("daily_trend", stats)
        self.assertEqual(stats["status_breakdown"]["pending"]["count"], 2)

    def test_get_department_performance(self):
        data = AuthorityAnalyticsService.get_department_performance(self.authority)
        self.assertGreaterEqual(len(data), 1)
        # Find road category
        road_entry = next((d for d in data if d["category"] == "ROAD"), data[0])
        self.assertIn("total", road_entry)
        self.assertIn("pending", road_entry)

    def test_get_priority_breakdown(self):
        data = AuthorityAnalyticsService.get_priority_breakdown(self.authority)
        self.assertEqual(data["total"], 2)
        # Find HIGH and URGENT entries
        high_entry = next(b for b in data["breakdown"] if b["priority"] == "HIGH")
        urgent_entry = next(b for b in data["breakdown"] if b["priority"] == "URGENT")
        self.assertEqual(high_entry["count"], 1)
        self.assertEqual(urgent_entry["count"], 1)


# ===========================================================================
# Dashboard API Tests
# ===========================================================================


class AuthorityDashboardAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.authority = _make_user(UserRole.AUTHORITY, email="api_dash_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="api_dash_cit@example.com")
        self.dept = _get_department("Road")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)
        _create_complaint(self.citizen, self.dept, "Dashboard complaint")

    def test_dashboard_summary_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-dashboard-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_complaints"], 1)
        self.assertIn("pending", response.data)

    def test_dashboard_recent_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-dashboard-recent")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_citizen_cannot_access_dashboard(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("authority-dashboard-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# Authority Complaint API Tests
# ===========================================================================


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class AuthorityComplaintAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.authority = _make_user(UserRole.AUTHORITY, email="api_cmp_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="api_cmp_cit@example.com")
        self.dept = _get_department("Water")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)
        self.complaint = _create_complaint(self.citizen, self.dept, "Pipe Burst")

    def test_list_complaints(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-complaint-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_complaint_detail(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-complaint-detail", kwargs={"public_id": self.complaint.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Pipe Burst")

    def test_update_status_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-complaint-status", kwargs={"public_id": self.complaint.public_id})
        response = self.client.patch(
            url,
            {"status": ComplaintStatus.IN_PROGRESS, "remarks": "Investigating."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ComplaintStatus.IN_PROGRESS)

    def test_add_resolution_notes_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-complaint-notes", kwargs={"public_id": self.complaint.public_id})
        response = self.client.patch(url, {"notes": "Pipe replaced."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.complaint.refresh_from_db()
        self.assertEqual(self.complaint.resolution_notes, "Pipe replaced.")

    def test_upload_resolution_image_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-complaint-resolution-image", kwargs={"public_id": self.complaint.public_id})
        img = _create_test_image("resolution.png")
        response = self.client.post(url, {"image": img, "caption": "Fixed pipe"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["caption"], "Fixed pipe")

    def test_update_priority_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-complaint-priority", kwargs={"public_id": self.complaint.public_id})
        response = self.client.patch(
            url,
            {"priority": ComplaintPriority.URGENT, "remarks": "Flooding risk."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.complaint.refresh_from_db()
        self.assertEqual(self.complaint.priority, ComplaintPriority.URGENT)

    def test_citizen_cannot_update_status(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("authority-complaint-status", kwargs={"public_id": self.complaint.public_id})
        response = self.client.patch(
            url, {"status": ComplaintStatus.RESOLVED}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# Analytics API Tests
# ===========================================================================


class AuthorityAnalyticsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.authority = _make_user(UserRole.AUTHORITY, email="api_analytics_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="api_analytics_cit@example.com")
        self.dept = _get_department("Drainage")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)
        _create_complaint(self.citizen, self.dept, "Clogged drain", priority=ComplaintPriority.HIGH)

    def test_complaint_stats_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-analytics-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_complaints"], 1)
        self.assertIn("status_breakdown", response.data)

    def test_department_performance_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-analytics-department")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertIn("category", response.data[0])

    def test_priority_breakdown_api(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-analytics-priority")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)

    def test_citizen_cannot_access_analytics(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("authority-analytics-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# Notification API Tests
# ===========================================================================


class NotificationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.authority = _make_user(UserRole.AUTHORITY, email="api_notif_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="api_notif_cit@example.com")
        self.n1 = NotificationService.create_notification(
            self.authority, "Alert 1", "Message 1", NotificationType.SYSTEM
        )
        self.n2 = NotificationService.create_notification(
            self.authority, "Alert 2", "Message 2", NotificationType.NEW_COMPLAINT
        )

    def test_list_notifications(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_list_unread_only(self):
        Notification.objects.filter(pk=self.n1.pk).update(is_read=True)
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-notification-list")
        response = self.client.get(url, {"is_read": "false"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_unread_count(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-notification-unread-count")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 2)

    def test_mark_read(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-notification-mark-read")
        response = self.client.post(
            url, {"notification_ids": [str(self.n1.public_id)]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["marked_read"], 1)
        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)

    def test_mark_all_read(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("authority-notification-mark-all-read")
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["marked_read"], 2)
        self.assertEqual(NotificationService.get_unread_count(self.authority), 0)

    def test_citizen_can_also_access_own_notifications(self):
        NotificationService.create_notification(
            self.citizen, "Citizen Alert", "You have an update", NotificationType.STATUS_CHANGED
        )
        self.client.force_authenticate(user=self.citizen)
        url = reverse("authority-notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)


# ===========================================================================
# End-to-End AI-Routed Authority Complaint Lifecycle Tests
# ===========================================================================


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class AuthorityAIRoutedComplaintLifecycleTests(TestCase):
    """Verifies the complete lifecycle of AI-routed complaints across all 5 departments:
    Roads, Water Supply, Electricity, Drainage, and Sanitation.
    """

    def setUp(self):
        self.client = APIClient()
        self.citizen = _make_user(UserRole.CITIZEN, email="lifecycle_citizen@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="lifecycle_authority@example.com")

        # Create all 5 departments and assign authority
        self.departments = {
            "ROAD": _get_department("Road and Infrastructure"),
            "WATER": _get_department("Water Supply"),
            "ELECTRICITY": _get_department("Electricity"),
            "DRAINAGE": _get_department("Drainage Department"),
            "SANITATION": _get_department("Sanitation and Waste"),
        }
        for dept in self.departments.values():
            DepartmentAuthority.objects.get_or_create(department=dept, user=self.authority)

    def test_complete_ai_routed_lifecycle_all_five_categories(self):
        test_grievances = [
            {
                "title": "Severe Potholes on Ring Road Lane",
                "description": "Deep potholes causing vehicle damage after rains on Ring Road",
                "expected_category": ComplaintCategory.ROAD,
            },
            {
                "title": "No Water Supply in Housing Colony",
                "description": "Drinking tap water supply completely cut off since yesterday morning",
                "expected_category": ComplaintCategory.WATER,
            },
            {
                "title": "Sparking Transformer and Broken Electric Line",
                "description": "High voltage wire snapped and sparking on street near school",
                "expected_category": ComplaintCategory.ELECTRICITY,
            },
            {
                "title": "Sewer Drainage Overflow and Clogged Drain",
                "description": "Manhole overflowing with sewage water spilling into market road",
                "expected_category": ComplaintCategory.DRAINAGE,
            },
            {
                "title": "Uncollected Garbage Dumping Pile",
                "description": "Rotting trash and waste bin overflow untouched for several days",
                "expected_category": ComplaintCategory.SANITATION,
            },
        ]

        for item in test_grievances:
            # 1. Citizen submits complaint (only title, description, location_address)
            self.client.force_authenticate(user=self.citizen)
            create_url = reverse("complaint-create")
            create_payload = {
                "title": item["title"],
                "description": item["description"],
                "location_address": "Sector 5 Civic Zone",
            }
            create_resp = self.client.post(create_url, create_payload, format="json")
            self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
            complaint_data = create_resp.data
            tracking_code = complaint_data["tracking_code"]
            public_id = complaint_data["public_id"]

            # Verify AI automatic category prediction
            self.assertEqual(complaint_data["category"], item["expected_category"])

            # 2. Authority sees it in Dashboard & Complaint Queue
            self.client.force_authenticate(user=self.authority)
            dash_url = reverse("authority-dashboard-summary")
            dash_resp = self.client.get(dash_url)
            self.assertEqual(dash_resp.status_code, status.HTTP_200_OK)
            self.assertGreaterEqual(dash_resp.data["total_complaints"], 1)

            list_url = reverse("authority-complaint-list")
            list_resp = self.client.get(list_url, {"q": tracking_code})
            self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(len(list_resp.data["results"]), 1)
            self.assertEqual(list_resp.data["results"][0]["tracking_code"], tracking_code)

            # 3. Authority opens complaint details
            detail_url = reverse("authority-complaint-detail", kwargs={"public_id": public_id})
            detail_resp = self.client.get(detail_url)
            self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(detail_resp.data["title"], item["title"])

            # 4. Authority updates priority
            priority_url = reverse("authority-complaint-priority", kwargs={"public_id": public_id})
            prio_resp = self.client.patch(
                priority_url,
                {"priority": ComplaintPriority.URGENT, "remarks": "Priority escalated by officer"},
                format="json",
            )
            self.assertEqual(prio_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(prio_resp.data["priority"], ComplaintPriority.URGENT)

            # 5. Authority updates status to IN_PROGRESS
            status_url = reverse("authority-complaint-status", kwargs={"public_id": public_id})
            status_resp = self.client.patch(
                status_url,
                {"status": ComplaintStatus.IN_PROGRESS, "remarks": "Crew dispatched on-site."},
                format="json",
            )
            self.assertEqual(status_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(status_resp.data["status"], ComplaintStatus.IN_PROGRESS)

            # 6. Authority adds resolution notes
            notes_url = reverse("authority-complaint-notes", kwargs={"public_id": public_id})
            notes_resp = self.client.patch(
                notes_url,
                {"notes": "Repairs performed and inspected according to municipal standards."},
                format="json",
            )
            self.assertEqual(notes_resp.status_code, status.HTTP_200_OK)

            # 7. Authority uploads resolution evidence image
            img_url = reverse("authority-complaint-resolution-image", kwargs={"public_id": public_id})
            test_img = _create_test_image(f"resolved_{item['expected_category']}.png")
            img_resp = self.client.post(
                img_url,
                {"image": test_img, "caption": "Work Completed Proof"},
                format="multipart",
            )
            self.assertEqual(img_resp.status_code, status.HTTP_201_CREATED)

            # 8. Authority resolves complaint
            resolve_resp = self.client.patch(
                status_url,
                {"status": ComplaintStatus.RESOLVED, "remarks": "Fully resolved and verified."},
                format="json",
            )
            self.assertEqual(resolve_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resolve_resp.data["status"], ComplaintStatus.RESOLVED)

            # 9. Verify Complaint History contains all timeline events
            complaint_obj = Complaint.objects.get(public_id=public_id)
            history_actions = list(complaint_obj.history.values_list("action", flat=True))
            self.assertIn(HistoryAction.CREATED, history_actions)
            self.assertIn(HistoryAction.STATUS_CHANGED, history_actions)
            self.assertIn(HistoryAction.NOTE_ADDED, history_actions)
            self.assertIn(HistoryAction.RESOLVED, history_actions)

            # 10. Verify Citizen received notifications
            citizen_notifs = Notification.objects.filter(recipient=self.citizen, complaint=complaint_obj)
            self.assertGreaterEqual(citizen_notifs.count(), 3)

            # 11. Citizen can track updated status & view resolution notes / images
            self.client.force_authenticate(user=self.citizen)
            track_url = reverse("complaint-track", kwargs={"tracking_code": tracking_code})
            track_resp = self.client.get(track_url)
            self.assertEqual(track_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(track_resp.data["status"], ComplaintStatus.RESOLVED)
            self.assertEqual(track_resp.data["priority"], ComplaintPriority.URGENT)
            self.assertIn("Fully resolved and verified.", track_resp.data["resolution_notes"])
            self.assertGreaterEqual(len(track_resp.data["images"]), 1)
