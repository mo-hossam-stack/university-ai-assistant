from __future__ import annotations

import json
import tempfile
import uuid
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from groq import APIError as GroqAPIError
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

from .checks import check_required_env_vars
from .models import Conversation, Message
from .services import classifier, knowledge, llm
from .services.conversation import ConversationFull, load_history, save_messages

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


def _patch_classifier(
    intent_value: str | None = "OUT_OF_SCOPE",
    error: Exception | None = None,
) -> Any:
    def create(**kwargs):
        if error is not None:
            raise error
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
        self.assertEqual(resp.data["tokens_used"], 49)
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

    def test_full_conversation_returns_400(self):
        with patch(
            "uniapi.views.ChatService.chat",
            side_effect=ConversationFull("full"),
        ):
            resp = self.client.post(self.url, {"message": "hi"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data["code"], "CONVERSATION_FULL")

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

    def test_save_messages_rejects_full_conversation(self):
        conversation = Conversation.objects.create()
        Message.objects.bulk_create(
            [
                Message(
                    conversation=conversation,
                    role=Message.Role.USER,
                    content=f"message-{i}",
                )
                for i in range(499)
            ]
        )
        with self.assertRaises(ConversationFull):
            save_messages(
                conversation,
                "one more",
                "answer",
                prompt_tokens=5,
                completion_tokens=3,
                intent="portal_help",
            )

    def test_save_messages_titles_new_conversation(self):
        conversation = Conversation.objects.create()
        save_messages(
            conversation,
            "How do I register?",
            "answer",
            prompt_tokens=5,
            completion_tokens=3,
            intent="course_registration",
        )
        conversation.refresh_from_db()
        self.assertEqual(conversation.title, "How do I register?")

    def test_save_messages_keeps_existing_title(self):
        conversation = Conversation.objects.create(title="Existing title")
        save_messages(
            conversation,
            "Another question",
            "answer",
            prompt_tokens=5,
            completion_tokens=3,
            intent="portal_help",
        )
        conversation.refresh_from_db()
        self.assertEqual(conversation.title, "Existing title")

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
        with (
            patch.object(SimpleRateThrottle, "THROTTLE_RATES", {"anon": "3/min"}),
            _patch_chat(_llm_response("hi")),
            _patch_classifier(),
        ):
            cache.clear()
            for _ in range(3):
                self.client.post(url, {"message": "hi"}, format="json")
            resp = self.client.post(url, {"message": "hi"}, format="json")
            self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class RequiredEnvCheckTests(SimpleTestCase):
    def test_reports_each_missing_required_var(self):
        with override_settings(SECRET_KEY="", GROQ_API_KEY="", GROQ_MODEL=""):
            errors = check_required_env_vars(None)
        self.assertEqual(
            {error.id for error in errors},
            {"uniapi.E001", "uniapi.E002", "uniapi.E003"},
        )

    def test_passes_when_required_vars_are_set(self):
        with override_settings(
            SECRET_KEY="test-secret",
            GROQ_API_KEY="test-key",
            GROQ_MODEL="test-model",
        ):
            self.assertEqual(check_required_env_vars(None), [])


class LLMServiceTests(SimpleTestCase):
    def setUp(self):
        llm._client = None

    def tearDown(self):
        llm._client = None

    @override_settings(GROQ_API_KEY="")
    def test_missing_api_key_raises_value_error(self):
        with self.assertRaisesMessage(
            ValueError, "GROQ_API_KEY is not configured"
        ):
            llm.get_groq_client()

    @override_settings(GROQ_API_KEY="test-key")
    def test_client_is_created_once_and_cached(self):
        with patch("uniapi.services.llm.Groq") as groq_cls:
            first = llm.get_groq_client()
            second = llm.get_groq_client()

        groq_cls.assert_called_once_with(api_key="test-key")
        self.assertIs(first, second)


class ClassifierServiceTests(SimpleTestCase):
    def setUp(self):
        classifier._classifier_prompt_cache = None

    def tearDown(self):
        classifier._classifier_prompt_cache = None

    @override_settings(GROQ_CLASSIFIER_MODEL="test-model")
    def test_known_intent_is_normalized(self):
        with _patch_classifier("  COURSE_REGISTRATION \n"):
            self.assertEqual(
                classifier.classify_intent("when is registration"),
                "course_registration",
            )

    @override_settings(GROQ_CLASSIFIER_MODEL="test-model")
    def test_unknown_intent_maps_to_out_of_scope(self):
        with _patch_classifier("banana"):
            self.assertEqual(
                classifier.classify_intent("hello"), classifier.OUT_OF_SCOPE
            )

    @override_settings(GROQ_CLASSIFIER_MODEL="test-model")
    def test_empty_content_maps_to_out_of_scope(self):
        with _patch_classifier(None):
            self.assertEqual(
                classifier.classify_intent("hello"), classifier.OUT_OF_SCOPE
            )

    @override_settings(GROQ_CLASSIFIER_MODEL="test-model")
    def test_groq_error_maps_to_out_of_scope(self):
        boom = GroqAPIError(
            "boom", request=SimpleNamespace(), body={"error": {"message": "boom"}}
        )
        with _patch_classifier(error=boom):
            self.assertEqual(
                classifier.classify_intent("hello"), classifier.OUT_OF_SCOPE
            )

    @override_settings(GROQ_CLASSIFIER_MODEL=None)
    def test_missing_model_maps_to_out_of_scope_without_calling_llm(self):
        with patch(
            "uniapi.services.classifier.get_groq_client"
        ) as get_client:
            self.assertEqual(
                classifier.classify_intent("hello"), classifier.OUT_OF_SCOPE
            )
        get_client.assert_not_called()

    def test_missing_prompt_file_uses_fallback(self):
        with (
            tempfile.TemporaryDirectory() as tmp,
            patch.object(classifier, "PROMPTS_DIR", Path(tmp)),
        ):
            prompt = classifier.load_classifier_prompt()
        self.assertIn("Classify the user query", prompt)

    def test_prompt_is_cached_after_first_read(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "classifier_prompt.md"
            path.write_text("PROMPT", encoding="utf-8")
            with patch.object(classifier, "PROMPTS_DIR", Path(tmp)):
                self.assertEqual(
                    classifier.load_classifier_prompt(), "PROMPT"
                )
                path.write_text("CHANGED", encoding="utf-8")
                self.assertEqual(
                    classifier.load_classifier_prompt(), "PROMPT"
                )


class KnowledgeServiceTests(SimpleTestCase):
    def setUp(self):
        knowledge._template_cache = None
        knowledge._per_intent_cache.clear()

    def tearDown(self):
        knowledge._template_cache = None
        knowledge._per_intent_cache.clear()

    def test_out_of_scope_returns_empty(self):
        self.assertEqual(
            knowledge.load_knowledge_for_intent(knowledge.OUT_OF_SCOPE), ""
        )

    def test_unknown_intent_returns_empty(self):
        self.assertEqual(knowledge.load_knowledge_for_intent("banana"), "")

    def test_missing_file_returns_empty(self):
        with (
            tempfile.TemporaryDirectory() as tmp,
            patch.object(knowledge, "DATA_DIR", Path(tmp)),
        ):
            self.assertEqual(
                knowledge.load_knowledge_for_intent("portal_help"), ""
            )

    def test_malformed_json_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "portal_help.json").write_text(
                "{not json", encoding="utf-8"
            )
            with patch.object(knowledge, "DATA_DIR", Path(tmp)):
                self.assertEqual(
                    knowledge.load_knowledge_for_intent("portal_help"), ""
                )

    def test_valid_file_is_formatted_and_cached(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "portal_help.json"
            path.write_text(
                json.dumps({"help": "reset password"}), encoding="utf-8"
            )
            with patch.object(knowledge, "DATA_DIR", Path(tmp)):
                first = knowledge.load_knowledge_for_intent("portal_help")
                self.assertIn("FILE: portal_help.json", first)
                self.assertIn("reset password", first)
                path.write_text("{broken", encoding="utf-8")
                second = knowledge.load_knowledge_for_intent("portal_help")
        self.assertEqual(first, second)

    def test_missing_template_uses_fallback(self):
        with (
            tempfile.TemporaryDirectory() as tmp,
            patch.object(knowledge, "PROMPTS_DIR", Path(tmp)),
        ):
            template = knowledge.load_template()
        self.assertIn("helpful university assistant", template)

    def test_template_is_cached_after_first_read(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "unihelp_template.md"
            path.write_text("TEMPLATE", encoding="utf-8")
            with patch.object(knowledge, "PROMPTS_DIR", Path(tmp)):
                self.assertEqual(knowledge.load_template(), "TEMPLATE")
                path.write_text("CHANGED", encoding="utf-8")
                self.assertEqual(knowledge.load_template(), "TEMPLATE")

    def test_build_system_prompt_includes_knowledge(self):
        with (
            patch.object(knowledge, "load_template", return_value="TEMPLATE"),
            patch.object(
                knowledge,
                "load_knowledge_for_intent",
                return_value="KNOWLEDGE",
            ),
        ):
            prompt = knowledge.build_system_prompt("portal_help")
        self.assertIn("TEMPLATE", prompt)
        self.assertIn("KNOWLEDGE", prompt)

    def test_build_system_prompt_without_knowledge_is_template_only(self):
        with (
            patch.object(knowledge, "load_template", return_value="TEMPLATE"),
            patch.object(
                knowledge, "load_knowledge_for_intent", return_value=""
            ),
        ):
            self.assertEqual(
                knowledge.build_system_prompt(knowledge.OUT_OF_SCOPE), "TEMPLATE"
            )
