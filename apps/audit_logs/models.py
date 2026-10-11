import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditAction(models.TextChoices):
    AUTH_LOGIN = "AUTH_LOGIN", _("User Login")
    AUTH_LOGOUT = "AUTH_LOGOUT", _("User Logout")
    AUTH_REGISTER = "AUTH_REGISTER", _("User Registration")
    PASSWORD_CHANGE = "PASSWORD_CHANGE", _("Password Changed")
    PROFILE_UPDATE = "PROFILE_UPDATE", _("Profile Updated")

    COMPLAINT_CREATED = "COMPLAINT_CREATED", _("Complaint Created")
    COMPLAINT_STATUS_UPDATE = "COMPLAINT_STATUS_UPDATE", _("Complaint Status Updated")
    COMPLAINT_PRIORITY_UPDATE = "COMPLAINT_PRIORITY_UPDATE", _("Complaint Priority Updated")
    COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED", _("Authority Assigned to Complaint")

    DEPARTMENT_CREATED = "DEPARTMENT_CREATED", _("Department Created")
    DEPARTMENT_UPDATED = "DEPARTMENT_UPDATED", _("Department Updated")
    AUTHORITY_ASSIGNED = "AUTHORITY_ASSIGNED", _("Authority Assigned to Department")

    FEEDBACK_SUBMITTED = "FEEDBACK_SUBMITTED", _("Feedback Submitted")
    AI_TRIAGE_RUN = "AI_TRIAGE_RUN", _("AI Triage Executed")
    SYSTEM_EVENT = "SYSTEM_EVENT", _("System Event")


class AuditLog(models.Model):
    """Immutable enterprise security audit trail and activity log."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor_email = models.CharField(max_length=255, blank=True, default="system@civicsetu.internal")
    actor_role = models.CharField(max_length=30, blank=True, default="SYSTEM")
    action = models.CharField(
        max_length=50,
        choices=AuditAction.choices,
        default=AuditAction.SYSTEM_EVENT,
    )
    entity_type = models.CharField(
        max_length=50,
        help_text=_("Type of entity affected (e.g. Complaint, User, Department, Feedback)"),
    )
    entity_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text=_("Identifier or tracking code of affected entity"),
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, default="")
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Additional context, diffs, or payload attributes"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor_email"], name="idx_audit_actor_email"),
            models.Index(fields=["action"], name="idx_audit_action"),
            models.Index(fields=["entity_type"], name="idx_audit_entity_type"),
            models.Index(fields=["created_at"], name="idx_audit_created_at"),
        ]

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M:%S}] {self.actor_email} ({self.actor_role}) -> {self.action} on {self.entity_type} ({self.entity_id})"
