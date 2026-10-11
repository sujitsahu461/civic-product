import uuid
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRole
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from apps.feedback.models import Feedback, ResolutionQuality, SatisfactionLevel, TimelinessRating
from apps.feedback.services import FeedbackService
from apps.notifications.models import Notification

User = get_user_model()


class FeedbackModelAndServiceTests(APITestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="citizen_fb@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
            full_name="Citizen Tester",
        )
        self.other_citizen = User.objects.create_user(
            email="other_fb@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
            full_name="Other Citizen",
        )
        self.authority = User.objects.create_user(
            email="auth_fb@example.com",
            password="Password123!",
            role=UserRole.AUTHORITY,
            full_name="Officer Sharma",
        )
        self.complaint = Complaint.objects.create(
            citizen=self.citizen,
            category=ComplaintCategory.WATER,
            assigned_authority=self.authority,
            title="Broken Water Valve",
            description="High pressure leak overflowing street",
            status=ComplaintStatus.RESOLVED,
            priority=ComplaintPriority.HIGH,
            location_address="Ward 12, Main Street",
        )

    def test_submit_feedback_success(self):
        data = {
            "rating": 5,
            "satisfaction_level": SatisfactionLevel.VERY_SATISFIED,
            "resolution_quality": ResolutionQuality.EXCELLENT,
            "timeliness": TimelinessRating.QUICK,
            "comments": "Fixed very fast and clean work!",
            "is_issue_resolved": True,
        }
        feedback = FeedbackService.submit_feedback(self.complaint, self.citizen, data)

        self.assertEqual(feedback.rating, 5)
        self.assertEqual(feedback.complaint, self.complaint)
        self.assertEqual(feedback.citizen, self.citizen)
        self.assertTrue(feedback.is_issue_resolved)

        # Check notification sent to authority
        notif = Notification.objects.filter(recipient=self.authority).first()
        self.assertIsNotNone(notif)
        self.assertIn("Citizen Feedback", notif.title)

    def test_cannot_submit_feedback_if_not_resolved(self):
        self.complaint.status = ComplaintStatus.IN_PROGRESS
        self.complaint.save()

        data = {"rating": 4}
        with self.assertRaises(Exception):
            FeedbackService.submit_feedback(self.complaint, self.citizen, data)

    def test_cannot_submit_feedback_for_other_citizen(self):
        data = {"rating": 5}
        with self.assertRaises(Exception):
            FeedbackService.submit_feedback(self.complaint, self.other_citizen, data)

    def test_cannot_submit_duplicate_feedback(self):
        data = {"rating": 5}
        FeedbackService.submit_feedback(self.complaint, self.citizen, data)

        with self.assertRaises(Exception):
            FeedbackService.submit_feedback(self.complaint, self.citizen, data)

    def test_department_feedback_metrics(self):
        data = {
            "rating": 4,
            "satisfaction_level": SatisfactionLevel.SATISFIED,
            "resolution_quality": ResolutionQuality.GOOD,
            "timeliness": TimelinessRating.ON_TIME,
            "comments": "Good job",
            "is_issue_resolved": True,
        }
        FeedbackService.submit_feedback(self.complaint, self.citizen, data)

        metrics = FeedbackService.get_department_feedback_metrics(ComplaintCategory.WATER)
        self.assertEqual(metrics["total_feedbacks"], 1)
        self.assertEqual(metrics["average_rating"], 4.0)
        self.assertEqual(metrics["satisfaction_rate_percent"], 100.0)
        self.assertEqual(metrics["rating_distribution"][4], 1)


class FeedbackAPITests(APITestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="citizen_api_fb@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
            full_name="Citizen API Tester",
        )
        self.authority = User.objects.create_user(
            email="auth_api_fb@example.com",
            password="Password123!",
            role=UserRole.AUTHORITY,
            full_name="Officer Verma",
        )
        self.admin = User.objects.create_user(
            email="admin_api_fb@example.com",
            password="Password123!",
            role=UserRole.SUPER_ADMIN,
            full_name="Super Admin",
        )
        self.complaint = Complaint.objects.create(
            citizen=self.citizen,
            category=ComplaintCategory.ROAD,
            assigned_authority=self.authority,
            title="Dangerous Pothole on Highway",
            description="Deep pothole causing vehicle damage",
            status=ComplaintStatus.RESOLVED,
            priority=ComplaintPriority.HIGH,
            location_address="Ring Road, Sector 5",
        )
        self.submit_url = reverse("feedback:feedback-submit")
        self.my_feedbacks_url = reverse("feedback:citizen-feedbacks")

    def test_api_submit_feedback_success(self):
        self.client.force_authenticate(user=self.citizen)
        payload = {
            "complaint_public_id": str(self.complaint.public_id),
            "rating": 5,
            "satisfaction_level": "VERY_SATISFIED",
            "resolution_quality": "EXCELLENT",
            "timeliness": "QUICK",
            "comments": "Pothole filled within 24 hours. Excellent work by the municipal crew!",
            "is_issue_resolved": True,
        }
        response = self.client.post(self.submit_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["rating"], 5)
        self.assertEqual(response.data["complaint_tracking_code"], self.complaint.tracking_code)

    def test_api_submit_feedback_invalid_rating(self):
        self.client.force_authenticate(user=self.citizen)
        payload = {
            "complaint_public_id": str(self.complaint.public_id),
            "rating": 6,  # max is 5
        }
        response = self.client.post(self.submit_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_api_get_complaint_feedback(self):
        # Create feedback
        Feedback.objects.create(
            complaint=self.complaint,
            citizen=self.citizen,
            rating=4,
            comments="Well done",
        )
        url = reverse("feedback:complaint-feedback", kwargs={"complaint_public_id": self.complaint.public_id})

        # Citizen views their complaint feedback
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rating"], 4)

    def test_api_my_feedbacks(self):
        Feedback.objects.create(
            complaint=self.complaint,
            citizen=self.citizen,
            rating=5,
            comments="Fast fix",
        )
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(self.my_feedbacks_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_api_department_and_authority_stats(self):
        Feedback.objects.create(
            complaint=self.complaint,
            citizen=self.citizen,
            rating=5,
            comments="Superb",
        )
        dept_url = reverse("feedback:department-feedback-stats", kwargs={"category": ComplaintCategory.ROAD})
        auth_url = reverse("feedback:authority-feedback-stats")

        # Authority views department stats
        self.client.force_authenticate(user=self.authority)
        res_dept = self.client.get(dept_url)
        self.assertEqual(res_dept.status_code, status.HTTP_200_OK)
        self.assertEqual(res_dept.data["total_feedbacks"], 1)
        self.assertEqual(res_dept.data["average_rating"], 5.0)

        # Authority views their own stats
        res_auth = self.client.get(auth_url)
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(res_auth.data["total_feedbacks"], 1)
