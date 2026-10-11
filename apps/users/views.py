from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole, UserStatus
from apps.accounts.permissions import IsAuthority, IsAuthorityOrSuperAdmin, IsCitizen, IsSuperAdmin
from apps.users.permissions import IsActiveUser
from apps.users.serializers import (
    AdminProfileSerializer,
    AuthorityProfileSerializer,
    ChangePasswordSerializer,
    CitizenProfileSerializer,
    ProfileImageSerializer,
    UpdateProfileSerializer,
    UserSearchFilterSerializer,
    UserSearchSerializer,
)
from apps.users.services import UserProfileService, UserSearchService


# ---------------------------------------------------------------------------
# Profile views
# ---------------------------------------------------------------------------


class CitizenProfileView(APIView):
    permission_classes = [IsAuthenticated, IsCitizen, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        responses={200: CitizenProfileSerializer},
        summary="Get citizen profile",
        description="Returns the authenticated citizen's own profile.",
    )
    def get(self, request):
        user = UserProfileService.get_profile(request.user)
        return Response(CitizenProfileSerializer(user).data)


class AuthorityProfileView(APIView):
    permission_classes = [IsAuthenticated, IsAuthority, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        responses={200: AuthorityProfileSerializer},
        summary="Get authority profile",
        description="Returns the authenticated authority's own profile, including department and designation.",
    )
    def get(self, request):
        user = UserProfileService.get_profile(request.user)
        return Response(AuthorityProfileSerializer(user).data)


class AdminProfileView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        responses={200: AdminProfileSerializer},
        summary="Get admin profile",
        description="Returns the full profile of the authenticated super-admin.",
    )
    def get(self, request):
        user = UserProfileService.get_profile(request.user)
        return Response(AdminProfileSerializer(user).data)


# ---------------------------------------------------------------------------
# Update & upload
# ---------------------------------------------------------------------------


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        request=UpdateProfileSerializer,
        responses={200: AdminProfileSerializer},
        summary="Update own profile",
        description="Update profile fields. Citizens can update name, phone, bio, address. Authorities can additionally update department and designation.",
    )
    def put(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = UserProfileService.update_profile(request.user, serializer.validated_data)
        return Response(AdminProfileSerializer(user).data)

    @extend_schema(
        tags=["User Management"],
        request=UpdateProfileSerializer,
        responses={200: AdminProfileSerializer},
        summary="Partially update own profile",
        description="Partially update profile fields.",
    )
    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = UserProfileService.update_profile(request.user, serializer.validated_data)
        return Response(AdminProfileSerializer(user).data)


class UploadProfileImageView(APIView):
    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        request=ProfileImageSerializer,
        responses={
            200: AdminProfileSerializer,
            400: OpenApiResponse(description="Invalid image file."),
        },
        summary="Upload profile image",
        description="Upload or replace the authenticated user's profile image. Max 5 MB, JPEG/PNG/WebP.",
    )
    def post(self, request):
        serializer = ProfileImageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminProfileSerializer(user).data)


# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiResponse(description="Password changed successfully."),
            400: OpenApiResponse(description="Validation error."),
        },
        summary="Change password",
        description="Change the authenticated user's password by providing the current password and a new one.",
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."})


# ---------------------------------------------------------------------------
# User search & detail (admin / authority)
# ---------------------------------------------------------------------------


class UserSearchView(ListAPIView):
    permission_classes = [IsAuthenticated, IsAuthorityOrSuperAdmin, IsActiveUser]
    serializer_class = UserSearchSerializer

    @extend_schema(
        tags=["User Management"],
        parameters=[
            OpenApiParameter(name="q", description="Search by email, name, or phone", type=str),
            OpenApiParameter(
                name="role",
                description="Filter by role",
                enum=[c[0] for c in UserRole.choices],
                type=str,
            ),
            OpenApiParameter(
                name="status",
                description="Filter by status",
                enum=[c[0] for c in UserStatus.choices],
                type=str,
            ),
        ],
        summary="Search users (admin only)",
        description="Search and filter all platform users. Supports free-text query across email, name, and phone, plus role and status filters.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        filter_serializer = UserSearchFilterSerializer(data=self.request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        data = filter_serializer.validated_data
        return UserSearchService.search(
            query=data.get("q", ""),
            role=data.get("role"),
            user_status=data.get("status"),
        )


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAuthorityOrSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        responses={200: AdminProfileSerializer},
        summary="Get user by public ID",
        description="Retrieve any user's profile by their public UUID. Accessible by authorities and admins.",
    )
    def get(self, request, public_id):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            user = User.objects.get(public_id=public_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(AdminProfileSerializer(user).data)

    @extend_schema(
        tags=["User Management"],
        summary="Update user by public ID (Super Admin only)",
        description="Update user status, role, phone, or details.",
    )
    def patch(self, request, public_id):
        if getattr(request.user, "role", None) != UserRole.SUPER_ADMIN and not request.user.is_superuser:
            return Response(
                {"detail": "Only Super Admin can update users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            target_user = User.objects.get(public_id=public_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

        data = request.data
        if "is_active" in data:
            target_user.is_active = bool(data["is_active"])
            target_user.status = UserStatus.ACTIVE if target_user.is_active else UserStatus.SUSPENDED
        if "role" in data and data["role"] in [c[0] for c in UserRole.choices]:
            target_user.role = data["role"]
            if data["role"] == UserRole.SUPER_ADMIN:
                target_user.is_staff = True
            elif data["role"] == UserRole.CITIZEN:
                target_user.is_staff = False
        if "full_name" in data and data["full_name"]:
            target_user.full_name = data["full_name"]
        if "phone" in data:
            target_user.phone = data["phone"]
        if "department" in data:
            target_user.department = data["department"]
        if "designation" in data:
            target_user.designation = data["designation"]

        target_user.save()

        # Log audit entry
        try:
            from apps.audit_logs.models import AuditAction, AuditLog
            AuditLog.objects.create(
                actor=request.user,
                actor_email=request.user.email,
                actor_role=request.user.role,
                action=AuditAction.PROFILE_UPDATE,
                entity_type="User",
                entity_id=str(target_user.public_id),
                ip_address=request.META.get("REMOTE_ADDR", "127.0.0.1"),
                metadata={
                    "email": target_user.email,
                    "role": target_user.role,
                    "is_active": target_user.is_active,
                },
            )
        except Exception:
            pass

        return Response(AdminProfileSerializer(target_user).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["User Management"],
        summary="Delete / Deactivate user by public ID (Super Admin only)",
    )
    def delete(self, request, public_id):
        if getattr(request.user, "role", None) != UserRole.SUPER_ADMIN and not request.user.is_superuser:
            return Response(
                {"detail": "Only Super Admin can delete users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            target_user = User.objects.get(public_id=public_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if target_user == request.user:
            return Response(
                {"detail": "You cannot delete your own Super Admin account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.is_active = False
        target_user.status = UserStatus.SUSPENDED
        target_user.save()

        return Response(
            {"detail": f"User {target_user.email} suspended successfully."},
            status=status.HTTP_200_OK,
        )


class AdminUserCreateView(APIView):
    """Enrolls a new user across any role (Super Admin only)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, IsActiveUser]

    @extend_schema(
        tags=["User Management"],
        summary="Create new platform user (Super Admin only)",
        description="Enrolls a new user with any role, full credentials, and optional department assignment.",
    )
    def post(self, request):
        from apps.accounts.services import UserRegistrationService

        data = request.data
        email = data.get("email", "").strip()
        full_name = data.get("full_name", "").strip()
        password = data.get("password", "CivicSetu@12345")
        role = data.get("role", UserRole.CITIZEN)
        phone = data.get("phone", "")
        department = data.get("department", "")
        designation = data.get("designation", "")

        if not email or not full_name:
            return Response(
                {"detail": "Email and Full Name are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.contrib.auth import get_user_model

        User = get_user_model()
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "A user with this email address already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = UserRegistrationService.register_user(
            email=email,
            password=password,
            full_name=full_name,
            phone=phone,
            role=role,
            department=department,
            designation=designation,
        )

        # Log audit entry
        try:
            from apps.audit_logs.models import AuditAction, AuditLog
            AuditLog.objects.create(
                actor=request.user,
                actor_email=request.user.email,
                actor_role=request.user.role,
                action=AuditAction.AUTH_REGISTER,
                entity_type="User",
                entity_id=str(user.public_id),
                ip_address=request.META.get("REMOTE_ADDR", "127.0.0.1"),
                metadata={
                    "email": user.email,
                    "role": user.role,
                    "full_name": user.full_name,
                },
            )
        except Exception:
            pass

        return Response(AdminProfileSerializer(user).data, status=status.HTTP_201_CREATED)
