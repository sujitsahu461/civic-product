from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole
from apps.accounts.services import PasswordResetService, TokenService, UserRegistrationService


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "public_id",
            "email",
            "full_name",
            "phone",
            "role",
            "status",
            "address",
            "department",
            "designation",
            "profile_image",
            "bio",
            "created_at",
        )
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    role = serializers.ChoiceField(
        choices=(UserRole.CITIZEN, UserRole.AUTHORITY, UserRole.SUPER_ADMIN),
        default=UserRole.CITIZEN,
        required=False,
    )
    address = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    security_key = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists. Please sign in instead or use another email.")
        return normalized

    def validate_phone(self, value):
        val = (value or "").strip()
        if val and User.objects.filter(phone=val).exists():
            raise serializers.ValidationError("This phone number is already registered to another account. Please use a different phone or leave blank.")
        return val or None

    def validate_password(self, value):
        try:
            validate_password(value)
        except Exception as e:
            messages = list(e.messages) if hasattr(e, "messages") else [str(e)]
            raise serializers.ValidationError(messages)
        return value

    def validate(self, attrs):
        role = attrs.get("role", UserRole.CITIZEN)
        if role == UserRole.SUPER_ADMIN:
            sec_key = (attrs.get("security_key") or "").strip()
            valid_keys = {"CIVICSETU-ADMIN-2025", "ADMIN@CIVICSETU", "SUPERADMIN2025"}
            if not sec_key:
                raise serializers.ValidationError({"security_key": "Master Administrator Security Passkey is required (e.g. CIVICSETU-ADMIN-2025)."})
            if sec_key not in valid_keys:
                raise serializers.ValidationError({"security_key": "Invalid Master Administrator Security Passkey. Access Denied. Use CIVICSETU-ADMIN-2025."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("security_key", None)
        return UserRegistrationService.register_user(**validated_data)


class CaptchaResponseSerializer(serializers.Serializer):
    captcha_key = serializers.CharField()
    captcha_svg = serializers.CharField()
    expires_in = serializers.IntegerField()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    captcha_key = serializers.CharField(required=False, allow_blank=True)
    captcha_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        # Validate captcha if provided
        captcha_key = attrs.get("captcha_key")
        captcha_code = attrs.get("captcha_code")
        if captcha_key or captcha_code:
            from apps.accounts.captcha import verify_captcha
            is_valid, err_msg = verify_captcha(captcha_key, captcha_code)
            if not is_valid:
                raise serializers.ValidationError({"captcha_code": err_msg})

        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"],
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        if user.status != "ACTIVE":
            raise serializers.ValidationError("This account is not active.")

        attrs["user"] = user
        return attrs


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class AuthResponseSerializer(serializers.Serializer):
    user = UserSerializer()
    tokens = TokenPairSerializer()


class RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        attrs["tokens"] = TokenService.refresh_tokens(attrs["refresh"])
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        try:
            RefreshToken(attrs["refresh"])
        except Exception as exc:
            raise serializers.ValidationError("Invalid refresh token.") from exc
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        return PasswordResetService.send_reset_email(
            email=self.validated_data["email"],
            request=self.context.get("request"),
        )


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=False, allow_blank=True, default="")
    token = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.CharField(required=False, allow_blank=True, default="")
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        email = attrs.get("email", "").strip()
        uid = attrs.get("uid", "").strip()
        token = attrs.get("token", "").strip()

        if email:
            user = User.objects.filter(email__iexact=email, is_active=True).first()
            if not user:
                raise serializers.ValidationError({"email": "No active account found with this email address."})
            attrs["user"] = user
            return attrs

        if uid and token:
            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
            except Exception as exc:
                raise serializers.ValidationError("Invalid password reset link.") from exc

            if not PasswordResetService.is_valid_token(user, token):
                raise serializers.ValidationError("Invalid or expired password reset token.")

            attrs["user"] = user
            return attrs

        raise serializers.ValidationError("Please provide your registered email address or a valid reset token.")

    def save(self):
        PasswordResetService.reset_password(
            user=self.validated_data["user"],
            new_password=self.validated_data["new_password"],
        )

