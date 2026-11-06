"""Provider-agnostic LLM interface."""
from abc import ABC, abstractmethod
from typing import Literal, TypedDict


class ChatMessage(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


class LLMProvider(ABC):
    """Anything that can turn a list of chat messages into a text reply."""

    name: str
    model: str

    @abstractmethod
    def complete(self, messages: list[ChatMessage]) -> str:
        """Return the assistant's reply text. Raise LLMProviderError on API failures."""
