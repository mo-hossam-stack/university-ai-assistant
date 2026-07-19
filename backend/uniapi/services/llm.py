from __future__ import annotations

import logging

from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)

# Lazy-initialized singleton — avoids crashing at import time if GROQ_API_KEY is
# missing (e.g. during `manage.py migrate` or test collection).
_client: Groq | None = None


def get_groq_client() -> Groq:
    """Return a shared Groq client, creating it on first call."""
    global _client
    if _client is None:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured in settings")
        _client = Groq(api_key=api_key)
        logger.info("Groq client initialized")
    return _client
