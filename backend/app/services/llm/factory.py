"""Builds (and caches) LLM providers from settings."""
from app.core.config import ProviderName, Settings
from app.core.exceptions import ProviderNotConfiguredError
from app.schemas.common import ProviderInfo
from app.services.llm.base import LLMProvider
from app.services.llm.openai_compatible import GroqProvider, OpenAIProvider


class LLMProviderFactory:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._cache: dict[str, LLMProvider] = {}

    @property
    def default_provider(self) -> ProviderName:
        return self.settings.llm_provider

    def _config(self) -> dict[str, tuple[str | None, str]]:
        s = self.settings
        return {
            "openai": (s.openai_api_key, s.openai_model),
            "groq": (s.groq_api_key, s.groq_model),
        }

    def list_providers(self) -> list[ProviderInfo]:
        return [
            ProviderInfo(
                name=name,
                model=model,
                configured=bool(key),
                is_default=name == self.default_provider,
            )
            for name, (key, model) in self._config().items()
        ]

    def get(self, name: ProviderName | None = None) -> LLMProvider:
        name = name or self.default_provider
        if name in self._cache:
            return self._cache[name]

        config = self._config()
        if name not in config:
            raise ProviderNotConfiguredError(f"Unknown LLM provider '{name}'.")
        api_key, model = config[name]
        if not api_key:
            raise ProviderNotConfiguredError(
                f"No API key configured for '{name}'. Set {name.upper()}_API_KEY in backend/.env."
            )

        provider_cls = OpenAIProvider if name == "openai" else GroqProvider
        provider = provider_cls(api_key=api_key, model=model, temperature=self.settings.llm_temperature)
        self._cache[name] = provider
        return provider
