"""Универсальный клиент LLM. Смена провайдера — только конфигурация (LLM_PROVIDER)."""
import asyncio
from typing import Protocol

import httpx

from .settings import Settings


class LLMTimeout(Exception):
    pass


class LLMError(Exception):
    pass


class LLMClient(Protocol):
    async def complete(self, system: str, user: str) -> str: ...


class GigaChatClient:
    def __init__(self, settings: Settings):
        if not settings.gigachat_credentials:
            raise RuntimeError("GIGACHAT_CREDENTIALS не задан")
        self.s = settings

    def _call(self, system: str, user: str) -> str:
        from gigachat import GigaChat
        from gigachat.models import Chat, Messages, MessagesRole

        chat = Chat(
            model=self.s.llm_model or "GigaChat",
            messages=[
                Messages(role=MessagesRole.SYSTEM, content=system),
                Messages(role=MessagesRole.USER, content=user),
            ],
        )
        with GigaChat(
            credentials=self.s.gigachat_credentials,
            scope=self.s.gigachat_scope,
            verify_ssl_certs=self.s.gigachat_verify_ssl_certs,
            ca_bundle_file=self.s.gigachat_ca_bundle_file,
            timeout=self.s.llm_timeout_seconds,
        ) as client:
            return client.chat(chat).choices[0].message.content or ""

    async def complete(self, system: str, user: str) -> str:
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self._call, system, user),
                timeout=self.s.llm_timeout_seconds,
            )
        except (asyncio.TimeoutError, httpx.TimeoutException) as exc:
            raise LLMTimeout from exc
        except Exception as exc:
            if "timeout" in type(exc).__name__.lower() or "timed out" in str(exc).lower():
                raise LLMTimeout from exc
            raise LLMError(str(exc)) from exc


class OpenAICompatibleClient:
    def __init__(self, settings: Settings):
        if not settings.llm_model:
            raise RuntimeError("LLM_MODEL не задан")
        self.s = settings

    async def complete(self, system: str, user: str) -> str:
        headers = {"Authorization": f"Bearer {self.s.llm_api_key}"} if self.s.llm_api_key else {}
        body = {
            "model": self.s.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        try:
            async with httpx.AsyncClient(timeout=self.s.llm_timeout_seconds) as client:
                r = await client.post(
                    f"{self.s.llm_base_url.rstrip('/')}/chat/completions",
                    json=body,
                    headers=headers,
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"] or ""
        except httpx.TimeoutException as exc:
            raise LLMTimeout from exc
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            raise LLMError(str(exc)) from exc


def build_client(settings: Settings) -> LLMClient:
    if settings.llm_provider == "gigachat":
        return GigaChatClient(settings)
    return OpenAICompatibleClient(settings)
