
import asyncio
import os

from fastapi import FastAPI, HTTPException
from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gigachat_credentials: str = Field(validation_alias="GIGACHAT_CREDENTIALS")
    gigachat_scope: str = "GIGACHAT_API_PERS"
    gigachat_model: str = "GigaChat"
    gigachat_verify_ssl_certs: bool = True
    system_prompt: str = (
        "Ты полезный ассистент. Отвечай понятно и по существу."
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
app = FastAPI(title="GigaChat Proxy API")


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=20000)


class ChatResponse(BaseModel):
    answer: str


def generate_answer(prompt: str) -> str:
    """Синхронный вызов GigaChat SDK."""
    chat = Chat(
        model=settings.gigachat_model,
        messages=[
            Messages(
                role=MessagesRole.SYSTEM,
                content=settings.system_prompt,
            ),
            Messages(
                role=MessagesRole.USER,
                content=prompt,
            ),
        ],
    )

    with GigaChat(
        credentials=settings.gigachat_credentials,
        scope=settings.gigachat_scope,
        verify_ssl_certs=settings.gigachat_verify_ssl_certs,
        ca_bundle_file=os.environ["GIGACHAT_CA_BUNDLE_FILE"],
    ) as client:
        response = client.chat(chat)

    return response.choices[0].message.content


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # SDK синхронный, поэтому выполняем его в отдельном потоке.
        answer = await asyncio.to_thread(
            generate_answer,
            request.prompt,
        )
        return ChatResponse(answer=answer)

    except Exception:
        # Подробности исключения не раскрываем клиенту.
        # На сервере их следует записывать в журнал.
        import logging
        logging.exception("GigaChat request failed")

        raise HTTPException(
            status_code=502,
            detail="Не удалось получить ответ от GigaChat",
        )
