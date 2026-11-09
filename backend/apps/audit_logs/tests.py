import uuid
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRole
from apps.audit_logs.models import AuditAction, AuditLog
from apps.audit_logs.services import AuditLogService

User = get_user_model()


class AuditLogServiceTests(APITestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = User.objects.create_user(
            email="admin_audit@example.com",
            password="Password123!",
            role=UserRole.SUPER_ADMIN,
        )
        self.citizen = User.objects.create_user(
            email="citizen_audit@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
        )

    def test_log_action_with_request(self):
        request = self.factory.get("/", HTTP_USER_AGENT="Mozilla/5.0 TestBrowser", REMOTE_ADDR="192.168.1.50")
        request.user = self.citizen

        entry = AuditLogService.log_action(
            action=AuditAction.COMPLAINT_CREATED,
            entity_type="Complaint",
            entity_id="CMP-20260814-TEST",
            actor=self.citizen,
            request=request,
            metadata={"category": "ROAD", "priority": "HIGH"},
        )
        self.assertEqual(entry.actor_email, self.citizen.email)
        self.assertEqual(entry.actor_role, UserRole.CITIZEN)
        self.assertEqual(entry.action, AuditAction.COMPLAINT_CREATED)
        self.assertEqual(entry.entity_type, "Complaint")
        self.assertEqual(entry.entity_id, "CMP-20260814-TEST")
        self.assertEqual(entry.ip_address, "192.168.1.50")
        self.assertEqual(entry.user_agent, "Mozilla/5.0 TestBrowser")
        self.assertEqual(entry.metadata["category"], "ROAD")

    def test_query_and_filter_logs(self):
        AuditLogService.log_action(
            action=AuditAction.AUTH_LOGIN,
            entity_type="User",
            entity_id="1",
            actor=self.citizen,
        )
        AuditLogService.log_action(
            action=AuditAction.DEPARTMENT_CREATED,
            entity_type="Department",
            entity_id="2",
            actor=self.admin,
        )

        filtered = AuditLogService.query_logs({"action": AuditAction.AUTH_LOGIN})
        self.assertEqual(filtered.count(), 1)
        self.assertEqual(filtered.first().actor_email, self.citizen.email)

        search_res = AuditLogService.query_logs({"search": "Department"})
        self.assertEqual(search_res.count(), 1)

    def test_audit_summary(self):
        AuditLogService.log_action(
            action=AuditAction.AUTH_LOGIN,
            entity_type="User",
            actor=self.citizen,
        )
        summary = AuditLogService.get_audit_summary()
        self.assertEqual(summary["total_audit_events"], 1)
        self.assertEqual(summary["security_events_count"], 1)


class AuditLogAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="superadmin_api@example.com",
            password="Password123!",
            role=UserRole.SUPER_ADMIN,
        )
        self.citizen = User.objects.create_user(
            email="citizen_no_audit@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
        )
        self.authority = User.objects.create_user(
            email="auth_no_audit@example.com",
            password="Password123!",
            role=UserRole.AUTHORITY,
        )
        self.log_entry = AuditLog.objects.create(
            actor_email=self.citizen.email,
            actor_role=UserRole.CITIZEN,
            action=AuditAction.COMPLAINT_CREATED,
            entity_type="Complaint",
            entity_id="CMP-20260814-APITEST",
            ip_address="127.0.0.1",
        )
        self.list_url = reverse("audit_logs:audit-logs-list")
        self.summary_url = reverse("audit_logs:audit-logs-summary")
        self.detail_url = reverse("audit_logs:audit-logs-detail", kwargs={"public_id": self.log_entry.public_id})

    def test_super_admin_can_view_audit_list(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)

    def test_super_admin_can_view_detail_and_summary(self):
        self.client.force_authenticate(user=self.admin)

        res_detail = self.client.get(self.detail_url)
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data["entity_id"], "CMP-20260814-APITEST")

        res_summary = self.client.get(self.summary_url)
        self.assertEqual(res_summary.status_code, status.HTTP_200_OK)
        self.assertIn("total_audit_events", res_summary.data)

    def test_citizen_and_authority_forbidden(self):
        # Citizen
        self.client.force_authenticate(user=self.citizen)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Authority
        self.client.force_authenticate(user=self.authority)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_unauthorized(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
