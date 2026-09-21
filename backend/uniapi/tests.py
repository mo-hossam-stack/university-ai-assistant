from __future__ import annotations

import uuid
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from groq import APIError as GroqAPIError
from rest_framework import status
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.test import APITestCase

from .models import Conversation, Message
from .services.conversation import load_history, save_messages

HIGH_RATE = patch.object(
    SimpleRateThrottle, "THROTTLE_RATES", {"anon": "100000/min"}
)

def _usage(prompt_tokens: int, completion_tokens: int) -> SimpleNamespace:
    return SimpleNamespace(
        prompt_tokens=prompt_tokens, completion_tokens=completion_tokens
    )


def _llm_response(
    content: str, usage: SimpleNamespace | None = None
) -> SimpleNamespace:
    if usage is None:
        usage = _usage(42, 7)
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=usage,
    )


def _fake_client(response: SimpleNamespace | Exception) -> SimpleNamespace:
    def create(**kwargs):
        if isinstance(response, Exception):
            raise response
        return response

    return SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create))
    )


def _patch_chat(response: SimpleNamespace | Exception) -> Any:
    return patch(
        "uniapi.services.chat.get_groq_client",
        return_value=_fake_client(response),
    )


def _patch_classifier(intent_value: str = "OUT_OF_SCOPE") -> Any:
    def create(**kwargs):
        return SimpleNamespace(
            choices=[
                SimpleNamespace(message=SimpleNamespace(content=intent_value))
            ]
        )

    return patch(
        "uniapi.services.classifier.get_groq_client",
        return_value=SimpleNamespace(
            chat=SimpleNamespace(completions=SimpleNamespace(create=create))
        ),
    )


@HIGH_RATE
class ChatEndpointTests(APITestCase):
    def setUp(self):
        self.url = "/api/chat_with_unihelp/"

    def test_new_conversation_creates_and_returns_id(self):
        with _patch_chat(_llm_response("hello there")), _patch_classifier():
            resp = self.client.post(self.url, {"message": "hi"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["response"], "hello there")
        conv_id = uuid.UUID(resp.data["conversation_id"])
        self.assertTrue(Conversation.objects.filter(pk=conv_id).exists())

    def test_followup_reuses_conversation_and_passes_history(self):
        conversation = Conversation.objects.create()
        captured_messages: list = []

        def capture_create(**kwargs):
            self.assertEqual(kwargs["messages"][0]["role"], "system")
            captured_messages.append(kwargs["messages"])
            return _llm_response("ok")

        client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=capture_create)
            )
        )
        with patch(
            "uniapi.services.chat.get_groq_client", return_value=client
        ), _patch_classifier():
            resp = self.client.post(
                self.url,
                {"message": "first", "conversation_id": str(conversation.id)},
                format="json",
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resp.data["conversation_id"], str(conversation.id))
            captured_messages.clear()  # only inspect the follow-up request

            save_messages(
                conversation,
                "first",
                "first answer",
                prompt_tokens=10,
                completion_tokens=5,
                intent="portal_help",
            )

            resp = self.client.post(
                self.url,
                {"message": "followup", "conversation_id": str(conversation.id)},
                format="json",
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.assertEqual(len(captured_messages), 1)
        last = captured_messages[0]
        self.assertIn({"role": "user", "content": "first"}, last)
        self.assertIn({"role": "assistant", "content": "first answer"}, last)
        self.assertEqual(last[-1]["content"], "followup")

    def test_malformed_uuid_returns_400(self):
        resp = self.client.post(
            self.url,
            {"message": "hi", "conversation_id": "not-a-uuid"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_conversation_returns_404_not_created(self):
        missing = uuid.uuid4()
        resp = self.client.post(
            self.url,
            {"message": "hi", "conversation_id": str(missing)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.data["code"], "CONVERSATION_NOT_FOUND")
        self.assertFalse(Conversation.objects.filter(pk=missing).exists())

    def test_empty_message_returns_400(self):
        resp = self.client.post(self.url, {"message": ""}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_message_returns_400(self):
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_message_returns_400(self):
        resp = self.client.post(self.url, {"message": "x" * 10001}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_groq_failure_returns_503_and_persists_nothing(self):
        boom = GroqAPIError(
            "boom", request=SimpleNamespace(), body={"error": {"message": "boom"}}
        )
        with _patch_chat(boom), _patch_classifier():
            resp = self.client.post(self.url, {"message": "hi"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(Message.objects.count(), 0)
        self.assertEqual(Conversation.objects.count(), 0)

    def test_tokens_split_into_prompt_and_completion(self):
        conversation = Conversation.objects.create()
        save_messages(
            conversation,
            "user msg",
            "assistant msg",
            prompt_tokens=30,
            completion_tokens=12,
            intent="portal_help",
        )
        user_msg = conversation.messages.get(role=Message.Role.USER)
        assistant_msg = conversation.messages.get(role=Message.Role.ASSISTANT)
        self.assertEqual(user_msg.prompt_tokens, 0)
        self.assertEqual(user_msg.completion_tokens, 0)
        self.assertEqual(assistant_msg.prompt_tokens, 30)
        self.assertEqual(assistant_msg.completion_tokens, 12)


@HIGH_RATE
class ConversationServiceTests(TestCase):
    def test_load_history_bounded_and_reversed(self):
        conversation = Conversation.objects.create()
        for i in range(30):
            save_messages(
                conversation, f"user-{i}", f"bot-{i}",
                prompt_tokens=10, completion_tokens=5, intent="portal_help",
            )
        history = load_history(conversation)
        # 30 turns = 60 messages; message cap 20 binds (token estimate ~2/msg).
        self.assertEqual(len(history), 20)
        self.assertEqual(history[0], {"role": "user", "content": "user-20"})
        self.assertEqual(history[-1], {"role": "assistant", "content": "bot-29"})

    def test_load_history_respects_token_budget(self):
        conversation = Conversation.objects.create()
        # Each message is 2000 chars → exactly 500 estimated tokens.
        # 8 turns = 16 messages = 8000 > budget 6000 → newest 12 fit (6000).
        long_msg = "x" * 2000
        for i in range(8):
            save_messages(
                conversation, long_msg, long_msg,
                prompt_tokens=700, completion_tokens=100, intent="portal_help",
            )
        history = load_history(conversation)
        self.assertEqual(len(history), 12)

    def test_load_history_skips_single_oversized_message(self):
        conversation = Conversation.objects.create()
        # Assistant message huge (100K chars ≈ 25K tokens) — over budget, skipped.
        # User message small — included.
        save_messages(
            conversation, "small question", "z" * 100_000,
            prompt_tokens=100, completion_tokens=100, intent="portal_help",
        )
        history = load_history(conversation)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["role"], "user")
        self.assertEqual(history[0]["content"], "small question")

    def test_save_messages_bumps_updated_at(self):
        conversation = Conversation.objects.create()
        before = conversation.updated_at
        save_messages(
            conversation, "user msg", "bot msg",
            prompt_tokens=5, completion_tokens=3, intent="portal_help",
        )
        self.assertGreater(conversation.updated_at, before)
        self.assertEqual(conversation.messages.count(), 2)


class RateLimitTests(APITestCase):
    def test_over_limit_returns_429(self):
        url = "/api/chat_with_unihelp/"
        with patch.object(
            SimpleRateThrottle, "THROTTLE_RATES", {"anon": "3/min"}
        ):
            cache.clear()
            for _ in range(3):
                self.client.post(url, {"message": "hi"}, format="json")
            resp = self.client.post(url, {"message": "hi"}, format="json")
            self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)