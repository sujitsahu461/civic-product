import logging
from django.db import transaction
from django.db.models import Avg, Count, Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.complaint_history.models import ComplaintHistory, HistoryAction
from apps.complaints.models import Complaint, ComplaintStatus
from apps.feedback.models import Feedback
from apps.notifications.models import Notification, NotificationType

logger = logging.getLogger(__name__)


class FeedbackService:
    """Business logic for grievance resolution feedback and rating."""

    @staticmethod
    @transaction.atomic
    def submit_feedback(complaint: Complaint, citizen, validated_data: dict) -> Feedback:
        """Submit feedback for a resolved complaint."""
        from apps.accounts.models import UserRole
        if complaint.citizen_id != citizen.id and getattr(citizen, "role", None) != UserRole.SUPER_ADMIN:
            raise PermissionDenied("You can only submit feedback for your own complaints.")

        if complaint.status not in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED):
            raise ValidationError("Feedback can only be submitted for resolved or closed complaints.")

        if hasattr(complaint, "feedback") and complaint.feedback is not None:
            raise ValidationError("Feedback has already been submitted for this complaint.")

        rating = validated_data.get("rating")
        satisfaction_level = validated_data.get("satisfaction_level", "SATISFIED")
        resolution_quality = validated_data.get("resolution_quality", "GOOD")
        timeliness = validated_data.get("timeliness", "ON_TIME")
        comments = validated_data.get("comments", "")
        is_issue_resolved = validated_data.get("is_issue_resolved", True)

        feedback = Feedback.objects.create(
            complaint=complaint,
            citizen=citizen,
            rating=rating,
            satisfaction_level=satisfaction_level,
            resolution_quality=resolution_quality,
            timeliness=timeliness,
            comments=comments,
            is_issue_resolved=is_issue_resolved,
        )

        # Log to complaint timeline
        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=citizen,
            action=HistoryAction.NOTE_ADDED,
            old_status=complaint.status,
            new_status=complaint.status,
            remarks=f"Citizen submitted resolution feedback: {rating}/5 stars. Comments: \"{comments[:100]}\"",
        )

        # Notify authority officers
        from django.contrib.auth import get_user_model
        User = get_user_model()
        recipients = set()
        if complaint.assigned_authority:
            recipients.add(complaint.assigned_authority)
        else:
            for auth_user in User.objects.filter(role__in=[UserRole.AUTHORITY, UserRole.SUPER_ADMIN]):
                recipients.add(auth_user)

        for recipient in recipients:
            Notification.objects.create(
                recipient=recipient,
                title=f"Citizen Feedback Received: {complaint.tracking_code}",
                message=f"Citizen rated resolution {rating}/5 stars ({satisfaction_level}): \"{comments[:100]}\"",
                notification_type=NotificationType.RESOLUTION_UPDATE,
                complaint=complaint,
            )

        logger.info(
            "Feedback submitted for complaint %s by %s (rating=%d)",
            complaint.tracking_code,
            citizen.email,
            rating,
        )
        return feedback

    @staticmethod
    def get_department_feedback_metrics(department_name_or_category: str) -> dict:
        """Calculate aggregate feedback metrics for a specific department/category."""
        feedbacks = Feedback.objects.filter(
            complaint__category__iexact=department_name_or_category
        )

        total_feedbacks = feedbacks.count()
        if total_feedbacks == 0:
            return {
                "department": department_name_or_category,
                "total_feedbacks": 0,
                "average_rating": 0.0,
                "satisfaction_rate_percent": 0.0,
                "resolution_confirmed_percent": 0.0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            }

        avg_rating = feedbacks.aggregate(avg=Avg("rating"))["avg"] or 0.0
        satisfied_count = feedbacks.filter(rating__gte=4).count()
        resolved_confirmed_count = feedbacks.filter(is_issue_resolved=True).count()

        # Distribution count per star
        distribution = {i: 0 for i in range(1, 6)}
        counts_by_star = feedbacks.values("rating").annotate(count=Count("id"))
        for item in counts_by_star:
            distribution[item["rating"]] = item["count"]

        return {
            "department": department_name_or_category,
            "total_feedbacks": total_feedbacks,
            "average_rating": round(float(avg_rating), 2),
            "satisfaction_rate_percent": round((satisfied_count / total_feedbacks) * 100, 1),
            "resolution_confirmed_percent": round((resolved_confirmed_count / total_feedbacks) * 100, 1),
            "rating_distribution": distribution,
        }

    @staticmethod
    def get_authority_feedback_metrics(authority_user) -> dict:
        """Calculate feedback metrics for complaints resolved by a specific authority."""
        feedbacks = Feedback.objects.filter(complaint__assigned_authority=authority_user)

        total_feedbacks = feedbacks.count()
        if total_feedbacks == 0:
            return {
                "authority_email": authority_user.email,
                "total_feedbacks": 0,
                "average_rating": 0.0,
                "satisfaction_rate_percent": 0.0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            }

        avg_rating = feedbacks.aggregate(avg=Avg("rating"))["avg"] or 0.0
        satisfied_count = feedbacks.filter(rating__gte=4).count()

        distribution = {i: 0 for i in range(1, 6)}
        counts_by_star = feedbacks.values("rating").annotate(count=Count("id"))
        for item in counts_by_star:
            distribution[item["rating"]] = item["count"]

        return {
            "authority_email": authority_user.email,
            "total_feedbacks": total_feedbacks,
            "average_rating": round(float(avg_rating), 2),
            "satisfaction_rate_percent": round((satisfied_count / total_feedbacks) * 100, 1),
            "rating_distribution": distribution,
        }
