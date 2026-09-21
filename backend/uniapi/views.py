from __future__ import annotations

import logging
import uuid

import groq
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Conversation
from .serializers import ChatRequestSerializer
from .services.chat import ChatService

logger = logging.getLogger(__name__)


def _error_response(message: str, code: str, status_code: int) -> Response:
    return Response({"error": message, "code": code}, status=status_code)


@api_view(["POST"])
def chat_with_unihelp(request: Request) -> Response:
    """Thin HTTP layer — validates input, delegates to ChatService, maps errors."""
    serializer = ChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user_message = serializer.validated_data["message"]
    conversation_id: uuid.UUID | None = serializer.validated_data.get(
        "conversation_id"
    )
    request_id = request.headers.get("X-Request-ID", "") or uuid.uuid4().hex[:8]

    service = ChatService()
    try:
        result = service.chat(
            user_message,
            request_id=request_id,
            conversation_id=conversation_id,
        )
        return Response(result)
    except Conversation.DoesNotExist:
        logger.warning(
            "request_id=%s conversation_id=%s not found",
            request_id,
            conversation_id,
        )
        return _error_response(
            "Conversation not found.",
            "CONVERSATION_NOT_FOUND",
            status.HTTP_404_NOT_FOUND,
        )
    except groq.AuthenticationError as e:
        logger.error("request_id=%s Groq authentication failed: %s", request_id, e)
        return _error_response(
            "AI service authentication failed.",
            "LLM_AUTH_ERROR",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except groq.RateLimitError as e:
        logger.error("request_id=%s Groq rate limit exceeded: %s", request_id, e)
        return _error_response(
            "Too many requests to AI service.",
            "LLM_RATE_LIMIT",
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
    except groq.APIError as e:
        logger.error("request_id=%s Groq API error: %s", request_id, e)
        return _error_response(
            "AI service is temporarily unavailable.",
            "LLM_API_ERROR",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception("request_id=%s unexpected error in chat endpoint", request_id)
        return _error_response(
            "Something went wrong.",
            "INTERNAL_ERROR",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
