import logging

import groq
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services.chat import ChatService

logger = logging.getLogger(__name__)


def _error_response(message: str, code: str, status_code: int) -> Response:
    return Response({"error": message, "code": code}, status=status_code)


@api_view(["POST"])
def chat_with_unihelp(request):
    """Thin HTTP layer — validates input, delegates to ChatService, maps errors."""
    user_message = request.data.get("message")

    if not isinstance(user_message, str) or not user_message.strip():
        return _error_response(
            "Message must be a non-empty string.",
            "EMPTY_MESSAGE",
            status.HTTP_400_BAD_REQUEST,
        )
    user_message = user_message.strip()

    service = ChatService()
    try:
        result = service.chat(user_message)
        return Response(result)
    except groq.AuthenticationError as e:
        logger.error("Groq authentication failed: %s", e)
        return _error_response(
            "AI service authentication failed.",
            "LLM_AUTH_ERROR",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except groq.RateLimitError as e:
        logger.error("Groq rate limit exceeded: %s", e)
        return _error_response(
            "Too many requests to AI service.",
            "LLM_RATE_LIMIT",
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
    except groq.APIError as e:
        logger.error("Groq API error: %s", e)
        return _error_response(
            "AI service is temporarily unavailable.",
            "LLM_API_ERROR",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception("Unexpected error in chat endpoint")
        return _error_response(
            "Something went wrong.",
            "INTERNAL_ERROR",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
