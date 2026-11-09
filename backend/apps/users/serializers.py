import os

from PIL import Image
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import UserRole, UserStatus
from apps.departments.serializers import UserDepartmentAssignmentSerializer


User = get_user_model()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


# ---------------------------------------------------------------------------
# Profile serializers (read-only)
# ---------------------------------------------------------------------------


class CitizenProfileSerializer(serializers.ModelSerializer):
    """Read-only profile tailored for citizen users."""

    class Meta:
        model = User
        fields = (
            "public_id",
            "email",
            "full_name",
            "phone",
            "bio",
            "address",
            "profile_image",
            "created_at",
        )
        read_only_fields = fields


class AuthorityProfileSerializer(serializers.ModelSerializer):
    """Read-only profile tailored for authority users — includes department assignments."""

    departments = UserDepartmentAssignmentSerializer(
        source="department_assignments", many=True, read_only=True
    )

    class Meta:
        model = User
        fields = (
            "public_id",
            "email",
            "full_name",
            "phone",
            "bio",
            "address",
            "departments",
            "profile_image",
            "created_at",
        )
        read_only_fields = fields


class AdminProfileSerializer(serializers.ModelSerializer):
    """Full read-only profile for super-admin users — includes all fields."""

    departments = UserDepartmentAssignmentSerializer(
        source="department_assignments", many=True, read_only=True
    )

    class Meta:
        model = User
        fields = (
            "public_id",
            "email",
            "full_name",
            "phone",
            "role",
            "status",
            "bio",
            "address",
            "departments",
            "profile_image",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Update profile
# ---------------------------------------------------------------------------


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Writable serializer for self-service profile updates.

    Citizens and authorities may update: full_name, phone, bio, address.
    Department/designation assignment is managed via the departments module.
    """

    class Meta:
        model = User
        fields = (
            "full_name",
            "phone",
            "bio",
            "address",
        )

    def validate_phone(self, value):
        if not value:
            return value
        # Ensure phone uniqueness across other users.
        user = self.context["request"].user
        if User.objects.filter(phone=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This phone number is already in use.")
        return value


# ---------------------------------------------------------------------------
# Profile image upload
# ---------------------------------------------------------------------------


class ProfileImageSerializer(serializers.Serializer):
    """Accepts a profile image file with size and type validation."""

    profile_image = serializers.ImageField()

    def validate_profile_image(self, value):
        if value.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError(
                f"Image size must be under {MAX_IMAGE_SIZE // (1024 * 1024)} MB."
            )
        if value.content_type not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f"Unsupported image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}."
            )

        try:
            pil_img = Image.open(value)
            pil_img.verify()
            if pil_img.format not in {"JPEG", "PNG", "WEBP"}:
                raise serializers.ValidationError(
                    f"Unsupported image encoding '{pil_img.format}'. Allowed: JPEG, PNG, WEBP."
                )
        except Exception as exc:
            raise serializers.ValidationError(f"Invalid or corrupted image file: {exc}") from exc
        finally:
            if hasattr(value, "seek"):
                value.seek(0)

        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        # Delete old image file if it exists.
        if user.profile_image:
            old_path = user.profile_image.path
            if os.path.isfile(old_path):
                os.remove(old_path)
        user.profile_image = self.validated_data["profile_image"]
        user.save(update_fields=["profile_image", "updated_at"])
        return user


# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------


class ChangePasswordSerializer(serializers.Serializer):
    """Validates old password, then sets the new one."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "New password and confirm password do not match."}
            )
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password cannot be the same as the current password."}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        return user


# ---------------------------------------------------------------------------
# User search (admin)
# ---------------------------------------------------------------------------


class UserSearchSerializer(serializers.ModelSerializer):
    """Output serializer for admin user search results."""

    departments = UserDepartmentAssignmentSerializer(
        source="department_assignments", many=True, read_only=True
    )
    department_name = serializers.SerializerMethodField()
    designation = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "public_id",
            "email",
            "full_name",
            "phone",
            "role",
            "status",
            "department",
            "department_name",
            "designation",
            "bio",
            "address",
            "departments",
            "profile_image",
            "is_active",
            "created_at",
        )
        read_only_fields = fields

    def get_department_name(self, obj):
        if obj.department:
            return obj.department
        first_dept = obj.department_assignments.first()
        if first_dept and first_dept.department:
            return first_dept.department.name
        return None

    def get_designation(self, obj):
        if obj.designation:
            return obj.designation
        first_dept = obj.department_assignments.first()
        if first_dept and first_dept.designation:
            return first_dept.designation
        return "Nodal Officer" if obj.role == UserRole.AUTHORITY else None


class UserSearchFilterSerializer(serializers.Serializer):
    """Query parameter serializer for search & filter."""

    q = serializers.CharField(required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(
        choices=UserRole.choices, required=False, allow_blank=True, allow_null=True
    )
    status = serializers.ChoiceField(
        choices=UserStatus.choices, required=False, allow_blank=True, allow_null=True
    )
