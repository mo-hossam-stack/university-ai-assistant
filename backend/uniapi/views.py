from groq import Groq
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

GROQ_API_KEY = settings.GROQ_API_KEY 
client = Groq(api_key=GROQ_API_KEY)

def load_system_prompt():
    try:
        with open("prompts/unihelp_template.md", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "You are a helpful university assistant."

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