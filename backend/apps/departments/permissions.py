from rest_framework.permissions import BasePermission

from apps.departments.models import DepartmentAuthority


class IsDepartmentMember(BasePermission):
    """Object-level permission: allows access only if the user is assigned to the department."""

    message = "You are not a member of this department."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return DepartmentAuthority.objects.filter(
            department=obj, user=request.user
        ).exists()
