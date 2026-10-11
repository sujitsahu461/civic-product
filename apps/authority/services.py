import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, F, Q
from django.utils import timezone

from apps.accounts.models import UserRole
from apps.complaint_history.models import ComplaintHistory, HistoryAction
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from apps.complaints.services import ComplaintService
from apps.notifications.models import Notification, NotificationType


User = get_user_model()
logger = logging.getLogger(__name__)


# ===========================================================================
# Notification Service
# ===========================================================================


class NotificationService:
    """Lifecycle management for in-app notifications."""

    @staticmethod
    def create_notification(recipient, title, message, notification_type, complaint=None):
        """Create and persist a notification."""
        notif = Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            complaint=complaint,
        )
        logger.info("Notification sent to %s: %s", recipient.email, title)
        return notif

    @staticmethod
    def get_notifications(user, is_read=None):
        """Return user's notifications, optionally filtered by read status."""
        qs = Notification.objects.filter(recipient=user).select_related("complaint")
        if is_read is not None:
            qs = qs.filter(is_read=is_read)
        return qs.order_by("-created_at")

    @staticmethod
    def mark_as_read(notification_ids, user):
        """Mark specific notifications as read for a user."""
        updated = Notification.objects.filter(
            public_id__in=notification_ids, recipient=user, is_read=False
        ).update(is_read=True)
        return updated

    @staticmethod
    def mark_all_read(user):
        """Mark all unread notifications as read for a user."""
        updated = Notification.objects.filter(
            recipient=user, is_read=False
        ).update(is_read=True)
        return updated

    @staticmethod
    def get_unread_count(user):
        """Return count of unread notifications."""
        return Notification.objects.filter(recipient=user, is_read=False).count()


# ===========================================================================
# Authority Dashboard Service
# ===========================================================================


def _authority_scoped_complaints(user):
    """Return QuerySet of ALL complaints.
    Both AUTHORITY and SUPER_ADMIN see every complaint — no department filtering.
    """
    return Complaint.objects.select_related("citizen", "assigned_authority")


class AuthorityDashboardService:
    """Dashboard aggregate data for authority users."""

    @staticmethod
    def get_dashboard_summary(user):
        """Get complaint count breakdown by status for authority's scope."""
        qs = _authority_scoped_complaints(user)
        total = qs.count()

        status_counts = {}
        for choice_val, _ in ComplaintStatus.choices:
            status_counts[choice_val.lower()] = qs.filter(status=choice_val).count()

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_new = qs.filter(created_at__gte=today_start).count()

        urgent_count = qs.filter(
            priority=ComplaintPriority.URGENT,
            status__in=[ComplaintStatus.PENDING, ComplaintStatus.IN_PROGRESS],
        ).count()

        directly_assigned = qs.filter(assigned_authority=user).count()

        return {
            "total_complaints": total,
            "directly_assigned": directly_assigned,
            "today_new": today_new,
            "urgent_active": urgent_count,
            **status_counts,
        }

    @staticmethod
    def get_recent_complaints(user, limit=5):
        """Return the N most recent complaints in the authority's scope."""
        return _authority_scoped_complaints(user).order_by("-created_at")[:limit]


# ===========================================================================
# Authority Complaint Service
# ===========================================================================


class AuthorityComplaintService:
    """Authority-specific complaint management operations."""

    @staticmethod
    def get_assigned_complaints(user, query="", status=None, priority=None, category=None):
        """Get filtered complaints scoped to the authority."""
        qs = _authority_scoped_complaints(user)

        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(tracking_code__icontains=query)
                | Q(location_address__icontains=query)
            )
        if status:
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if category:
            qs = qs.filter(category=category)

        return qs.order_by("-created_at")

    @staticmethod
    @transaction.atomic
    def update_complaint_status(complaint, authority, new_status, remarks=""):
        """Update status and notify the citizen."""
        updated = ComplaintService.update_status(complaint, authority, new_status, remarks)

        # Notify the citizen
        NotificationService.create_notification(
            recipient=complaint.citizen,
            title=f"Complaint {complaint.tracking_code} - status updated",
            message=f"Your complaint \"{complaint.title}\" has been updated to {new_status}."
                    + (f" Remarks: {remarks}" if remarks else ""),
            notification_type=NotificationType.STATUS_CHANGED,
            complaint=complaint,
        )
        return updated

    @staticmethod
    @transaction.atomic
    def add_resolution_notes(complaint, authority, notes):
        """Append resolution notes and log a history event."""
        complaint.resolution_notes = notes
        complaint.save(update_fields=["resolution_notes", "updated_at"])

        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=authority,
            action=HistoryAction.NOTE_ADDED,
            remarks=f"Resolution notes updated: {notes[:100]}...",
        )

        # Notify citizen
        NotificationService.create_notification(
            recipient=complaint.citizen,
            title=f"Resolution update on {complaint.tracking_code}",
            message=f"Notes have been added to your complaint \"{complaint.title}\".",
            notification_type=NotificationType.RESOLUTION_UPDATE,
            complaint=complaint,
        )

        logger.info(
            "Resolution notes added to %s by %s", complaint.tracking_code, authority.email
        )
        return complaint

    @staticmethod
    @transaction.atomic
    def upload_resolution_image(complaint, authority, image_file, caption=""):
        """Upload a resolution evidence image."""
        caption = caption or "Resolution evidence"
        img = ComplaintService.add_image(complaint, authority, image_file, caption)
        return img

    @staticmethod
    @transaction.atomic
    def update_priority(complaint, authority, new_priority, remarks=""):
        """Update complaint priority and log a history event."""
        old_priority = complaint.priority
        if old_priority == new_priority:
            return complaint

        complaint.priority = new_priority
        complaint.save(update_fields=["priority", "updated_at"])

        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=authority,
            action=HistoryAction.STATUS_CHANGED,
            old_status=old_priority,
            new_status=new_priority,
            remarks=remarks or f"Priority changed from {old_priority} to {new_priority}.",
        )

        # Notify citizen
        NotificationService.create_notification(
            recipient=complaint.citizen,
            title=f"Priority changed on {complaint.tracking_code}",
            message=f"Your complaint \"{complaint.title}\" priority changed to {new_priority}.",
            notification_type=NotificationType.PRIORITY_CHANGED,
            complaint=complaint,
        )

        logger.info(
            "Complaint %s priority updated: %s -> %s by %s",
            complaint.tracking_code,
            old_priority,
            new_priority,
            authority.email,
        )
        return complaint


# ===========================================================================
# Authority Analytics Service
# ===========================================================================


class AuthorityAnalyticsService:
    """Analytics and reporting data for authority dashboards."""

    @staticmethod
    def get_complaint_stats(user, days=30):
        """Status breakdown, resolution time, real SLA compliance, and daily trend for the authority's scope."""
        qs = _authority_scoped_complaints(user)
        cutoff = timezone.now() - timedelta(days=days)
        period_qs = qs.filter(created_at__gte=cutoff)

        # Status breakdown
        status_breakdown = {}
        total = period_qs.count()
        for choice_val, label in ComplaintStatus.choices:
            count = period_qs.filter(status=choice_val).count()
            status_breakdown[choice_val.lower()] = {
                "count": count,
                "percentage": round((count / total * 100), 1) if total > 0 else 0.0,
            }

        # Average resolution time (only resolved complaints in period)
        resolved = qs.filter(
            status=ComplaintStatus.RESOLVED,
            resolved_at__isnull=False,
            created_at__gte=cutoff,
        )
        avg_resolution = resolved.aggregate(
            avg_hours=Avg(F("resolved_at") - F("created_at"))
        )["avg_hours"]

        avg_resolution_hours = None
        if avg_resolution:
            avg_resolution_hours = round(avg_resolution.total_seconds() / 3600, 1)

        # Real SLA Compliance Rate:
        # Standard Civic SLA Benchmark is 24.0 hours.
        resolved_count = resolved.count()
        if resolved_count > 0:
            within_sla = 0
            for c in resolved:
                if c.resolved_at and c.created_at:
                    dur_hours = (c.resolved_at - c.created_at).total_seconds() / 3600
                    if dur_hours <= 24.0:
                        within_sla += 1
            sla_compliance_rate = round((within_sla / resolved_count) * 100, 1)
        else:
            breached = period_qs.filter(
                status__in=[ComplaintStatus.PENDING, ComplaintStatus.IN_PROGRESS],
                created_at__lt=timezone.now() - timedelta(hours=24),
            ).count()
            sla_compliance_rate = round(((total - breached) / total * 100), 1) if total > 0 else 100.0

        # Daily trend (immune to MySQL timezone table / CONVERT_TZ limitations)
        daily_counts = {}
        for dt in period_qs.values_list("created_at", flat=True):
            if dt:
                loc_d = timezone.localtime(dt).date()
                daily_counts[loc_d] = daily_counts.get(loc_d, 0) + 1

        daily_trend = []
        today = timezone.localtime(timezone.now()).date()
        for i in range(min(days, 14)):
            day = today - timedelta(days=i)
            daily_trend.append({"date": str(day), "count": daily_counts.get(day, 0)})

        # Aggregate citizen feedbacks within this scope
        from apps.feedback.models import Feedback
        feedbacks_qs = Feedback.objects.filter(complaint__in=qs)
        total_feedbacks = feedbacks_qs.count()
        avg_rating = feedbacks_qs.aggregate(avg=Avg("rating"))["avg"] or 0.0

        return {
            "period_days": days,
            "total_complaints": total,
            "status_breakdown": status_breakdown,
            "avg_resolution_hours": avg_resolution_hours,
            "sla_compliance_rate": sla_compliance_rate,
            "daily_trend": list(reversed(daily_trend)),
            "total_feedbacks": total_feedbacks,
            "average_rating": round(float(avg_rating), 1),
        }

    @staticmethod
    def get_category_performance(user, days=None):
        """Per-category complaint performance stats with optional timeframe filtering."""
        qs = _authority_scoped_complaints(user)
        if days:
            cutoff = timezone.now() - timedelta(days=int(days))
            qs = qs.filter(created_at__gte=cutoff)

        categories = []
        for choice_val, label in ComplaintCategory.choices:
            cat_qs = qs.filter(category=choice_val)
            total = cat_qs.count()
            resolved = cat_qs.filter(status=ComplaintStatus.RESOLVED).count()
            pending = cat_qs.filter(status=ComplaintStatus.PENDING).count()
            in_progress = cat_qs.filter(status=ComplaintStatus.IN_PROGRESS).count()

            categories.append({
                "category": choice_val,
                "category_display": str(label),
                "total": total,
                "resolved": resolved,
                "pending": pending,
                "in_progress": in_progress,
                "resolution_rate": round((resolved / total * 100), 1) if total > 0 else 0.0,
            })

        # Sort with highest total volume first so authorities immediately see active domains
        categories.sort(key=lambda x: x["total"], reverse=True)
        return categories

    get_department_performance = get_category_performance

    @staticmethod
    def get_priority_breakdown(user):
        """Count and percentage by priority level."""
        qs = _authority_scoped_complaints(user)
        total = qs.count()

        breakdown = []
        for choice_val, label in ComplaintPriority.choices:
            count = qs.filter(priority=choice_val).count()
            breakdown.append({
                "priority": choice_val,
                "label": str(label),
                "count": count,
                "percentage": round((count / total * 100), 1) if total > 0 else 0.0,
            })

        return {"total": total, "breakdown": breakdown}
