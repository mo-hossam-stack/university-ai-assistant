from __future__ import annotations

from rest_framework import serializers

from .models import Conversation, Message


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000, allow_blank=False)
    conversation_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class ChatResponseSerializer(serializers.Serializer):
    response = serializers.CharField()
    conversation_id = serializers.UUIDField()
    tokens_used = serializers.IntegerField(required=False, default=0)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "tokens_used", "intent", "created_at")


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "title", "created_at", "updated_at", "messages")
