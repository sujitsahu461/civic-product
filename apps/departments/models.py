import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


class DepartmentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", _("Active")
    INACTIVE = "INACTIVE", _("Inactive")


class Department(models.Model):
    """Civic department such as Road, Water, Electricity, Garbage, or Drainage."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, editable=False)
    description = models.TextField(blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    contact_phone = models.CharField(max_length=20, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=DepartmentStatus.choices,
        default=DepartmentStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "departments"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["status"], name="idx_dept_status"),
            models.Index(fields=["slug"], name="idx_dept_slug"),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        return self.status == DepartmentStatus.ACTIVE


class DepartmentAuthority(models.Model):
    """Links an authority user to a department with a designation."""

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="authorities",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="department_assignments",
    )
    designation = models.CharField(max_length=100, blank=True, default="")
    is_head = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "department_authorities"
        constraints = [
            models.UniqueConstraint(
                fields=["department", "user"],
                name="uq_dept_user",
            ),
        ]
        indexes = [
            models.Index(fields=["department", "is_head"], name="idx_dept_head"),
        ]

    def __str__(self):
        return f"{self.user} -> {self.department} ({self.designation or 'Member'})"
