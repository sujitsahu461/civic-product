from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsSuperAdmin
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from apps.complaints.permissions import CanManageComplaintStatus, IsComplaintOwnerOrAuthorityOrAdmin
from apps.complaints.serializers import (
    ComplaintAssignSerializer,
    ComplaintCreateSerializer,
    ComplaintDetailSerializer,
    ComplaintFilterSerializer,
    ComplaintHistorySerializer,
    ComplaintImageSerializer,
    ComplaintImageUploadSerializer,
    ComplaintListSerializer,
    ComplaintStatusUpdateSerializer,
    ComplaintTrackingSerializer,
)
from apps.complaints.services import ComplaintSearchService, ComplaintService
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


# ---------------------------------------------------------------------------
# Complaint List & Create
# ---------------------------------------------------------------------------


class ComplaintListView(ListAPIView):
    """List complaints with search, role-based scoping, filtering, and pagination."""

    permission_classes = [IsAuthenticated, IsActiveUser]
    serializer_class = ComplaintListSerializer

    @extend_schema(
        tags=["Complaints"],
        parameters=[
            OpenApiParameter(name="q", description="Search by title, description, code, address", type=str),
            OpenApiParameter(name="status", description="Filter by status", enum=[c[0] for c in ComplaintStatus.choices], type=str),
            OpenApiParameter(name="priority", description="Filter by priority", enum=[c[0] for c in ComplaintPriority.choices], type=str),
            OpenApiParameter(name="category", description="Filter by category", enum=[c[0] for c in ComplaintCategory.choices], type=str),
            OpenApiParameter(name="citizen", description="Filter by citizen UUID (Admin/Authority)", type=str),
            OpenApiParameter(name="assigned_authority", description="Filter by authority UUID", type=str),
        ],
        summary="List complaints",
        description="Returns paginated complaints scoped to the user's role (Citizens see their own, Authorities/Admins see all).",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        filter_serializer = ComplaintFilterSerializer(data=self.request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        data = filter_serializer.validated_data

        return ComplaintSearchService.filter_complaints(
            user=self.request.user,
            query=data.get("q", ""),
            status=data.get("status"),
            priority=data.get("priority"),
            category=data.get("category"),
            citizen_public_id=data.get("citizen"),
            assigned_authority_public_id=data.get("assigned_authority"),
        )


class ComplaintCreateView(APIView):
    """File a new complaint (Citizens / Admins / Guest)."""

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Complaints"],
        request=ComplaintCreateSerializer,
        responses={201: ComplaintDetailSerializer},
        summary="Create a new complaint",
        description="Submit a civic complaint with details, location coordinates, department selection, and optional image files.",
    )
    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        images = request.FILES.getlist("images") or data.get("images", [])

        citizen = request.user if request.user and request.user.is_authenticated else None
        if not citizen:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            citizen, _ = User.objects.get_or_create(
                email="guest_citizen@civicsetu.local",
                defaults={
                    "full_name": "Resident Citizen",
                    "role": UserRole.CITIZEN,
                    "is_active": True,
                }
            )

        try:
            complaint = ComplaintService.create_complaint(
                citizen=citizen,
                category=data.get("category"),
                title=data["title"],
                description=data["description"],
                location_address=data["location_address"],
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                priority=data.get("priority"),
                images=images,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintDetailSerializer(complaint).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Complaint Detail, Status, Assignment, Images
# ---------------------------------------------------------------------------


class ComplaintDetailView(APIView):
    """Get full details of a specific complaint."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsComplaintOwnerOrAuthorityOrAdmin]

    @extend_schema(
        tags=["Complaints"],
        responses={200: ComplaintDetailSerializer},
        summary="Get complaint details",
        description="Retrieve full details, image attachments, and latest status history for a complaint.",
    )
    def get(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)
        return Response(ComplaintDetailSerializer(complaint).data)


class ComplaintStatusUpdateView(APIView):
    """Update complaint status (Authority / Admin)."""

    permission_classes = [IsAuthenticated, IsActiveUser, CanManageComplaintStatus]

    @extend_schema(
        tags=["Complaints"],
        request=ComplaintStatusUpdateSerializer,
        responses={200: ComplaintDetailSerializer},
        summary="Update complaint status",
        description="Change complaint status (e.g., PENDING -> IN_PROGRESS -> RESOLVED) and record resolution notes.",
    )
    def patch(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)

        serializer = ComplaintStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            complaint = ComplaintService.update_status(
                complaint=complaint,
                actor=request.user,
                new_status=data["status"],
                remarks=data.get("remarks", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintDetailSerializer(complaint).data)


class ComplaintAssignView(APIView):
    """Assign or reassign an authority user to a complaint."""

    permission_classes = [IsAuthenticated, IsActiveUser, CanManageComplaintStatus]

    @extend_schema(
        tags=["Complaints"],
        request=ComplaintAssignSerializer,
        responses={200: ComplaintDetailSerializer},
        summary="Assign authority to complaint",
        description="Assign a specific authority user to handle this complaint.",
    )
    def patch(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)

        serializer = ComplaintAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        authority_user = serializer._resolved_authority

        try:
            complaint = ComplaintService.assign_authority(
                complaint=complaint,
                actor=request.user,
                authority_user=authority_user,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintDetailSerializer(complaint).data)


class ComplaintImageUploadView(APIView):
    """Upload an additional image to an existing complaint."""

    permission_classes = [IsAuthenticated, IsActiveUser, IsComplaintOwnerOrAuthorityOrAdmin]

    @extend_schema(
        tags=["Complaints"],
        request=ComplaintImageUploadSerializer,
        responses={201: ComplaintImageSerializer},
        summary="Upload complaint image",
        description="Upload an additional image file (JPEG/PNG/WebP, max 5MB) attached to a complaint.",
    )
    def post(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        self.check_object_permissions(request, complaint)

        serializer = ComplaintImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_file = serializer.validated_data["image"]
        caption = serializer.validated_data.get("caption", "")

        try:
            img = ComplaintService.add_image(
                complaint=complaint,
                actor=request.user,
                image_file=image_file,
                caption=caption,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintImageSerializer(img).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Timeline & Tracking
# ---------------------------------------------------------------------------


class ComplaintTimelineView(APIView):
    """View full audit log timeline history for a complaint."""

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Complaints"],
        responses={200: ComplaintHistorySerializer(many=True)},
        summary="Get complaint timeline",
        description="Returns the full chronological audit history of status updates, assignments, and events for a complaint.",
    )
    def get(self, request, public_id):
        complaint = _get_complaint_or_404(public_id)
        if complaint is None:
            return _complaint_not_found()

        history_qs = ComplaintService.get_timeline(complaint)
        return Response(ComplaintHistorySerializer(history_qs, many=True).data)


class ComplaintTrackingView(APIView):
    """Public tracking endpoint looking up a complaint by tracking_code or public_id."""

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Complaints"],
        responses={200: ComplaintTrackingSerializer},
        summary="Public complaint status tracking",
        description="Retrieve public complaint status by human-readable tracking code (e.g. CMP-20260722-XXXX) or public UUID.",
    )
    def get(self, request, tracking_code):
        complaint = ComplaintService.track_by_code(tracking_code)
        if complaint is None:
            return Response(
                {"detail": "No complaint found matching the provided tracking code."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ComplaintTrackingSerializer(complaint).data)
