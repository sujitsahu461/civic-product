from .base import *  # noqa: F403


DEBUG = True
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True

# Disable throttling in development to prevent 429 rate-limit errors
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = ()  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": None,
    "user": None,
    "auth": None,
}

# In dev, use SMTP backend if EMAIL_HOST_USER or explicit EMAIL_BACKEND is set, else console fallback
if env("EMAIL_BACKEND", default="") == "django.core.mail.backends.smtp.EmailBackend" or env("EMAIL_HOST_USER", default=""):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]


# Development only: let the side-by-side showcase page (tools/showcase, port 8090) frame the website.
# Production keeps frame-ancestors 'none' and X-Frame-Options DENY.
MIDDLEWARE = [m for m in MIDDLEWARE if "XFrameOptionsMiddleware" not in m]  # noqa: F405
for _name in ("SECURE_CSP", "SECURE_CSP_REPORT_ONLY"):
    _policy = globals().get(_name)
    if _policy:
        globals()[_name] = {**_policy, "frame-ancestors": ["'self'", "http://127.0.0.1:8090", "http://localhost:8090"]}
