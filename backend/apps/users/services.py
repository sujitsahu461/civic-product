import logging
import os

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

from apps.accounts.models import UserRole


User = get_user_model()
logger = logging.getLogger(__name__)


class UserProfileService:
    """Encapsulates profile retrieval and mutation logic."""

    @staticmethod
    def get_profile(user):
        """Return the user instance (already loaded via request.user)."""
        return user

    @staticmethod
    @transaction.atomic
    def update_profile(user, validated_data):
        """Update editable profile fields.

        Citizens may not set department/designation.
        """
        allowed_citizen_fields = {"full_name", "phone", "bio", "address"}
        # Department/designation is now managed via the departments module.
        allowed_authority_fields = allowed_citizen_fields

        allowed = (
            allowed_authority_fields
            if user.role in {UserRole.AUTHORITY, UserRole.SUPER_ADMIN}
            else allowed_citizen_fields
        )

        update_fields = []
        for field, value in validated_data.items():
            if field in allowed:
                setattr(user, field, value)
                update_fields.append(field)

        if update_fields:
            update_fields.append("updated_at")
            user.save(update_fields=update_fields)
            logger.info("Profile updated for user %s - fields: %s", user.email, update_fields)

        return user

    @staticmethod
    @transaction.atomic
    def upload_profile_image(user, image_file):
        """Save a new profile image, deleting the previous one if present."""
        if user.profile_image:
            old_path = user.profile_image.path
            if os.path.isfile(old_path):
                os.remove(old_path)
                logger.info("Deleted old profile image for user %s", user.email)

        user.profile_image = image_file
        user.save(update_fields=["profile_image", "updated_at"])
        logger.info("Profile image uploaded for user %s", user.email)
        return user

    @staticmethod
    @transaction.atomic
    def change_password(user, old_password, new_password):
        """Validate the old password and set the new one."""
        if not user.check_password(old_password):
            raise ValueError("Current password is incorrect.")
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        logger.info("Password changed for user %s", user.email)
        return user


class UserSearchService:
    """Provides filtered, paginated user look-ups for admin users."""

    @staticmethod
    def search(queryset=None, query="", role=None, user_status=None):
        """Filter users by free-text query, role, and status.

        Returns a QuerySet (not yet paginated — the view handles pagination).
        """
        if queryset is None:
            queryset = User.objects.all()

        if query:
            queryset = queryset.filter(
                Q(email__icontains=query)
                | Q(full_name__icontains=query)
                | Q(phone__icontains=query)
            )

        if role:
            queryset = queryset.filter(role=role)

        if user_status:
            queryset = queryset.filter(status=user_status)

        return queryset.order_by("-created_at")
