from django.contrib import admin

from apps.audit_logs.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "actor_email",
        "actor_role",
        "action",
        "entity_type",
        "entity_id",
        "ip_address",
    )
    list_filter = ("action", "entity_type", "actor_role", "created_at")
    search_fields = ("actor_email", "entity_id", "ip_address")
    readonly_fields = (
        "public_id",
        "actor",
        "actor_email",
        "actor_role",
        "action",
        "entity_type",
        "entity_id",
        "ip_address",
        "user_agent",
        "metadata",
        "created_at",
    )
