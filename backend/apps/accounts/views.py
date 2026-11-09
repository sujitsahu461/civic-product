from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenVerifyView

from apps.accounts.serializers import (
    AuthResponseSerializer,
    CaptchaResponseSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    RefreshTokenSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    TokenPairSerializer,
    UserSerializer,
)
from apps.accounts.services import TokenService
from apps.audit_logs.models import AuditAction
from apps.audit_logs.services import AuditLogService


class CaptchaView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        responses={200: CaptchaResponseSerializer},
        summary="Generate a new cryptographic CAPTCHA challenge",
    )
    def get(self, request):
        from apps.accounts.captcha import create_captcha
        return Response(create_captcha(), status=status.HTTP_200_OK)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        tags=["Authentication"],
        request=RegisterSerializer,
        responses={201: AuthResponseSerializer},
        summary="Register a citizen account",
        description="Public sign-up creates citizen accounts only. Officer and administrator "
        "accounts are created by a super admin via POST /api/v1/users/create/.",
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = TokenService.issue_tokens(user)
        AuditLogService.safe_log(
            AuditAction.AUTH_REGISTER, "User", user.public_id, actor=user, request=request,
            metadata={"email": user.email, "role": user.role},
        )
        return Response(
            {"user": UserSerializer(user).data, "tokens": tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        tags=["Authentication"],
        request=LoginSerializer,
        responses={200: AuthResponseSerializer},
        summary="Login with email, password and captcha",
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            # Record failed sign-ins (bad password, bad captcha, inactive account).
            AuditLogService.safe_log(
                AuditAction.SYSTEM_EVENT, "User", str(request.data.get("email", ""))[:100],
                request=request,
                metadata={"event": "login_failed", "fields": sorted(serializer.errors.keys())},
            )
            raise ValidationError(serializer.errors)
        user = serializer.validated_data["user"]
        tokens = TokenService.issue_tokens(user)
        AuditLogService.safe_log(AuditAction.AUTH_LOGIN, "User", user.public_id, actor=user, request=request)
        return Response({"user": UserSerializer(user).data, "tokens": tokens})


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        request=RefreshTokenSerializer,
        responses={200: TokenPairSerializer},
        summary="Refresh JWT access token",
    )
    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data["tokens"])


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Authentication"],
        request=LogoutSerializer,
        responses={205: OpenApiResponse(description="Refresh token blacklisted.")},
        summary="Logout by blacklisting the refresh token",
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        TokenService.blacklist_refresh_token(serializer.validated_data["refresh"])
        AuditLogService.safe_log(
            AuditAction.AUTH_LOGOUT, "User", request.user.public_id, actor=request.user, request=request
        )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Authentication"],
        responses={200: UserSerializer},
        summary="Get the authenticated user profile",
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ForgotPasswordView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        tags=["Authentication"],
        request=ForgotPasswordSerializer,
        responses={200: OpenApiResponse(description="Password reset email queued if the account exists.")},
        summary="Request a password reset email",
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Always return the same generic response. The reset link, SMTP errors and
        # whether the account exists must never reach the caller: returning the link
        # would let anyone reset any account. Failures are logged server-side.
        detail_msg = "If the account exists, a password reset email has been sent."
        return Response({"detail": detail_msg, "message": detail_msg}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        tags=["Authentication"],
        request=ResetPasswordSerializer,
        responses={200: OpenApiResponse(description="Password reset completed.")},
        summary="Confirm password reset with uid and token",
    )
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        user = serializer.validated_data["user"]
        AuditLogService.safe_log(
            AuditAction.PASSWORD_CHANGE, "User", user.public_id, actor=user, request=request,
            metadata={"method": "reset_link"},
        )
        return Response({
            "detail": "Password has been reset successfully.",
            "message": "Password has been reset successfully.",
        })


class VerifyTokenView(TokenVerifyView):
    @extend_schema(tags=["Authentication"], summary="Verify a JWT token")
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

