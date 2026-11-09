from django.contrib import admin

from apps.departments.models import Department, DepartmentAuthority


class DepartmentAuthorityInline(admin.TabularInline):
    model = DepartmentAuthority
    extra = 0
    raw_id_fields = ("user",)
    readonly_fields = ("assigned_at",)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "contact_email", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "slug", "contact_email")
    readonly_fields = ("public_id", "slug", "created_at", "updated_at")
    ordering = ("name",)
    inlines = [DepartmentAuthorityInline]


@admin.register(DepartmentAuthority)
class DepartmentAuthorityAdmin(admin.ModelAdmin):
    list_display = ("user", "department", "designation", "is_head", "assigned_at")
    list_filter = ("is_head", "department")
    search_fields = ("user__email", "user__full_name", "department__name")
    raw_id_fields = ("user", "department")
    readonly_fields = ("assigned_at",)
