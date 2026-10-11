from django.conf import settings
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
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
        summary="Register a citizen or authority account",
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = TokenService.issue_tokens(user)
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
        summary="Login with email, password, and optional captcha",
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = TokenService.issue_tokens(user)
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
        result = serializer.save() or {}
        detail_msg = "If the account exists, a password reset email has been processed."
        response_data = {
            "detail": detail_msg,
            "message": detail_msg,
            "sent": result.get("sent", False),
        }
        if result.get("smtp_error"):
            response_data["smtp_error"] = result["smtp_error"]
        if getattr(settings, "DEBUG", False) or not result.get("sent"):
            if result.get("reset_url"):
                response_data["reset_url"] = result["reset_url"]

        return Response(response_data, status=status.HTTP_200_OK)


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
        return Response({
            "detail": "Password has been reset successfully.",
            "message": "Password has been reset successfully.",
        })


class VerifyTokenView(TokenVerifyView):
    @extend_schema(tags=["Authentication"], summary="Verify a JWT token")
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

