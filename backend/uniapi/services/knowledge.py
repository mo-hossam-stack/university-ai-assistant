from __future__ import annotations

import json
import logging
from pathlib import Path

from .classifier import INTENT_DATA_MAP, OUT_OF_SCOPE

logger = logging.getLogger(__name__)

# Both resolve to uniapi/ from uniapi/services/
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

_template_cache: str | None = None
_per_intent_cache: dict[str, str] = {}


def load_template() -> str:
    """Load the system prompt template, caching after first read."""
    global _template_cache
    if _template_cache is not None:
        return _template_cache

    try:
        with open(PROMPTS_DIR / "unihelp_template.md", "r", encoding="utf-8") as f:
            _template_cache = f.read()
    except FileNotFoundError:
        _template_cache = "You are a helpful university assistant."
    return _template_cache


def load_knowledge_for_intent(intent: str) -> str:
    """Load and format the JSON knowledge file for a given intent."""
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
    except (json.JSONDecodeError, FileNotFoundError) as e:
        logger.warning("Knowledge file %s unavailable: %s", filename, e)
        return ""

    _per_intent_cache[filename] = result
    return result


def build_system_prompt(intent: str) -> str:
    """Build the full system prompt: template + matching knowledge base."""
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
