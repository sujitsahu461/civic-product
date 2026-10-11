import logging
from typing import Any, Dict, Optional

from django.db.models import Count, Q
from django.utils import timezone

from apps.audit_logs.models import AuditAction, AuditLog

logger = logging.getLogger(__name__)


class AuditLogService:
    """Service to capture and query enterprise security audit logs."""

    @staticmethod
    def get_client_ip(request) -> Optional[str]:
        """Extract client IP from request headers, handling proxies safely."""
        if not request:
            return None
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    @classmethod
    def log_action(
        cls,
        action: str,
        entity_type: str,
        entity_id: str = "",
        actor=None,
        request=None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Create and persist an immutable audit trail entry."""
        actor_email = "system@civicsetu.internal"
        actor_role = "SYSTEM"
        ip_address = None
        user_agent = ""

        if actor and getattr(actor, "is_authenticated", False):
            actor_email = getattr(actor, "email", str(actor))
            actor_role = getattr(actor, "role", "USER")

        if request:
            ip_address = cls.get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
            if not actor and hasattr(request, "user") and request.user.is_authenticated:
                actor = request.user
                actor_email = request.user.email
                actor_role = getattr(request.user, "role", "USER")

        audit_entry = AuditLog.objects.create(
            actor=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
            actor_email=actor_email,
            actor_role=actor_role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
        )

        logger.info(
            "AuditLog: [%s] %s (%s) -> %s on %s:%s",
            audit_entry.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            actor_email,
            actor_role,
            action,
            entity_type,
            entity_id,
        )
        return audit_entry

    @classmethod
    def query_logs(cls, filters: Dict[str, Any]):
        """Filter audit logs based on parameters."""
        queryset = AuditLog.objects.all()

        if filters.get("actor_email"):
            queryset = queryset.filter(actor_email__icontains=filters["actor_email"])

        if filters.get("action"):
            queryset = queryset.filter(action=filters["action"])

        if filters.get("entity_type"):
            queryset = queryset.filter(entity_type__iexact=filters["entity_type"])

        if filters.get("start_date"):
            queryset = queryset.filter(created_at__gte=filters["start_date"])

        if filters.get("end_date"):
            queryset = queryset.filter(created_at__lte=filters["end_date"])

        if filters.get("search"):
            term = filters["search"]
            queryset = queryset.filter(
                Q(actor_email__icontains=term)
                | Q(entity_id__icontains=term)
                | Q(entity_type__icontains=term)
                | Q(action__icontains=term)
            )

        return queryset

    @classmethod
    def get_audit_summary(cls) -> Dict[str, Any]:
        """Aggregate security audit summary for Super Admin dashboard."""
        total_logs = AuditLog.objects.count()
        top_actions = list(
            AuditLog.objects.values("action")
            .annotate(count=Count("id"))
            .order_by("-count")[:6]
        )
        actions_by_role = list(
            AuditLog.objects.values("actor_role")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        security_event_count = AuditLog.objects.filter(
            action__in=[
                AuditAction.AUTH_LOGIN,
                AuditAction.AUTH_REGISTER,
                AuditAction.PASSWORD_CHANGE,
            ]
        ).count()

        return {
            "total_audit_events": total_logs,
            "security_events_count": security_event_count,
            "top_actions": top_actions,
            "actions_by_role": actions_by_role,
            "last_active": timezone.now().isoformat(),
        }
