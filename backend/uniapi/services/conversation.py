from __future__ import annotations

import logging
import uuid

from django.db import transaction
from django.utils import timezone
from groq.types.chat import (
    ChatCompletionAssistantMessageParam,
    ChatCompletionUserMessageParam,
)

from ..models import Conversation, Message

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 20
MAX_HISTORY_TOKENS = 6000
MAX_CONVERSATION_MESSAGES = 500

HistoryMessage = (
    ChatCompletionUserMessageParam | ChatCompletionAssistantMessageParam
)


def get_conversation(conversation_id: uuid.UUID) -> Conversation:
    """Load an existing conversation.

    Raises Conversation.DoesNotExist when the ID is unknown — callers must turn
    that into a 404 rather than silently creating a new conversation (a dead
    frontend ID is a bug, not a new chat).
    """
    conversation = Conversation.objects.get(pk=conversation_id)
    assert isinstance(conversation, Conversation)
    return conversation


def create_conversation() -> Conversation:
    """Create a brand-new conversation."""
    conversation = Conversation.objects.create()
    assert isinstance(conversation, Conversation)
    return conversation


def _estimate_tokens(content: str) -> int:
    """
    Rough message-size estimator for history bounding.
    """
    return max(1, (len(content) + 3) // 4)


def load_history(conversation: Conversation) -> list[HistoryMessage]:
    """
    Return bounded history for the LLM, oldest→newest. 
    """
    qs = Message.objects.filter(conversation=conversation).order_by(
        "-created_at", "-id"
    )[:MAX_HISTORY_MESSAGES]

    selected: list[Message] = []
    total = 0
    for message in qs:
        size = _estimate_tokens(message.content)
        if size > MAX_HISTORY_TOKENS:
            continue
        if total + size > MAX_HISTORY_TOKENS:
            break
        total += size
        selected.append(message)

    selected.reverse()
    return [
        {"role": message.role, "content": message.content}
        for message in selected
    ]

def conversation_size(conversation: Conversation) -> int:
    """Count messages in a conversation (used for the max-size guard)."""
    count = Message.objects.filter(conversation=conversation).count()
    assert isinstance(count, int)
    return count


def save_messages(
    conversation: Conversation,
    user_message: str,
    assistant_message: str,
    prompt_tokens: int,
    completion_tokens: int,
    intent: str,
) -> None:
    if conversation_size(conversation) + 2 > MAX_CONVERSATION_MESSAGES:
        raise ValueError("conversation has reached its maximum message count")

    with transaction.atomic():
        Message.objects.bulk_create(
            [
                Message(
                    conversation=conversation,
                    role=Message.Role.USER,
                    content=user_message,
                    intent=intent,
                ),
                Message(
                    conversation=conversation,
                    role=Message.Role.ASSISTANT,
                    content=assistant_message,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    intent=intent,
                ),
            ]
        )
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])