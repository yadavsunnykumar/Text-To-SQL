"""OpenAI and Groq providers.

Both SDKs expose the same `client.chat.completions.create(...)` interface, so the
shared logic lives in one base class and each subclass only builds its client.
"""
import logging
from typing import Any

from app.core.exceptions import LLMProviderError
from app.services.llm.base import ChatMessage, LLMProvider

logger = logging.getLogger(__name__)


class _ChatCompletionsProvider(LLMProvider):
    def __init__(self, api_key: str, model: str, temperature: float = 0.0, timeout: float = 60.0):
        self.model = model
        self.temperature = temperature
        self.timeout = timeout
        self._client = self._build_client(api_key)

    def _build_client(self, api_key: str) -> Any:  # pragma: no cover - overridden
        raise NotImplementedError

    def complete(self, messages: list[ChatMessage]) -> str:
        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
            )
        except Exception as exc:  # SDK-specific error classes vary; normalise them
            logger.warning("%s request failed: %s", self.name, exc)
            raise LLMProviderError(f"{self.name} request failed: {exc}") from exc

        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise LLMProviderError(f"{self.name} returned an empty response.")
        return content


class OpenAIProvider(_ChatCompletionsProvider):
    name = "openai"

    def _build_client(self, api_key: str) -> Any:
        from openai import OpenAI

        return OpenAI(api_key=api_key, timeout=self.timeout)


class GroqProvider(_ChatCompletionsProvider):
    name = "groq"

    def _build_client(self, api_key: str) -> Any:
        from groq import Groq

        return Groq(api_key=api_key, timeout=self.timeout)
