from rest_framework.permissions import BasePermission

from apps.accounts.models import UserRole


class IsCitizen(BasePermission):
    message = "Citizen access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == UserRole.CITIZEN or getattr(request.user, "is_superuser", False))
        )


class IsAuthority(BasePermission):
    message = "Authority access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == UserRole.AUTHORITY or getattr(request.user, "is_superuser", False))
        )


class IsSuperAdmin(BasePermission):
    message = "Super admin access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == UserRole.SUPER_ADMIN
                or getattr(request.user, "is_superuser", False)
                or getattr(request.user, "is_staff", False)
            )
        )


class IsAuthorityOrSuperAdmin(BasePermission):
    message = "Authority or super admin access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in {UserRole.AUTHORITY, UserRole.SUPER_ADMIN}
                or getattr(request.user, "is_superuser", False)
                or getattr(request.user, "is_staff", False)
            )
        )
