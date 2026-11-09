from rest_framework import serializers

from apps.complaints.models import Complaint
from apps.feedback.models import Feedback, ResolutionQuality, SatisfactionLevel, TimelinessRating


class FeedbackCreateSerializer(serializers.Serializer):
    """Serializer for submitting citizen feedback on a resolved complaint."""

    complaint_public_id = serializers.UUIDField(
        help_text="Public UUID of the resolved complaint"
    )
    rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        help_text="Rating score from 1 (lowest) to 5 (highest)",
    )
    satisfaction_level = serializers.ChoiceField(
        choices=SatisfactionLevel.choices,
        default=SatisfactionLevel.SATISFIED,
    )
    resolution_quality = serializers.ChoiceField(
        choices=ResolutionQuality.choices,
        default=ResolutionQuality.GOOD,
    )
    timeliness = serializers.ChoiceField(
        choices=TimelinessRating.choices,
        default=TimelinessRating.ON_TIME,
    )
    comments = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
        default="",
    )
    is_issue_resolved = serializers.BooleanField(
        default=True,
        help_text="Whether the citizen confirms the grievance has been solved",
    )


class FeedbackDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Feedback instances."""

    complaint_public_id = serializers.UUIDField(source="complaint.public_id", read_only=True)
    complaint_tracking_code = serializers.CharField(source="complaint.tracking_code", read_only=True)
    complaint_title = serializers.CharField(source="complaint.title", read_only=True)
    complaint_category = serializers.CharField(source="complaint.category", read_only=True)
    citizen_email = serializers.EmailField(source="citizen.email", read_only=True)
    citizen_name = serializers.CharField(source="citizen.full_name", read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "public_id",
            "complaint_public_id",
            "complaint_tracking_code",
            "complaint_title",
            "complaint_category",
            "citizen_email",
            "citizen_name",
            "rating",
            "satisfaction_level",
            "resolution_quality",
            "timeliness",
            "comments",
            "is_issue_resolved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DepartmentFeedbackStatsSerializer(serializers.Serializer):
    """Serializer for department feedback aggregation metrics."""

    department = serializers.CharField()
    total_feedbacks = serializers.IntegerField()
    average_rating = serializers.FloatField()
    satisfaction_rate_percent = serializers.FloatField()
    resolution_confirmed_percent = serializers.FloatField()
    rating_distribution = serializers.DictField(child=serializers.IntegerField())


class AuthorityFeedbackStatsSerializer(serializers.Serializer):
    """Serializer for authority-level feedback metrics."""

    authority_email = serializers.EmailField()
    total_feedbacks = serializers.IntegerField()
    average_rating = serializers.FloatField()
    satisfaction_rate_percent = serializers.FloatField()
    rating_distribution = serializers.DictField(child=serializers.IntegerField())
