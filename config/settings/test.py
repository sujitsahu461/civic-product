from .base import *  # noqa: F403


DEBUG = False
SECURE_SSL_REDIRECT = False

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": (),
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Uses MySQL from base.py — Django will auto-create test_<DB_NAME>
