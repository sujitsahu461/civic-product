from django.urls import path

from apps.accounts.views import (
    CaptchaView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    RefreshTokenView,
    RegisterView,
    ResetPasswordView,
    VerifyTokenView,
)


urlpatterns = [
    path("captcha/", CaptchaView.as_view(), name="auth-captcha"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("verify/", VerifyTokenView.as_view(), name="auth-verify"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="auth-reset-password"),
]
