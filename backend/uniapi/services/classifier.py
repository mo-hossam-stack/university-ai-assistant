from __future__ import annotations

import logging
from pathlib import Path

import groq

from .llm import get_groq_client

logger = logging.getLogger(__name__)

OUT_OF_SCOPE = "OUT_OF_SCOPE"
CLASSIFIER_TIMEOUT = 5

# Classifier needs the prompt file — resolves to uniapi/prompts/ from uniapi/services/
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

# Maps classified intent → knowledge base filename.
# Classifier owns this: it validates the LLM's one-word response against these keys.
INTENT_DATA_MAP = {
    "course_registration": "course_registration.json",
    "academic_calendar": "academic_calendar.json",
    "fees_payments": "fees_payments.json",
    "results_gpa": "results_gpa.json",
    "exams_timetable": "exams_timetable.json",
    "portal_help": "portal_help.json",
}

_classifier_prompt_cache: str | None = None


def load_classifier_prompt() -> str:
    """Load the classifier system prompt, caching after first read."""
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


def classify_intent(user_message: str) -> str:
    """Classify a user message into an intent category via a fast LLM call."""
    classifier_prompt = load_classifier_prompt()

    try:
        client = get_groq_client()
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
    except groq.GroqError:
        logger.warning("Classifier Groq call failed, falling back to OUT_OF_SCOPE")
        return OUT_OF_SCOPE

    content = response.choices[0].message.content
    if not content:
        logger.info("Classified intent: %s (empty classifier response)", OUT_OF_SCOPE)
        return OUT_OF_SCOPE

    intent = content.strip().lower()

    if intent in INTENT_DATA_MAP:
        logger.info("Classified intent: %s", intent)
        return intent

    logger.info("Classified intent: %s (mapped to OUT_OF_SCOPE)", intent)
    return OUT_OF_SCOPE
