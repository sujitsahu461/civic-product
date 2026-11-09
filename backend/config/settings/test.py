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

# The manifest storage needs `collectstatic` to have run; tests use plain storage instead.
STORAGES = {
    **STORAGES,  # noqa: F405
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
