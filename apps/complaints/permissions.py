from rest_framework.permissions import BasePermission

from apps.accounts.models import UserRole
from apps.complaints.scoping import can_access_complaint


class IsComplaintOwnerOrAuthorityOrAdmin(BasePermission):
    """Object-level permission:
    - Citizens: only complaints they created.
    - Authorities: complaints in their departments' categories, or assigned to them.
    - SuperAdmin: any complaint.
    """

    message = "You do not have permission to access this complaint."

    def has_object_permission(self, request, view, obj):
        return can_access_complaint(request.user, obj)


class CanManageComplaintStatus(BasePermission):
    """Permission: Authority or SuperAdmin who can update complaint status / assign handling.

    Officers may only act on complaints within their departments (or assigned to them).
    """

    message = "Only authorities of the responsible department or super-admins can manage this complaint."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in {UserRole.AUTHORITY, UserRole.SUPER_ADMIN}

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role not in {UserRole.AUTHORITY, UserRole.SUPER_ADMIN}:
            return False
        return can_access_complaint(request.user, obj)
