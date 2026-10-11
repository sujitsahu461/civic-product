from rest_framework.permissions import BasePermission

from apps.accounts.models import UserRole


class IsComplaintOwnerOrAuthorityOrAdmin(BasePermission):
    """Object-level permission:
    - Citizens: can only access complaints they created.
    - Authorities: can access any complaint.
    - SuperAdmin: can access any complaint.
    """

    message = "You do not have permission to access this complaint."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == UserRole.SUPER_ADMIN:
            return True

        if request.user.role == UserRole.CITIZEN:
            return obj.citizen_id == request.user.id

        if request.user.role == UserRole.AUTHORITY:
            # Any authority can access any complaint
            return True

        return False


class CanManageComplaintStatus(BasePermission):
    """Permission: Authority or SuperAdmin who can update complaint status / assign handling."""

    message = "Only authorities or super-admins can manage complaint status."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in {UserRole.AUTHORITY, UserRole.SUPER_ADMIN}

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == UserRole.SUPER_ADMIN:
            return True

        if request.user.role == UserRole.AUTHORITY:
            # Any authority can manage any complaint
            return True

        return False
