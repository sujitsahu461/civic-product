#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main() -> None:
    from pathlib import Path
    try:
        import environ
        env_file = Path(__file__).resolve().parent / ".env"
        if env_file.exists():
            environ.Env.read_env(env_file)
    except ImportError:
        pass

    default_settings = "config.settings.test" if "test" in sys.argv else os.getenv("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", default_settings)
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Is it installed and available on your "
            "PYTHONPATH environment variable? Did you forget to activate a "
            "virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
