from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import UserRole
from apps.complaint_history.models import ComplaintHistory, HistoryAction
from apps.complaint_images.models import ComplaintImage
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus


User = get_user_model()


# ---------------------------------------------------------------------------
# Inline User & Image serializers
# ---------------------------------------------------------------------------


class ComplaintUserInlineSerializer(serializers.ModelSerializer):
    """Minimal representation of user inside complaint payloads."""

    class Meta:
        model = User
        fields = ("public_id", "email", "full_name", "phone", "role")
        read_only_fields = fields


class PublicComplaintUserInlineSerializer(serializers.ModelSerializer):
    """Sanitized public representation of an actor in audit/history logs."""

    class Meta:
        model = User
        fields = ("public_id", "full_name", "role")
        read_only_fields = fields


class ComplaintImageSerializer(serializers.ModelSerializer):
    """Read-only image attachment representation."""

    class Meta:
        model = ComplaintImage
        fields = ("public_id", "image", "caption", "uploaded_at")
        read_only_fields = fields


class ComplaintHistorySerializer(serializers.ModelSerializer):
    """Read-only audit history timeline entry."""

    actor = PublicComplaintUserInlineSerializer(read_only=True)

    class Meta:
        model = ComplaintHistory
        fields = ("public_id", "actor", "action", "old_status", "new_status", "remarks", "created_at")
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Complaint CRUD serializers
# ---------------------------------------------------------------------------


class ComplaintFeedbackInlineSerializer(serializers.ModelSerializer):
    """Feedback details submitted by citizen upon grievance resolution."""

    citizen_name = serializers.CharField(source="citizen.full_name", read_only=True)
    citizen_email = serializers.EmailField(source="citizen.email", read_only=True)

    class Meta:
        from apps.feedback.models import Feedback
        model = Feedback
        fields = (
            "public_id",
            "rating",
            "satisfaction_level",
            "resolution_quality",
            "timeliness",
            "comments",
            "is_issue_resolved",
            "citizen_name",
            "citizen_email",
            "created_at",
        )
        read_only_fields = fields


class ComplaintFeedbackPublicInlineSerializer(serializers.ModelSerializer):
    """Public feedback representation for tracking, without citizen PII."""

    class Meta:
        from apps.feedback.models import Feedback
        model = Feedback
        fields = (
            "public_id",
            "rating",
            "satisfaction_level",
            "resolution_quality",
            "timeliness",
            "comments",
            "is_issue_resolved",
            "created_at",
        )
        read_only_fields = fields


class ComplaintListSerializer(serializers.ModelSerializer):
    """Lightweight summary serializer for complaints list view."""

    citizen_name = serializers.CharField(source="citizen.full_name", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    assigned_authority_name = serializers.CharField(
        source="assigned_authority.full_name", read_only=True, default=None
    )
    image_count = serializers.SerializerMethodField()
    feedback_rating = serializers.IntegerField(source="feedback.rating", read_only=True, default=None)
    feedback_comments = serializers.CharField(source="feedback.comments", read_only=True, default=None)

    class Meta:
        model = Complaint
        fields = (
            "public_id",
            "tracking_code",
            "title",
            "description",
            "status",
            "priority",
            "category",
            "category_display",
            "citizen_name",
            "assigned_authority_name",
            "location_address",
            "latitude",
            "longitude",
            "image_count",
            "feedback_rating",
            "feedback_comments",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_image_count(self, obj):
        return obj.images.count()


class ComplaintDetailSerializer(serializers.ModelSerializer):
    """Detailed read-only complaint representation with nested images, feedback, and history."""

    citizen = ComplaintUserInlineSerializer(read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    assigned_authority = ComplaintUserInlineSerializer(read_only=True)
    images = ComplaintImageSerializer(many=True, read_only=True)
    feedback = ComplaintFeedbackInlineSerializer(read_only=True)
    latest_history = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = (
            "public_id",
            "tracking_code",
            "title",
            "description",
            "status",
            "priority",
            "category",
            "category_display",
            "citizen",
            "assigned_authority",
            "location_address",
            "latitude",
            "longitude",
            "resolution_notes",
            "images",
            "feedback",
            "latest_history",
            "created_at",
            "updated_at",
            "resolved_at",
        )
        read_only_fields = fields

    def get_latest_history(self, obj):
        latest = obj.history.select_related("actor").last()
        if latest:
            return ComplaintHistorySerializer(latest).data
        return None


class ComplaintCreateSerializer(serializers.Serializer):
    """Validates data for filing a new complaint."""

    category = serializers.ChoiceField(
        choices=ComplaintCategory.choices, required=False, allow_null=True, allow_blank=True, default=None
    )
    department_public_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    priority = serializers.ChoiceField(
        choices=ComplaintPriority.choices, required=False, allow_null=True, allow_blank=True, default=None
    )
    location_address = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    images = serializers.ListField(
        child=serializers.ImageField(), required=False, allow_empty=True, default=list
    )

    def validate_location_address(self, value):
        if not value or not str(value).strip():
            return "Unspecified Location"
        return str(value).strip()[:255]

    def validate_latitude(self, value):
        if value is None or value == "" or value == "null":
            return None
        try:
            val = float(value)
            if -90.0 <= val <= 90.0:
                return round(val, 8)
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees.")
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid latitude coordinate.")

    def validate_longitude(self, value):
        if value is None or value == "" or value == "null":
            return None
        try:
            val = float(value)
            if -180.0 <= val <= 180.0:
                return round(val, 8)
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees.")
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid longitude coordinate.")



class ComplaintStatusUpdateSerializer(serializers.Serializer):
    """Validates status transition updates."""

    status = serializers.ChoiceField(choices=ComplaintStatus.choices)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class ComplaintAssignSerializer(serializers.Serializer):
    """Validates assigning an authority to handle the complaint."""

    authority_public_id = serializers.UUIDField()
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_authority_public_id(self, value):
        try:
            authority = User.objects.get(public_id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        if authority.role != UserRole.AUTHORITY and authority.role != UserRole.SUPER_ADMIN:
            raise serializers.ValidationError("Only an authority or super admin can be assigned.")

        self._resolved_authority = authority
        return value


class ComplaintImageUploadSerializer(serializers.Serializer):
    """Validates image upload request."""

    image = serializers.ImageField()
    caption = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class ComplaintFilterSerializer(serializers.Serializer):
    """Validates query parameters for complaint filtering and search."""

    q = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=ComplaintStatus.choices, required=False)
    priority = serializers.ChoiceField(choices=ComplaintPriority.choices, required=False)
    category = serializers.ChoiceField(choices=ComplaintCategory.choices, required=False)
    citizen = serializers.UUIDField(required=False)
    assigned_authority = serializers.UUIDField(required=False)


class ComplaintTrackingSerializer(serializers.ModelSerializer):
    """Public read-only tracking serializer."""

    category_display = serializers.CharField(source="get_category_display", read_only=True)
    images = ComplaintImageSerializer(many=True, read_only=True)
    feedback = ComplaintFeedbackPublicInlineSerializer(read_only=True)

    class Meta:
        model = Complaint
        fields = (
            "public_id",
            "tracking_code",
            "title",
            "description",
            "status",
            "priority",
            "category",
            "category_display",
            "location_address",
            "resolution_notes",
            "images",
            "feedback",
            "created_at",
            "updated_at",
            "resolved_at",
        )
        read_only_fields = fields
