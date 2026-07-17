import json
import logging
from groq import Groq
from pathlib import Path
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

logger = logging.getLogger(__name__)

GROQ_API_KEY = settings.GROQ_API_KEY
client = Groq(api_key=GROQ_API_KEY)

OUT_OF_SCOPE = "OUT_OF_SCOPE"
CLASSIFIER_TIMEOUT = 5

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

INTENT_DATA_MAP = {
    "course_registration": "course_registration.json",
    "academic_calendar": "academic_calendar.json",
    "fees_payments": "fees_payments.json",
    "results_gpa": "results_gpa.json",
    "exams_timetable": "exams_timetable.json",
    "portal_help": "portal_help.json",
}

_classifier_prompt_cache = None
_template_cache = None
_per_intent_cache: dict[str, str] = {}


def load_classifier_prompt() -> str:
    global _classifier_prompt_cache
    if _classifier_prompt_cache is not None:
        return _classifier_prompt_cache

    try:
        with open(PROMPTS_DIR / "classifier_prompt.md", "r", encoding="utf-8") as f:
            _classifier_prompt_cache = f.read()
    except FileNotFoundError:
        logger.warning("Classifier prompt not found, using fallback")
        _classifier_prompt_cache = (
            "Classify the user query into exactly one category:\n"
            "- course_registration, academic_calendar, fees_payments, "
            "results_gpa, exams_timetable, portal_help, OUT_OF_SCOPE\n"
            "Output ONE WORD ONLY."
        )
    return _classifier_prompt_cache


def load_template() -> str:
    global _template_cache
    if _template_cache is not None:
        return _template_cache

    try:
        with open(PROMPTS_DIR / "unihelp_template.md", "r", encoding="utf-8") as f:
            _template_cache = f.read()
    except FileNotFoundError:
        _template_cache = "You are a helpful university assistant."
    return _template_cache


def classify_intent(user_message: str) -> str:
    classifier_prompt = load_classifier_prompt()

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": classifier_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.0,
            max_tokens=20,
            timeout=CLASSIFIER_TIMEOUT,
        )
        intent = response.choices[0].message.content.strip().lower()

        if intent in INTENT_DATA_MAP:
            logger.info(
                "Classified intent: %s for message: %s", intent, user_message[:50]
            )
            return intent

        logger.info(
            "Classified intent: %s (mapped to OUT_OF_SCOPE) for message: %s",
            intent,
            user_message[:50],
        )
        return OUT_OF_SCOPE
    except Exception as e:
        logger.warning("Classifier failed, defaulting to OUT_OF_SCOPE: %s", e)
        return OUT_OF_SCOPE


def load_knowledge_for_intent(intent: str) -> str:
    if intent == OUT_OF_SCOPE:
        return ""

    filename = INTENT_DATA_MAP.get(intent)
    if filename is None:
        return ""

    if filename in _per_intent_cache:
        return _per_intent_cache[filename]

    filepath = DATA_DIR / filename
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        formatted = json.dumps(data, ensure_ascii=False, indent=2)
        result = (
            f"========================\n"
            f"FILE: {filename}\n"
            f"========================\n"
            f"{formatted}"
        )
    except Exception as e:
        logger.warning("Failed to load knowledge file %s: %s", filename, e)
        return ""

    _per_intent_cache[filename] = result
    return result


def build_system_prompt(intent: str) -> str:
    template = load_template()
    knowledge = load_knowledge_for_intent(intent)

    if not knowledge:
        logger.info("Intent=%s PromptSize=%d chars", intent, len(template))
        return template

    system_prompt = (
        f"{template}\n\n"
        f"The following university knowledge base is authoritative.\n"
        f"When answering university-specific questions, prefer this information over general knowledge.\n"
        f"If the answer is not present, state that clearly rather than inventing details.\n\n"
        f"--- KNOWLEDGE BASE ---\n\n"
        f"{knowledge}"
    )
    logger.info("Intent=%s PromptSize=%d chars", intent, len(system_prompt))
    return system_prompt


@api_view(["POST"])
def chat_with_unihelp(request):
    try:
        user_message = request.data.get("message", "")

        intent = classify_intent(user_message)
        system_prompt = build_system_prompt(intent)

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,
            max_tokens=600,
        )

        answer = response.choices[0].message.content

        return Response({"response": answer})

    except Exception as e:
        return Response(
            {"error": f"Something went wrong: {str(e)}"},
            status=500,
        )
