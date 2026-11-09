from rest_framework.permissions import BasePermission

from apps.accounts.models import UserStatus


class IsProfileOwner(BasePermission):
    """Object-level permission: allows access only if the request user owns the profile."""

    message = "You can only access your own profile."

    def has_object_permission(self, request, view, obj):
        return obj.public_id == request.user.public_id


class IsActiveUser(BasePermission):
    """Denies access to suspended or inactive users."""

    message = "Your account is not active."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.status == UserStatus.ACTIVE
