from __future__ import annotations

from typing import Any

from rest_framework.exceptions import ParseError, Throttled, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

_STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "NOT_AUTHENTICATED",
    403: "PERMISSION_DENIED",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    415: "UNSUPPORTED_MEDIA_TYPE",
    429: "RATE_LIMITED",
}

_FALLBACK_MESSAGE = "Request could not be processed."


def _message(detail: Any) -> str:
    if isinstance(detail, str):
        return detail
    if (
        isinstance(detail, list)
        and detail
        and all(isinstance(item, str) for item in detail)
    ):
        return " ".join(detail)
    if isinstance(detail, dict):
        for value in detail.values():
            message = _message(value)
            if message != _FALLBACK_MESSAGE:
                return message
    return _FALLBACK_MESSAGE


def _error_code(exc: Exception, status_code: int) -> str:
    if isinstance(exc, Throttled):
        return "RATE_LIMITED"
    if isinstance(exc, ValidationError):
        return "VALIDATION_ERROR"
    if isinstance(exc, ParseError):
        return "PARSE_ERROR"
    return _STATUS_CODES.get(status_code, "API_ERROR")


def api_exception_handler(
    exc: Exception, context: dict[str, Any]
) -> Response | None:
    """Normalize DRF error responses to the {"error", "code"} contract.

    Returns None for non-DRF exceptions so Django keeps its normal handling.
    Mutates the existing response, preserving status and headers such as
    Retry-After from the throttler.
    """
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    response.data = {
        "error": _message(response.data),
        "code": _error_code(exc, response.status_code),
    }
    return response
