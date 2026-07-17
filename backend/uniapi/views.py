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

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Ordered by value  highest-priority knowledge first
KNOWLEDGE_FILES = [
    "results_gpa.json",
    "course_registration.json",
    "exams_timetable.json",
    "academic_calendar.json",
    "fees_payments.json",
    "portal_help.json",
]

_knowledge_base_cache = None


def load_knowledge_base():
    """Load all knowledge base JSON files, format with clear separators.

    Returns a cached string combining all files. Loaded once, then served
    from memory on every subsequent call. Malformed files are skipped
    with a warning — one bad file won't crash the assistant.
    """
    global _knowledge_base_cache
    if _knowledge_base_cache is not None:
        return _knowledge_base_cache

    parts = []
    for filename in KNOWLEDGE_FILES:
        filepath = DATA_DIR / filename
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            formatted = json.dumps(data, ensure_ascii=False, indent=2)
            parts.append(
                f"========================\n"
                f"FILE: {filename}\n"
                f"========================\n"
                f"{formatted}"
            )
        except Exception as e:
            logger.warning("Failed to load knowledge file %s: %s", filename, e)
            continue

    _knowledge_base_cache = "\n\n".join(parts)
    return _knowledge_base_cache


_system_prompt_cache = None


def load_system_prompt():
    """Build the full system prompt with injected knowledge base.

    Cached after first call — no file I/O on subsequent requests.
    The knowledge base is framed as authoritative to reduce hallucination.
    """
    global _system_prompt_cache
    if _system_prompt_cache is not None:
        return _system_prompt_cache

    try:
        with open("prompts/unihelp_template.md", "r", encoding="utf-8") as f:
            prompt = f.read()
    except FileNotFoundError:
        prompt = "You are a helpful university assistant."

    knowledge = load_knowledge_base()
    _system_prompt_cache = (
        f"{prompt}\n\n"
        f"The following university knowledge base is authoritative.\n"
        f"When answering university-specific questions, prefer this information over general knowledge.\n"
        f"If the answer is not present, state that clearly rather than inventing details.\n\n"
        f"--- KNOWLEDGE BASE ---\n\n"
        f"{knowledge}"
    )
    return _system_prompt_cache


@api_view(["POST"])
def chat_with_unihelp(request):
    try:
        SYSTEM_TEMPLATE = load_system_prompt()
        user_message = request.data.get("message", "")

        messages_history = [
            {
                "role": "system",
                "content": SYSTEM_TEMPLATE
            },
            {
                "role": "user",
                "content": user_message
            }
        ]

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_history,
            temperature=0.4,
            max_tokens=600,
        )

        answer = response.choices[0].message.content

        return Response({"response": answer})

    except Exception as e:
        return Response(
            {"error": f"Something went wrong: {str(e)}"},
            status=500
        )