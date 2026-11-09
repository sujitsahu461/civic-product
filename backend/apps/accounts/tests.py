from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsAuthority, IsCitizen, IsSuperAdmin


User = get_user_model()


def _solved_captcha(answer=7):
    """A valid server-signed captcha challenge and its answer, for login tests."""
    from django.core.signing import TimestampSigner

    from apps.accounts.captcha import CAPTCHA_SALT

    key = TimestampSigner(salt=CAPTCHA_SALT).sign(f"math:{answer}")
    return {"captcha_key": key, "captcha_code": str(answer)}


class AuthenticationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_citizen_and_returns_tokens(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "citizen@example.com",
                "password": "StrongPass123!",
                "full_name": "Civic Citizen",
                "phone": "9999999999",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], UserRole.CITIZEN)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])
        self.assertTrue(User.objects.filter(email="citizen@example.com").exists())

    def test_register_creates_authority_account(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "authority@example.com",
                "password": "StrongPass123!",
                "full_name": "Civic Authority",
                "role": UserRole.AUTHORITY,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="authority@example.com")
        self.assertEqual(user.role, UserRole.AUTHORITY)
        self.assertEqual(user.department, "")

    def test_register_creates_super_admin_account(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "sneaky@example.com",
                "password": "StrongPass123!",
                "full_name": "Not An Admin",
                "role": UserRole.SUPER_ADMIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="sneaky@example.com")
        self.assertEqual(user.role, UserRole.SUPER_ADMIN)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_login_returns_tokens(self):
        User.objects.create_user(
            email="login@example.com",
            password="StrongPass123!",
            full_name="Login User",
            role=UserRole.CITIZEN,
        )

        response = self.client.post(
            reverse("auth-login"),
            {"email": "login@example.com", "password": "StrongPass123!", **_solved_captcha()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    def test_login_success_and_failure_are_audited(self):
        from apps.audit_logs.models import AuditAction, AuditLog

        user = User.objects.create_user(
            email="audited@example.com",
            password="StrongPass123!",
            full_name="Audited User",
            role=UserRole.CITIZEN,
        )
        self.client.post(
            reverse("auth-login"),
            {"email": "audited@example.com", "password": "WrongPass999!", **_solved_captcha()},
            format="json",
        )
        self.client.post(
            reverse("auth-login"),
            {"email": "audited@example.com", "password": "StrongPass123!", **_solved_captcha()},
            format="json",
        )

        self.assertTrue(AuditLog.objects.filter(action=AuditAction.AUTH_LOGIN, actor=user).exists())
        failed = AuditLog.objects.get(action=AuditAction.SYSTEM_EVENT, entity_id="audited@example.com")
        self.assertEqual(failed.metadata["event"], "login_failed")

    def test_login_requires_signed_captcha(self):
        User.objects.create_user(
            email="nocaptcha@example.com",
            password="StrongPass123!",
            full_name="No Captcha",
            role=UserRole.CITIZEN,
        )
        credentials = {"email": "nocaptcha@example.com", "password": "StrongPass123!"}

        missing = self.client.post(reverse("auth-login"), credentials, format="json")
        local_bypass = self.client.post(
            reverse("auth-login"),
            {**credentials, "captcha_key": "local", "captcha_code": "1"},
            format="json",
        )

        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("captcha_code", missing.data)
        self.assertEqual(local_bypass.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("captcha_code", local_bypass.data)

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        user = User.objects.create_user(
            email="me@example.com",
            password="StrongPass123!",
            full_name="Me User",
            role=UserRole.CITIZEN,
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me@example.com")

    def test_refresh_returns_access_token(self):
        register_response = self.client.post(
            reverse("auth-register"),
            {
                "email": "refresh@example.com",
                "password": "StrongPass123!",
                "full_name": "Refresh User",
            },
            format="json",
        )

        response = self.client.post(
            reverse("auth-refresh"),
            {"refresh": register_response.data["tokens"]["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_logout_blacklists_refresh_token(self):
        user = User.objects.create_user(
            email="logout@example.com",
            password="StrongPass123!",
            full_name="Logout User",
        )
        login_response = self.client.post(
            reverse("auth-login"),
            {"email": "logout@example.com", "password": "StrongPass123!", **_solved_captcha()},
            format="json",
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            reverse("auth-logout"),
            {"refresh": login_response.data["tokens"]["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_forgot_password_sends_email_without_revealing_account_existence(self):
        User.objects.create_user(
            email="forgot@example.com",
            password="StrongPass123!",
            full_name="Forgot User",
        )

        response = self.client.post(
            reverse("auth-forgot-password"),
            {"email": "forgot@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
        EMAIL_HOST_USER="",
        EMAIL_HOST_PASSWORD="",
    )
    def test_forgot_password_never_returns_reset_link(self):
        # Email cannot be sent (no SMTP credentials) and DEBUG is on: the response
        # must still not contain the reset link, SMTP errors or account existence.
        User.objects.create_user(
            email="victim@example.com",
            password="StrongPass123!",
            full_name="Victim User",
        )

        known = self.client.post(
            reverse("auth-forgot-password"), {"email": "victim@example.com"}, format="json"
        )
        unknown = self.client.post(
            reverse("auth-forgot-password"), {"email": "nobody@example.com"}, format="json"
        )

        self.assertEqual(known.status_code, status.HTTP_200_OK)
        for key in ("reset_url", "smtp_error", "sent"):
            self.assertNotIn(key, known.data)
        self.assertEqual(known.data, unknown.data)

    def test_reset_password_updates_password(self):
        user = User.objects.create_user(
            email="reset@example.com",
            password="OldPass123!",
            full_name="Reset User",
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            reverse("auth-reset-password"),
            {"uid": uid, "token": token, "new_password": "NewPass123!"},
            format="json",
        )

        user.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(user.check_password("NewPass123!"))


class RolePermissionTests(TestCase):
    def test_role_permissions_match_user_roles(self):
        citizen = User(email="citizen@example.com", role=UserRole.CITIZEN)
        authority = User(email="authority@example.com", role=UserRole.AUTHORITY)
        super_admin = User(email="admin@example.com", role=UserRole.SUPER_ADMIN)

        class Request:
            def __init__(self, user):
                self.user = user

        self.assertTrue(IsCitizen().has_permission(Request(citizen), None))
        self.assertTrue(IsAuthority().has_permission(Request(authority), None))
        self.assertTrue(IsSuperAdmin().has_permission(Request(super_admin), None))
        self.assertFalse(IsCitizen().has_permission(Request(authority), None))

    def test_captcha_generation_and_login_validation(self):
        # 1. Generate captcha
        res = self.client.get(reverse("auth-captcha"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("captcha_key", res.data)
        self.assertIn("captcha_svg", res.data)

        # 2. Test login with wrong captcha
        user = User.objects.create_user(
            email="captchatest@example.com",
            password="StrongPassword123!",
            full_name="Captcha User",
            role=UserRole.CITIZEN,
        )
        fail_res = self.client.post(
            reverse("auth-login"),
            {
                "email": "captchatest@example.com",
                "password": "StrongPassword123!",
                "captcha_key": res.data["captcha_key"],
                "captcha_code": "WRONG9",
            },
            format="json",
        )
        self.assertEqual(fail_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("captcha_code", fail_res.data)

        # 3. Test login with valid captcha
        from apps.accounts.captcha import CAPTCHA_SALT
        from django.core.signing import TimestampSigner
        raw_code = TimestampSigner(salt=CAPTCHA_SALT).unsign(res.data["captcha_key"])

        success_res = self.client.post(
            reverse("auth-login"),
            {
                "email": "captchatest@example.com",
                "password": "StrongPassword123!",
                "captcha_key": res.data["captcha_key"],
                "captcha_code": raw_code,
            },
            format="json",
        )
        self.assertEqual(success_res.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", success_res.data)
