from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import UserRole
from apps.departments.models import Department, DepartmentAuthority, DepartmentStatus


User = get_user_model()


# ---------------------------------------------------------------------------
# Department serializers
# ---------------------------------------------------------------------------


class DepartmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for department list views."""

    class Meta:
        model = Department
        fields = ("public_id", "name", "slug", "status", "created_at")
        read_only_fields = fields


class DepartmentSerializer(serializers.ModelSerializer):
    """Full read-only serializer for department detail."""

    authority_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = (
            "public_id",
            "name",
            "slug",
            "description",
            "contact_email",
            "contact_phone",
            "status",
            "authority_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_authority_count(self, obj):
        return obj.authorities.count()


class DepartmentCreateSerializer(serializers.Serializer):
    """Validates input for creating a new department."""

    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    contact_email = serializers.EmailField(required=False, allow_blank=True, default="")
    contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")

    def validate_name(self, value):
        if Department.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A department with this name already exists.")
        return value


class DepartmentUpdateSerializer(serializers.Serializer):
    """Validates input for updating a department."""

    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_name(self, value):
        department = self.context.get("department")
        if (
            department
            and Department.objects.filter(name__iexact=value)
            .exclude(pk=department.pk)
            .exists()
        ):
            raise serializers.ValidationError("A department with this name already exists.")
        return value


# ---------------------------------------------------------------------------
# Authority assignment serializers
# ---------------------------------------------------------------------------


class AuthorityUserInlineSerializer(serializers.ModelSerializer):
    """Minimal user info embedded inside authority assignment responses."""

    class Meta:
        model = User
        fields = ("public_id", "email", "full_name", "phone")
        read_only_fields = fields


class DepartmentAuthoritySerializer(serializers.ModelSerializer):
    """Read-only serializer for a department authority assignment."""

    user = AuthorityUserInlineSerializer(read_only=True)

    class Meta:
        model = DepartmentAuthority
        fields = ("user", "designation", "is_head", "assigned_at")
        read_only_fields = fields


class AssignAuthoritySerializer(serializers.Serializer):
    """Validates input for assigning an authority to a department."""

    user_public_id = serializers.UUIDField()
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    is_head = serializers.BooleanField(required=False, default=False)

    def validate_user_public_id(self, value):
        try:
            user = User.objects.get(public_id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        if user.role != UserRole.AUTHORITY:
            raise serializers.ValidationError("Only users with the AUTHORITY role can be assigned.")

        # Stash for use in the view
        self._resolved_user = user
        return value


class UpdateAuthoritySerializer(serializers.Serializer):
    """Validates input for updating an authority assignment."""

    designation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    is_head = serializers.BooleanField(required=False)


# ---------------------------------------------------------------------------
# Statistics serializer
# ---------------------------------------------------------------------------


class DepartmentStatisticsSerializer(serializers.Serializer):
    """Read-only output serializer for department statistics."""

    department = serializers.CharField()
    public_id = serializers.CharField()
    status = serializers.CharField()
    total_authorities = serializers.IntegerField()
    department_heads = serializers.IntegerField()


# ---------------------------------------------------------------------------
# Nested serializer for User profile views
# ---------------------------------------------------------------------------


class UserDepartmentAssignmentSerializer(serializers.ModelSerializer):
    """Shows a user's department assignment — used inside user profile serializers."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    department_public_id = serializers.UUIDField(source="department.public_id", read_only=True)

    class Meta:
        model = DepartmentAuthority
        fields = ("department_public_id", "department_name", "designation", "is_head", "assigned_at")
        read_only_fields = fields
