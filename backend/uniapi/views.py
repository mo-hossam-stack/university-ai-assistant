from openai import OpenAI
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

OPENAI_API_KEY = settings.OPENAI_API_KEY
client = OpenAI(api_key=OPENAI_API_KEY)

def load_system_prompt():
    with open("prompts/unihelp_template.md", "r", encoding="utf-8") as f:
        return f.read()
    

@api_view(["POST"])
def chat_with_unihelp(request):
    try:
        SYSTEM_TEMPLATE = load_system_prompt()
        user_message = request.data.get("message", "")

        # Construct the new "input" format
        prompt_input = [
            {
                "role": "system",
                "content": SYSTEM_TEMPLATE
            },
            {
                "role": "user",
                "content": user_message
            }
        ]

        response = client.responses.create(
            model="gpt-5.1",
            input=prompt_input,
            temperature=0.4,
            max_output_tokens=600,
        )

        # Extract model response
        answer = response.output_text

        return Response({"response": answer})

    except Exception as e:
        return Response(
            {"error": f"An unexpected error occurred. {str(e)}"},
            status=500
        )
