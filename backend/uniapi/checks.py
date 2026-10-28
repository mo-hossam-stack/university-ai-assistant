from __future__ import annotations

from django.conf import settings
from django.core import checks

REQUIRED_VARS = {
    "SECRET_KEY": (
        "uniapi.E001",
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(50))\"",
    ),
    "GROQ_API_KEY": (
        "uniapi.E002",
        "Create a key at https://console.groq.com/keys and set it in backend/.env.",
    ),
    "GROQ_MODEL": (
        "uniapi.E003",
        "Set the Groq chat model in backend/.env, e.g. llama-3.3-70b-versatile.",
    ),
}


@checks.register()
def check_required_env_vars(app_configs=None, **kwargs):
    """Fail with a readable message when required configuration is missing."""
    errors = []
    for name, (error_id, hint) in REQUIRED_VARS.items():
        if not getattr(settings, name, ""):
            errors.append(
                checks.Error(
                    f"{name} is not set.",
                    hint=hint,
                    id=error_id,
                )
            )
    return errors
