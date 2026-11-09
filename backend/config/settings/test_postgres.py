import sys
from django.core.exceptions import ImproperlyConfigured
from .base import *  # noqa: F403

DEBUG = False
SECURE_SSL_REDIRECT = False

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_CLASSES": (),
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# The manifest storage needs `collectstatic` to have run; tests use plain storage instead.
STORAGES = {
    **STORAGES,  # noqa: F405
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# Dedicated PostgreSQL Test Database Configuration
ACTIVE_APP_DB = env("DB_NAME", default="civicsetu_db")
TEST_DB_NAME = env("TEST_DB_NAME", default="civicsetu_test_db")

# Safety guard: Refuse to run if test DB matches dev/production database
FORBIDDEN_TEST_NAMES = {ACTIVE_APP_DB.lower(), "civicsetu", "civicsetu_db", "civicsetu_production", "production"}

if TEST_DB_NAME.lower() in FORBIDDEN_TEST_NAMES and TEST_DB_NAME.lower() == ACTIVE_APP_DB.lower():
    raise ImproperlyConfigured(
        f"CRITICAL SAFETY VIOLATION: Dedicated PostgreSQL test database ('{TEST_DB_NAME}') "
        f"cannot match the active development or production database ('{ACTIVE_APP_DB}'). "
        f"Test execution aborted to prevent accidental destruction of application data."
    )

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": TEST_DB_NAME,
        "USER": env("DB_USER", default="postgres"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default="127.0.0.1"),
        "PORT": env.int("DB_PORT", default=5432),
        "CONN_MAX_AGE": 0,
        "TEST": {
            "NAME": TEST_DB_NAME,
        },
    }
}
