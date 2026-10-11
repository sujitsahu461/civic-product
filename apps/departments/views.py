from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthorityOrSuperAdmin, IsSuperAdmin
from apps.departments.models import Department, DepartmentAuthority
from apps.departments.serializers import (
    AssignAuthoritySerializer,
    DepartmentAuthoritySerializer,
    DepartmentCreateSerializer,
    DepartmentListSerializer,
    DepartmentSerializer,
    DepartmentStatisticsSerializer,
    DepartmentUpdateSerializer,
    UpdateAuthoritySerializer,
)
from apps.departments.services import DepartmentAuthorityService, DepartmentService
from apps.users.permissions import IsActiveUser


User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_department_or_404(public_id):
    """Resolve a department by public UUID or return a 404 Response."""
    try:
        return Department.objects.get(public_id=public_id)
    except Department.DoesNotExist:
        return None


def _department_not_found():
    return Response({"detail": "Department not found."}, status=status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Department CRUD
# ---------------------------------------------------------------------------


class DepartmentListView(ListAPIView):
    """List all active departments."""

    permission_classes = [IsAuthenticated, IsActiveUser]
    serializer_class = DepartmentListSerializer

    @extend_schema(
        tags=["Departments"],
        summary="List departments",
        description="Returns all active departments. Available to any authenticated user.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return Department.objects.filter(status="ACTIVE").order_by("name")


class DepartmentCreateView(APIView):
    """Create a new department (SuperAdmin only)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        request=DepartmentCreateSerializer,
        responses={201: DepartmentSerializer},
        summary="Create department",
        description="Create a new civic department. SuperAdmin only.",
    )
    def post(self, request):
        serializer = DepartmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            department = DepartmentService.create_department(**serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DepartmentSerializer(department).data, status=status.HTTP_201_CREATED)


class DepartmentDetailView(APIView):
    """Retrieve a single department by public_id."""

    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        responses={200: DepartmentSerializer},
        summary="Get department detail",
        description="Retrieve full department details by public UUID.",
    )
    def get(self, request, public_id):
        department = _get_department_or_404(public_id)
        if department is None:
            return _department_not_found()
        return Response(DepartmentSerializer(department).data)


class DepartmentUpdateView(APIView):
    """Update a department (SuperAdmin only)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        request=DepartmentUpdateSerializer,
        responses={200: DepartmentSerializer},
        summary="Update department",
        description="Update department details. SuperAdmin only.",
    )
    def put(self, request, public_id):
        return self._update(request, public_id)

    @extend_schema(
        tags=["Departments"],
        request=DepartmentUpdateSerializer,
        responses={200: DepartmentSerializer},
        summary="Partially update department",
        description="Partially update department details. SuperAdmin only.",
    )
    def patch(self, request, public_id):
        return self._update(request, public_id)

    def _update(self, request, public_id):
        department = _get_department_or_404(public_id)
        if department is None:
            return _department_not_found()

        serializer = DepartmentUpdateSerializer(
            data=request.data, context={"department": department}
        )
        serializer.is_valid(raise_exception=True)
        department = DepartmentService.update_department(department, serializer.validated_data)
        return Response(DepartmentSerializer(department).data)


class DepartmentDeactivateView(APIView):
    """Soft-delete a department (SuperAdmin only)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        responses={200: OpenApiResponse(description="Department deactivated.")},
        summary="Deactivate department",
        description="Soft-delete a department by setting its status to INACTIVE. SuperAdmin only.",
    )
    def post(self, request, public_id):
        department = _get_department_or_404(public_id)
        if department is None:
            return _department_not_found()

        DepartmentService.deactivate_department(department)
        return Response({"detail": "Department deactivated."})


# ---------------------------------------------------------------------------
# Authority Assignment
# ---------------------------------------------------------------------------


class DepartmentAuthorityListView(ListAPIView):
    """List authorities assigned to a department."""

    permission_classes = [IsAuthenticated, IsAuthorityOrSuperAdmin, IsActiveUser]
    serializer_class = DepartmentAuthoritySerializer

    @extend_schema(
        tags=["Departments"],
        summary="List department authorities",
        description="List all authority users assigned to a department.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        public_id = self.kwargs["public_id"]
        try:
            department = Department.objects.get(public_id=public_id)
        except Department.DoesNotExist:
            return DepartmentAuthority.objects.none()

        return DepartmentAuthorityService.list_authorities(department)


class AssignAuthorityView(APIView):
    """Assign an authority user to a department (SuperAdmin only)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        request=AssignAuthoritySerializer,
        responses={201: DepartmentAuthoritySerializer},
        summary="Assign authority to department",
        description="Assign an authority user to a department with optional designation. SuperAdmin only.",
    )
    def post(self, request, public_id):
        department = _get_department_or_404(public_id)
        if department is None:
            return _department_not_found()

        serializer = AssignAuthoritySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer._resolved_user  # set during validation

        try:
            assignment = DepartmentAuthorityService.assign_authority(
                department=department,
                user=user,
                designation=serializer.validated_data.get("designation", ""),
                is_head=serializer.validated_data.get("is_head", False),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            DepartmentAuthoritySerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )


class RemoveAuthorityView(APIView):
    """Remove an authority from a department (SuperAdmin only)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        responses={200: OpenApiResponse(description="Authority removed from department.")},
        summary="Remove authority from department",
        description="Remove an authority user from a department. SuperAdmin only.",
    )
    def delete(self, request, public_id, user_public_id):
        department = _get_department_or_404(public_id)
        if department is None:
            return _department_not_found()

        try:
            user = User.objects.get(public_id=user_public_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            DepartmentAuthorityService.remove_authority(department, user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Authority removed from department."})


class UpdateAuthorityView(APIView):
    """Update an authority's assignment in a department (SuperAdmin only)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        request=UpdateAuthoritySerializer,
        responses={200: DepartmentAuthoritySerializer},
        summary="Update authority assignment",
        description="Update designation or head status for an authority in a department. SuperAdmin only.",
    )
    def patch(self, request, public_id, user_public_id):
        department = _get_department_or_404(public_id)
        if department is None:
            return _department_not_found()

        try:
            assignment = DepartmentAuthority.objects.select_related("user").get(
                department=department, user__public_id=user_public_id
            )
        except DepartmentAuthority.DoesNotExist:
            return Response(
                {"detail": "Authority assignment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateAuthoritySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = DepartmentAuthorityService.update_authority(assignment, serializer.validated_data)
        return Response(DepartmentAuthoritySerializer(assignment).data)


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------


class DepartmentStatisticsView(APIView):
    """Return statistics for a department."""

    permission_classes = [IsAuthenticated, IsAuthorityOrSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["Departments"],
        responses={200: DepartmentStatisticsSerializer},
        summary="Department statistics",
        description="Returns aggregate statistics for a department including authority counts.",
    )
    def get(self, request, public_id):
        department = _get_department_or_404(public_id)
        if department is None:
            return _department_not_found()

        stats = DepartmentService.get_statistics(department)
        return Response(DepartmentStatisticsSerializer(stats).data)
