from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("CivicSetu Profile", {"fields": ("public_id", "full_name", "phone", "role", "status", "bio", "address", "department", "designation", "profile_image")}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("CivicSetu Profile", {"fields": ("email", "full_name", "phone", "role", "status")}),
    )
    readonly_fields = ("public_id",)
    list_display = ("email", "full_name", "phone", "role", "status", "department", "is_staff")
    list_filter = ("role", "status", "is_staff", "is_superuser", "department")
    search_fields = ("email", "full_name", "phone", "public_id")
    ordering = ("email",)
