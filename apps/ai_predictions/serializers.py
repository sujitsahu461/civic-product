from rest_framework import serializers

from apps.ai_predictions.models import AIPredictionLog
from apps.complaints.models import ComplaintCategory, ComplaintPriority


class AITriageRequestSerializer(serializers.Serializer):
    """Input payload for classifying grievance text."""

    title = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
        default="",
        help_text="Title or subject of the complaint",
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Detailed description of the civic issue",
    )
    location_address = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Optional address or landmark for context",
    )

    def validate(self, attrs):
        title = attrs.get("title", "").strip()
        desc = attrs.get("description", "").strip()
        loc = attrs.get("location_address", "").strip()
        if not title and not desc and not loc:
            raise serializers.ValidationError(
                "At least one of 'title', 'description', or 'location_address' must be provided."
            )
        return attrs


class AITriageResponseSerializer(serializers.Serializer):
    """Output predictions including category, priority, and hazard assessment."""

    predicted_category = serializers.ChoiceField(choices=ComplaintCategory.choices)
    confidence_score = serializers.FloatField()
    urgency_score = serializers.IntegerField()
    predicted_priority = serializers.ChoiceField(choices=ComplaintPriority.choices)
    detected_keywords = serializers.ListField(child=serializers.CharField())
    hazard_tags = serializers.ListField(child=serializers.CharField())
    sentiment = serializers.CharField()
    estimated_resolution_hours = serializers.IntegerField()
    predicted_department = serializers.CharField(required=False, default="")
    requires_human_review = serializers.BooleanField(required=False, default=False)
    department_routing = serializers.DictField(required=False, default=dict)
    ml_priority_details = serializers.DictField(required=False, default=dict)



class AIDuplicateCheckRequestSerializer(serializers.Serializer):
    """Input payload for checking potential duplicate complaints."""

    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    category = serializers.ChoiceField(choices=ComplaintCategory.choices)
    latitude = serializers.FloatField(required=False, allow_null=True, default=None)
    longitude = serializers.FloatField(required=False, allow_null=True, default=None)
    radius_km = serializers.FloatField(required=False, default=1.5, min_value=0.1, max_value=25.0)


class AIDuplicateMatchSerializer(serializers.Serializer):
    """Individual match candidate in duplicate analysis."""

    complaint_public_id = serializers.UUIDField()
    tracking_code = serializers.CharField()
    title = serializers.CharField()
    status = serializers.CharField()
    location_address = serializers.CharField()
    distance_km = serializers.FloatField(allow_null=True)
    similarity_score = serializers.FloatField()
    match_confidence = serializers.CharField()
    matched_tokens = serializers.ListField(child=serializers.CharField())


class AICityInsightsSerializer(serializers.Serializer):
    """City-wide predictive civic analytics metrics."""

    total_ai_scans = serializers.IntegerField()
    average_urgency_index = serializers.FloatField()
    high_hazard_alerts_count = serializers.IntegerField()
    top_predicted_categories = serializers.ListField(child=serializers.DictField())
    category_distribution = serializers.ListField(child=serializers.DictField())
    system_readiness_status = serializers.CharField()
    model_version = serializers.CharField()
    last_updated = serializers.CharField()


class AIPredictionLogSerializer(serializers.ModelSerializer):
    """Serializer for AIPredictionLog records."""

    complaint_tracking_code = serializers.CharField(source="complaint.tracking_code", read_only=True)

    class Meta:
        model = AIPredictionLog
        fields = [
            "public_id",
            "complaint_tracking_code",
            "predicted_category",
            "confidence_score",
            "urgency_score",
            "predicted_priority",
            "detected_keywords",
            "hazard_tags",
            "sentiment",
            "estimated_resolution_hours",
            "similarity_score",
            "created_at",
        ]
        read_only_fields = fields
