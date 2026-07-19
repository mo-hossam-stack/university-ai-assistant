import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services.chat import ChatService

logger = logging.getLogger(__name__)


@api_view(["POST"])
def chat_with_unihelp(request):
    """Thin HTTP layer — delegates all logic to ChatService."""
    try:
        user_message = request.data.get("message", "")
        service = ChatService()
        result = service.chat(user_message)
        return Response(result)
    except Exception as e:
        logger.exception("Unexpected error in chat endpoint")
        return Response(
            {"error": f"Something went wrong: {str(e)}"},
            status=500,
        )
