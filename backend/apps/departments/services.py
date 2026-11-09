import logging

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count

from apps.accounts.models import UserRole
from apps.departments.models import Department, DepartmentAuthority, DepartmentStatus


User = get_user_model()
logger = logging.getLogger(__name__)


class DepartmentService:
    """Business logic for department CRUD operations."""

    @staticmethod
    @transaction.atomic
    def create_department(name, description="", contact_email="", contact_phone=""):
        """Create a new department. Raises ValueError on duplicate name."""
        if Department.objects.filter(name__iexact=name).exists():
            raise ValueError(f"A department named '{name}' already exists.")

        department = Department.objects.create(
            name=name,
            description=description,
            contact_email=contact_email,
            contact_phone=contact_phone,
        )
        logger.info("Department created: %s (id=%s)", department.name, department.pk)
        return department

    @staticmethod
    @transaction.atomic
    def update_department(department, validated_data):
        """Update mutable fields on a department."""
        updatable = {"name", "description", "contact_email", "contact_phone"}
        update_fields = []

        for field, value in validated_data.items():
            if field in updatable:
                setattr(department, field, value)
                update_fields.append(field)

        if update_fields:
            update_fields.append("updated_at")
            department.save(update_fields=update_fields)
            logger.info("Department updated: %s - fields: %s", department.name, update_fields)

        return department

    @staticmethod
    @transaction.atomic
    def deactivate_department(department):
        """Soft-delete a department by setting status to INACTIVE."""
        department.status = DepartmentStatus.INACTIVE
        department.save(update_fields=["status", "updated_at"])
        logger.info("Department deactivated: %s", department.name)
        return department

    @staticmethod
    def get_statistics(department):
        """Return aggregate statistics for a department."""
        authority_count = department.authorities.count()
        head_count = department.authorities.filter(is_head=True).count()

        return {
            "department": department.name,
            "public_id": str(department.public_id),
            "status": department.status,
            "total_authorities": authority_count,
            "department_heads": head_count,
        }


class DepartmentAuthorityService:
    """Business logic for assigning / removing authorities to departments."""

    @staticmethod
    @transaction.atomic
    def assign_authority(department, user, designation="", is_head=False):
        """Assign an authority user to a department.

        Validates:
        - user has AUTHORITY role
        - user is not already assigned to this department
        """
        if user.role != UserRole.AUTHORITY:
            raise ValueError("Only users with the AUTHORITY role can be assigned to a department.")

        try:
            assignment = DepartmentAuthority.objects.create(
                department=department,
                user=user,
                designation=designation,
                is_head=is_head,
            )
        except IntegrityError as exc:
            raise ValueError(
                f"User '{user.email}' is already assigned to department '{department.name}'."
            ) from exc

        logger.info(
            "Authority %s assigned to %s (designation=%s, is_head=%s)",
            user.email,
            department.name,
            designation,
            is_head,
        )
        return assignment

    @staticmethod
    @transaction.atomic
    def remove_authority(department, user):
        """Remove an authority from a department."""
        deleted, _ = DepartmentAuthority.objects.filter(
            department=department, user=user
        ).delete()

        if not deleted:
            raise ValueError(
                f"User '{user.email}' is not assigned to department '{department.name}'."
            )

        logger.info("Authority %s removed from %s", user.email, department.name)

    @staticmethod
    @transaction.atomic
    def update_authority(assignment, validated_data):
        """Update designation or is_head on an existing assignment."""
        update_fields = []
        for field in ("designation", "is_head"):
            if field in validated_data:
                setattr(assignment, field, validated_data[field])
                update_fields.append(field)

        if update_fields:
            assignment.save(update_fields=update_fields)
            logger.info(
                "Authority assignment updated: %s -> %s - fields: %s",
                assignment.user.email,
                assignment.department.name,
                update_fields,
            )

        return assignment

    @staticmethod
    def list_authorities(department):
        """Return the queryset of authority assignments for a department."""
        return (
            DepartmentAuthority.objects.filter(department=department)
            .select_related("user")
            .order_by("-is_head", "user__full_name")
        )
