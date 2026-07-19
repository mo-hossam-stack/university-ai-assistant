from __future__ import annotations

import logging

from .classifier import classify_intent
from .knowledge import build_system_prompt
from .llm import get_groq_client

logger = logging.getLogger(__name__)


class ChatService:

    def chat(self, user_message: str) -> dict[str, str]:
        intent = classify_intent(user_message)
        system_prompt = build_system_prompt(intent)

        logger.info(
            "Chat request: intent=%s msg_len=%d", intent, len(user_message)
        )

        response = get_groq_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,
            max_tokens=600,
        )

        answer = response.choices[0].message.content
        return {"response": answer}
