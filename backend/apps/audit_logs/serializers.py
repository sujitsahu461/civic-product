from rest_framework import serializers

from apps.audit_logs.models import AuditAction, AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog entries."""

    class Meta:
        model = AuditLog
        fields = [
            "public_id",
            "actor_email",
            "actor_role",
            "action",
            "entity_type",
            "entity_id",
            "ip_address",
            "user_agent",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


class AuditLogFilterParamsSerializer(serializers.Serializer):
    """Serializer for query params when filtering audit logs."""

    actor_email = serializers.CharField(required=False)
    action = serializers.ChoiceField(choices=AuditAction.choices, required=False)
    entity_type = serializers.CharField(required=False)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    search = serializers.CharField(required=False)


class AuditLogSummarySerializer(serializers.Serializer):
    """Summary metrics of audit log activity."""

    total_audit_events = serializers.IntegerField()
    security_events_count = serializers.IntegerField()
    top_actions = serializers.ListField(child=serializers.DictField())
    actions_by_role = serializers.ListField(child=serializers.DictField())
    last_active = serializers.CharField()
