from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.complaints.models import Complaint
from apps.feedback.models import Feedback
from apps.feedback.permissions import (
    IsAuthority,
    IsAuthorityOrSuperAdmin,
    IsCitizen,
)
from apps.feedback.serializers import (
    AuthorityFeedbackStatsSerializer,
    DepartmentFeedbackStatsSerializer,
    FeedbackCreateSerializer,
    FeedbackDetailSerializer,
)
from apps.feedback.services import FeedbackService
from apps.users.permissions import IsActiveUser
from apps.audit_logs.models import AuditAction
from apps.audit_logs.services import AuditLogService


class SubmitFeedbackView(APIView):
    """Submit rating and feedback for a resolved complaint (owner only, signed in)."""

    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        summary="Submit complaint resolution feedback",
        request=FeedbackCreateSerializer,
        responses={
            201: FeedbackDetailSerializer,
            400: OpenApiResponse(description="Validation error or invalid status"),
            401: OpenApiResponse(description="Not signed in"),
            403: OpenApiResponse(description="Citizen does not own complaint"),
            404: OpenApiResponse(description="Complaint not found"),
        },
        tags=["Feedback"],
    )
    def post(self, request):
        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        complaint_public_id = serializer.validated_data.pop("complaint_public_id")
        try:
            complaint = Complaint.objects.select_related("citizen", "assigned_authority").get(
                public_id=complaint_public_id
            )
        except Complaint.DoesNotExist:
            raise NotFound("Complaint not found.")

        # Always rate as the signed-in user; the service rejects anyone but the owner.
        feedback = FeedbackService.submit_feedback(
            complaint=complaint,
            citizen=request.user,
            validated_data=serializer.validated_data,
        )
        AuditLogService.safe_log(
            AuditAction.FEEDBACK_SUBMITTED, "Complaint", complaint.tracking_code, request=request,
            metadata={"rating": feedback.rating, "is_issue_resolved": feedback.is_issue_resolved},
        )

        return Response(
            FeedbackDetailSerializer(feedback).data,
            status=status.HTTP_201_CREATED,
        )


class ComplaintFeedbackDetailView(APIView):
    """Retrieve feedback for a specific complaint."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get feedback for a specific complaint",
        responses={
            200: FeedbackDetailSerializer,
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Feedback or complaint not found"),
        },
        tags=["Feedback"],
    )
    def get(self, request, complaint_public_id):
        try:
            complaint = Complaint.objects.get(public_id=complaint_public_id)
        except Complaint.DoesNotExist:
            raise NotFound("Complaint not found.")

        # Owner, officers of the responsible department, or super admins only.
        from apps.complaints.scoping import can_access_complaint

        if not can_access_complaint(request.user, complaint):
            raise PermissionDenied("You do not have permission to view feedback for this complaint.")

        try:
            feedback = Feedback.objects.select_related("complaint", "citizen").get(
                complaint=complaint
            )
        except Feedback.DoesNotExist:
            raise NotFound("No feedback has been submitted for this complaint.")

        return Response(FeedbackDetailSerializer(feedback).data, status=status.HTTP_200_OK)


class CitizenFeedbackListView(APIView):
    """List all feedbacks submitted by the authenticated citizen."""

    permission_classes = [IsCitizen]

    @extend_schema(
        summary="List feedbacks submitted by current citizen",
        responses={200: FeedbackDetailSerializer(many=True)},
        tags=["Feedback"],
    )
    def get(self, request):
        feedbacks = Feedback.objects.filter(citizen=request.user).select_related(
            "complaint", "citizen"
        )
        return Response(
            FeedbackDetailSerializer(feedbacks, many=True).data,
            status=status.HTTP_200_OK,
        )


class DepartmentFeedbackStatsView(APIView):
    """Retrieve feedback metrics for a department or category."""

    permission_classes = [IsAuthorityOrSuperAdmin]

    @extend_schema(
        summary="Get feedback metrics for a department category",
        responses={200: DepartmentFeedbackStatsSerializer},
        tags=["Feedback"],
    )
    def get(self, request, category):
        metrics = FeedbackService.get_department_feedback_metrics(category)
        return Response(
            DepartmentFeedbackStatsSerializer(metrics).data,
            status=status.HTTP_200_OK,
        )


class AuthorityFeedbackStatsView(APIView):
    """Retrieve feedback metrics for the calling municipal authority."""

    permission_classes = [IsAuthority]

    @extend_schema(
        summary="Get feedback metrics for the authenticated authority",
        responses={200: AuthorityFeedbackStatsSerializer},
        tags=["Feedback"],
    )
    def get(self, request):
        metrics = FeedbackService.get_authority_feedback_metrics(request.user)
        return Response(
            AuthorityFeedbackStatsSerializer(metrics).data,
            status=status.HTTP_200_OK,
        )


class AuthorityFeedbackListView(APIView):
    """List all citizen feedbacks with ratings, stars, and comments for municipal authority review."""

    permission_classes = [IsAuthorityOrSuperAdmin]

    @extend_schema(
        summary="List all citizen feedbacks for authority review",
        responses={200: FeedbackDetailSerializer(many=True)},
        tags=["Feedback"],
    )
    def get(self, request):
        feedbacks = Feedback.objects.select_related(
            "complaint", "citizen"
        ).order_by("-created_at")
        return Response(
            FeedbackDetailSerializer(feedbacks, many=True).data,
            status=status.HTTP_200_OK,
        )
