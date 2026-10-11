from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthorityOrSuperAdmin
from apps.complaints.models import Complaint, ComplaintPriority, ComplaintStatus
from apps.complaints.permissions import CanManageComplaintStatus
from apps.complaints.serializers import (
    ComplaintDetailSerializer,
    ComplaintImageSerializer,
    ComplaintListSerializer,
)
from apps.authority.serializers import (
    AuthorityComplaintFilterSerializer,
    AuthorityStatusUpdateSerializer,
    CategoryPerformanceItemSerializer,
    ComplaintStatsSerializer,
    DashboardSummarySerializer,
    MarkReadSerializer,
    NotificationSerializer,
    PriorityBreakdownSerializer,
    PriorityUpdateSerializer,
    ResolutionImageUploadSerializer,
    ResolutionNotesSerializer,
    UnreadCountSerializer,
)
from apps.authority.services import (
    AuthorityAnalyticsService,
    AuthorityComplaintService,
    AuthorityDashboardService,
    NotificationService,
)
from apps.users.permissions import IsActiveUser


def _get_complaint_or_404(public_id):
    try:
        return Complaint.objects.select_related(
            "citizen", "assigned_authority"
        ).get(public_id=public_id)
    except Complaint.DoesNotExist:
        return None


def _complaint_not_found():
    return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)


# ===========================================================================
# Dashboard Views
# ===========================================================================


class AuthorityDashboardSummaryView(APIView):
    """Get aggregate dashboard data for the authenticated authority user."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsAuthorityOrSuperAdmin]

    @extend_schema(
        tags=["Authority - Dashboard"],
        responses={200: DashboardSummarySerializer},
        summary="Dashboard summary",
        description="Returns complaint counts by status, urgent count, today's new, and total assigned for the authority's scope.",
    )
    def get(self, request):
        data = AuthorityDashboardService.get_dashboard_summary(request.user)
        return Response(DashboardSummarySerializer(data).data)


class AuthorityDashboardRecentView(APIView):
    """Get most recent complaints for the authority's dashboard."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsAuthorityOrSuperAdmin]

    @extend_schema(
        tags=["Authority - Dashboard"],
        responses={200: ComplaintListSerializer(many=True)},
        summary="Recent complaints",
        description="Returns the 5 most recently created complaints in the authority's scope.",
    )
    def get(self, request):
        complaints = AuthorityDashboardService.get_recent_complaints(request.user, limit=5)
        return Response(ComplaintListSerializer(complaints, many=True).data)


# ===========================================================================
# Complaint Management Views
# ===========================================================================


class AuthorityComplaintListView(ListAPIView):
    """List complaints assigned to or in the authority's department(s)."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsAuthorityOrSuperAdmin]
    serializer_class = ComplaintListSerializer

    @extend_schema(
        tags=["Authority - Complaints"],
        parameters=[
            OpenApiParameter(name="q", description="Search query", type=str),
            OpenApiParameter(
                name="status",
                description="Filter by status",
                enum=[c[0] for c in ComplaintStatus.choices],
                type=str,
            ),
            OpenApiParameter(
                name="priority",
                description="Filter by priority",
                enum=[c[0] for c in ComplaintPriority.choices],
                type=str,
            ),
        ],
        summary="List authority complaints",
        description="Paginated list of complaints in the authority's department(s) or assigned directly, with search and filters.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        filter_ser = AuthorityComplaintFilterSerializer(data=self.request.query_params)
        filter_ser.is_valid(raise_exception=True)
        data = filter_ser.validated_data
        return AuthorityComplaintService.get_assigned_complaints(
            user=self.request.user,
            query=data.get("q", ""),
            status=data.get("status"),
            priority=data.get("priority"),
            category=data.get("category"),
        )


class AuthorityComplaintDetailView(APIView):
    """Get full details of a specific complaint."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsAuthorityOrSuperAdmin]

    @extend_schema(
        tags=["Authority - Complaints"],
        responses={200: ComplaintDetailSerializer},
        summary="Complaint details",
        description="Retrieve full details, images, and latest history for a complaint.",
    )
    def get(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()
        return Response(ComplaintDetailSerializer(complaint).data)


class AuthorityStatusUpdateView(APIView):
    """Update complaint status with resolution remarks."""

    permission_classes = [IsAuthenticated, IsActiveUser, CanManageComplaintStatus]

    @extend_schema(
        tags=["Authority - Complaints"],
        request=AuthorityStatusUpdateSerializer,
        responses={200: ComplaintDetailSerializer},
        summary="Update complaint status",
        description="Change complaint status and optionally add resolution remarks. Triggers a notification to the citizen.",
    )
    def patch(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)

        serializer = AuthorityStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            complaint = AuthorityComplaintService.update_complaint_status(
                complaint=complaint,
                authority=request.user,
                new_status=serializer.validated_data["status"],
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintDetailSerializer(complaint).data)

    post = patch


class AuthorityResolutionNotesView(APIView):
    """Add or update resolution notes on a complaint."""

    permission_classes = [IsAuthenticated, IsActiveUser, CanManageComplaintStatus]

    @extend_schema(
        tags=["Authority - Complaints"],
        request=ResolutionNotesSerializer,
        responses={200: ComplaintDetailSerializer},
        summary="Add resolution notes",
        description="Add or update resolution notes. Triggers a notification to the citizen.",
    )
    def patch(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)

        serializer = ResolutionNotesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            complaint = AuthorityComplaintService.add_resolution_notes(
                complaint=complaint,
                authority=request.user,
                notes=serializer.validated_data["notes"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintDetailSerializer(complaint).data)

    post = patch


class AuthorityResolutionImageView(APIView):
    """Upload a resolution evidence image."""

    permission_classes = [IsAuthenticated, IsActiveUser, CanManageComplaintStatus]

    @extend_schema(
        tags=["Authority - Complaints"],
        request=ResolutionImageUploadSerializer,
        responses={201: ComplaintImageSerializer},
        summary="Upload resolution image",
        description="Upload a resolution evidence image (JPEG/PNG/WebP, max 5MB) attached to the complaint.",
    )
    def post(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)

        serializer = ResolutionImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            img = AuthorityComplaintService.upload_resolution_image(
                complaint=complaint,
                authority=request.user,
                image_file=serializer.validated_data["image"],
                caption=serializer.validated_data.get("caption", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintImageSerializer(img).data, status=status.HTTP_201_CREATED)


class AuthorityPriorityUpdateView(APIView):
    """Update complaint priority."""

    permission_classes = [IsAuthenticated, IsActiveUser, CanManageComplaintStatus]

    @extend_schema(
        tags=["Authority - Complaints"],
        request=PriorityUpdateSerializer,
        responses={200: ComplaintDetailSerializer},
        summary="Update complaint priority",
        description="Change complaint priority level and optionally add remarks.",
    )
    def patch(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)

        serializer = PriorityUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            complaint = AuthorityComplaintService.update_priority(
                complaint=complaint,
                authority=request.user,
                new_priority=serializer.validated_data["priority"],
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintDetailSerializer(complaint).data)

    post = patch


# ===========================================================================
# Analytics Views
# ===========================================================================


class AuthorityComplaintStatsView(APIView):
    """Complaint statistics with status breakdown and trend data."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsAuthorityOrSuperAdmin]

    @extend_schema(
        tags=["Authority - Analytics"],
        parameters=[
            OpenApiParameter(name="days", description="Period in days (default 30)", type=int),
        ],
        responses={200: ComplaintStatsSerializer},
        summary="Complaint statistics",
        description="Returns status breakdown, average resolution time, and daily trend for the authority's scope.",
    )
    def get(self, request):
        days = int(request.query_params.get("days", 30))
        data = AuthorityAnalyticsService.get_complaint_stats(request.user, days=days)
        return Response(ComplaintStatsSerializer(data).data)


class AuthorityDepartmentPerformanceView(APIView):
    """Per-category complaint performance stats."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsAuthorityOrSuperAdmin]

    @extend_schema(
        tags=["Authority - Analytics"],
        responses={200: CategoryPerformanceItemSerializer(many=True)},
        summary="Category performance",
        description="Returns per-category complaint breakdown with resolution rates.",
    )
    def get(self, request):
        days = request.query_params.get("days")
        data = AuthorityAnalyticsService.get_category_performance(request.user, days=days)
        return Response(CategoryPerformanceItemSerializer(data, many=True).data)


class AuthorityPriorityBreakdownView(APIView):
    """Priority level breakdown."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsAuthorityOrSuperAdmin]

    @extend_schema(
        tags=["Authority - Analytics"],
        responses={200: PriorityBreakdownSerializer},
        summary="Priority breakdown",
        description="Returns complaint count and percentage by priority level for the authority's scope.",
    )
    def get(self, request):
        data = AuthorityAnalyticsService.get_priority_breakdown(request.user)
        return Response(PriorityBreakdownSerializer(data).data)


# ===========================================================================
# Notification Views
# ===========================================================================


class NotificationListView(ListAPIView):
    """List notifications for the authenticated user."""

    permission_classes = [IsAuthenticated, IsActiveUser]
    serializer_class = NotificationSerializer

    @extend_schema(
        tags=["Notifications"],
        parameters=[
            OpenApiParameter(name="is_read", description="Filter: true/false", type=bool),
        ],
        summary="List notifications",
        description="Returns paginated notifications for the user, optionally filtered by read/unread status.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        is_read_param = self.request.query_params.get("is_read")
        is_read = None
        if is_read_param is not None:
            is_read = is_read_param.lower() in ("true", "1", "yes")
        return NotificationService.get_notifications(self.request.user, is_read=is_read)


class NotificationUnreadCountView(APIView):
    """Get unread notification count."""

    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        tags=["Notifications"],
        responses={200: UnreadCountSerializer},
        summary="Unread notification count",
        description="Returns the number of unread notifications for the authenticated user.",
    )
    def get(self, request):
        count = NotificationService.get_unread_count(request.user)
        return Response(UnreadCountSerializer({"unread_count": count}).data)


class NotificationMarkReadView(APIView):
    """Mark specific notifications as read."""

    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        tags=["Notifications"],
        request=MarkReadSerializer,
        responses={200: None},
        summary="Mark notifications as read",
        description="Mark one or more specific notifications as read by their UUIDs.",
    )
    def post(self, request):
        serializer = MarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = NotificationService.mark_as_read(
            serializer.validated_data["notification_ids"], request.user
        )
        return Response({"marked_read": updated})


class NotificationMarkAllReadView(APIView):
    """Mark all notifications as read."""

    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        tags=["Notifications"],
        responses={200: None},
        summary="Mark all notifications as read",
        description="Mark all unread notifications as read for the authenticated user.",
    )
    def post(self, request):
        updated = NotificationService.mark_all_read(request.user)
        return Response({"marked_read": updated})
