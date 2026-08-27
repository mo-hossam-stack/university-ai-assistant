from __future__ import annotations

from rest_framework import serializers


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000, allow_blank=False)
    conversation_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class ChatResponseSerializer(serializers.Serializer):
    response = serializers.CharField()
    conversation_id = serializers.UUIDField()
    tokens_used = serializers.IntegerField(required=False, default=0)
