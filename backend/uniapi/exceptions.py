import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Normalize DRF validation and authorization errors to {"error": "..."} format
        if isinstance(response.data, dict):
            if "detail" in response.data:
                response.data = {"error": str(response.data["detail"])}
            elif len(response.data) > 0:
                # Merge multiple validation errors into a single clean string
                first_key = list(response.data.keys())[0]
                first_val = response.data[first_key]
                if isinstance(first_val, list):
                    err_msg = f"{first_key}: {first_val[0]}"
                else:
                    err_msg = f"{first_key}: {first_val}"
                response.data = {"error": err_msg}
        elif isinstance(response.data, list):
            response.data = {"error": "Invalid request data."}
        return response

    # Unhandled server exceptions
    logger.error(
        "Unhandled exception occurred: %s",
        exc,
        exc_info=True,
        extra={
            "view": (
                context.get("view").__class__.__name__
                if context.get("view")
                else "unknown"
            )
        },
    )
    return Response(
        {"error": "An unexpected server error occurred. Please try again later."},
        status=500,
    )
