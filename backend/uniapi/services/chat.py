from __future__ import annotations

import logging
import time
import uuid

from django.conf import settings

from groq.types.chat import ChatCompletionMessageParam

from .classifier import classify_intent
from .conversation import (
    HistoryMessage,
    create_conversation,
    get_conversation,
    load_history,
    save_messages,
)
from .knowledge import build_system_prompt
from .llm import get_groq_client

logger = logging.getLogger(__name__)


class ChatService:

    def chat(
        self,
        user_message: str,
        request_id: str = "",
        conversation_id: uuid.UUID | None = None,
    ) -> dict[str, str]:
        if conversation_id is None:
            conversation = None
            history: list[HistoryMessage] = []
        else:
            conversation = get_conversation(conversation_id)
            history = load_history(conversation)

        intent = classify_intent(user_message)
        system_prompt = build_system_prompt(intent)

        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": user_message},
        ]

        logger.info(
            "chat request request_id=%s conversation_id=%s msg_len=%d "
            "history_msgs=%d",
            request_id,
            conversation_id or "new",
            len(user_message),
            len(history),
        )

        if not settings.GROQ_MODEL:
            raise ValueError("GROQ_MODEL is not configured — set it in backend/.env")
        start = time.monotonic()
        response = get_groq_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=600,
        )
        latency_ms = int((time.monotonic() - start) * 1000)

        answer = response.choices[0].message.content
        if not answer:
            raise ValueError("The LLM returned an empty response")

        prompt_tokens = response.usage.prompt_tokens if response.usage else 0
        completion_tokens = (
            response.usage.completion_tokens if response.usage else 0
        )

        if conversation is None:
            conversation = create_conversation()
        save_messages(
            conversation,
            user_message,
            answer,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            intent=intent,
        )

        logger.info(
            "chat complete request_id=%s conversation_id=%s "
            "prompt_tokens=%d completion_tokens=%d latency_ms=%d",
            request_id,
            conversation.id,
            prompt_tokens,
            completion_tokens,
            latency_ms,
        )

        return {
            "response": answer,
            "conversation_id": str(conversation.id),
        }