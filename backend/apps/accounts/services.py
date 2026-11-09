from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole


User = get_user_model()


class UserRegistrationService:
    @staticmethod
    @transaction.atomic
    def register_user(
        email,
        password,
        full_name,
        phone="",
        role=UserRole.CITIZEN,
        address="",
        department="",
        designation="",
        **kwargs,
    ):
        is_admin = role == UserRole.SUPER_ADMIN
        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            phone=(phone or "").strip() or None,
            role=role,
            address=address or "",
            department=department or "",
            designation=designation or "",
            is_staff=is_admin,
            is_superuser=is_admin,
        )

        return user


class TokenService:
    @staticmethod
    def issue_tokens(user):
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["email"] = user.email

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

    @staticmethod
    def refresh_tokens(refresh_token):
        try:
            refresh = RefreshToken(refresh_token)
            return {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        except TokenError as exc:
            raise ValueError("Invalid refresh token.") from exc

    @staticmethod
    def blacklist_refresh_token(refresh_token):
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError as exc:
            raise ValueError("Invalid refresh token.") from exc


class PasswordResetService:
    @staticmethod
    def send_reset_email(email, request=None):
        import logging
        from datetime import datetime
        from urllib.parse import urlparse

        logger = logging.getLogger(__name__)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            return

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Determine user-facing frontend reset URL
        frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
        if not frontend_url and request is not None:
            origin = request.headers.get("Origin") or request.headers.get("Referer")
            if origin:
                parsed = urlparse(origin)
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"
            else:
                frontend_url = request.build_absolute_uri("/").rstrip("/")
        if not frontend_url:
            frontend_url = "http://localhost:5173"

        reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

        user_display_name = user.full_name or user.email.split("@")[0]
        subject = "CivicSetu — Official Password Reset Request"
        plain_message = (
            f"Hello {user_display_name},\n\n"
            f"We received a request to reset your password for your CivicSetu account ({user.email}).\n\n"
            f"Please click or visit the link below to set a new password:\n{reset_url}\n\n"
            f"Security Notice:\n"
            f"- This link is valid for 1 hour.\n"
            f"- If you did not request this password reset, your account is still secure and you can ignore this email.\n\n"
            f"Sincerely,\n"
            f"CivicSetu Redressal & Security Administration\n"
            f"National Civic Engagement Platform"
        )

        year = datetime.now().year
        html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Reset your CivicSetu password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07090e; color: #e2e8f0; margin: 0; padding: 28px 16px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d111d; border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">CivicSetu</span>
              <span style="display: inline-block; margin-left: 10px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); text-transform: uppercase;">Security Dispatch</span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 16px 0;">Password Reset Request</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0;">
                Hello <strong style="color: #f1f5f9;">{user_display_name}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
                We received an official request to reset the password for your registered CivicSetu account (<strong style="color: #60a5fa;">{user.email}</strong>). Click the button below to choose a new password.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; font-size: 14px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                  Reset My Password
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 24px 0 8px 0;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <div style="background: #06080e; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; word-break: break-all; font-family: monospace; font-size: 12px; color: #38bdf8; margin-bottom: 24px;">
                {reset_url}
              </div>
              <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 12px 14px; border-radius: 4px; margin-top: 20px;">
                <p style="font-size: 12px; color: #fbbf24; margin: 0; line-height: 1.5;">
                  <strong>Notice:</strong> This secure reset token will expire in <strong>1 hour</strong>. If you did not request this password reset, your account credentials remain unchanged and no further action is needed.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #05070c; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
              <p style="font-size: 11px; color: #475569; margin: 0;">
                &copy; {year} CivicSetu National Civic Engagement & Municipal Grievance Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        # Check if SMTP credentials are provided
        smtp_user = getattr(settings, "EMAIL_HOST_USER", "")
        smtp_password = getattr(settings, "EMAIL_HOST_PASSWORD", "")
        backend = getattr(settings, "EMAIL_BACKEND", "")
        is_smtp_backend = "smtp" in backend.lower()

        sent = False
        smtp_error = None

        if is_smtp_backend and (not smtp_user or not smtp_password):
            smtp_error = (
                "SMTP email credentials (EMAIL_HOST_USER and EMAIL_HOST_PASSWORD) are not yet configured in .env. "
                "Configure your Gmail address and 16-character App Password in .env to deliver real emails to your inbox."
            )
            logger.warning(
                "SMTP delivery skipped for %s: EMAIL_HOST_USER or EMAIL_HOST_PASSWORD is empty in .env.",
                user.email,
            )
            if getattr(settings, "DEBUG", False):
                print(f"\n[CivicSetu Password Reset Link]: {reset_url}\n")
            return {
                "sent": False,
                "smtp_error": smtp_error,
                "reset_url": reset_url,
                "user_found": True,
            }

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "CivicSetu Support <noreply@civicsetu.gov.in>"),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info("Password reset email sent via SMTP to %s", user.email)
            sent = True
        except Exception as exc:
            logger.exception("Failed sending password reset email to %s: %s", user.email, exc)
            smtp_error = f"SMTP Server connection error: {str(exc)}"
            if getattr(settings, "DEBUG", False):
                print(f"\n[CivicSetu Password Reset Link]: {reset_url}\n")

        return {
            "sent": sent,
            "smtp_error": smtp_error,
            "reset_url": reset_url,
            "user_found": True,
        }

    @staticmethod
    def is_valid_token(user, token):
        return default_token_generator.check_token(user, token)

    @staticmethod
    @transaction.atomic
    def reset_password(user, new_password):
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
