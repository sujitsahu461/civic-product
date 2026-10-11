from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit_logs.models import AuditLog
from apps.audit_logs.permissions import IsSuperAdmin
from apps.audit_logs.serializers import (
    AuditLogFilterParamsSerializer,
    AuditLogSerializer,
    AuditLogSummarySerializer,
)
from apps.audit_logs.services import AuditLogService


class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class AuditLogListView(APIView):
    """List system audit logs with filtering and pagination (Super Admin only)."""

    permission_classes = [IsSuperAdmin]
    pagination_class = AuditLogPagination

    @extend_schema(
        summary="List and filter audit logs",
        parameters=[AuditLogFilterParamsSerializer],
        responses={200: AuditLogSerializer(many=True)},
        tags=["Audit Logs"],
    )
    def get(self, request):
        serializer = AuditLogFilterParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        queryset = AuditLogService.query_logs(serializer.validated_data)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer_data = AuditLogSerializer(page, many=True).data
            return paginator.get_paginated_response(serializer_data)

        serializer_data = AuditLogSerializer(queryset, many=True).data
        return Response(serializer_data, status=status.HTTP_200_OK)


class AuditLogDetailView(APIView):
    """Retrieve specific audit log entry by public UUID (Super Admin only)."""

    permission_classes = [IsSuperAdmin]

    @extend_schema(
        summary="Get audit log details",
        responses={
            200: AuditLogSerializer,
            404: OpenApiResponse(description="Audit log entry not found"),
        },
        tags=["Audit Logs"],
    )
    def get(self, request, public_id):
        try:
            log_entry = AuditLog.objects.get(public_id=public_id)
        except AuditLog.DoesNotExist:
            raise NotFound("Audit log entry not found.")

        return Response(AuditLogSerializer(log_entry).data, status=status.HTTP_200_OK)


class AuditLogSummaryView(APIView):
    """Retrieve aggregate security and activity summary metrics (Super Admin only)."""

    permission_classes = [IsSuperAdmin]

    @extend_schema(
        summary="Get audit log activity summary",
        responses={200: AuditLogSummarySerializer},
        tags=["Audit Logs"],
    )
    def get(self, request):
        summary = AuditLogService.get_audit_summary()
        return Response(
            AuditLogSummarySerializer(summary).data,
            status=status.HTTP_200_OK,
        )
