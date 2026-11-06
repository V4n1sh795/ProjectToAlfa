import json
import logging
import re
from typing import TypeVar

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError

from . import prompts
from .auth import require_jwt
from .providers import LLMClient, LLMError, LLMTimeout, build_client
from .schemas import (
    GenerateCasesRequest,
    GenerateCasesResult,
    RefineCaseRequest,
    RefineCaseResult,
)
from .settings import Settings, get_settings

log = logging.getLogger("ai")
T = TypeVar("T", bound=BaseModel)


def create_app(settings: Settings | None = None, client: LLMClient | None = None) -> FastAPI:
    app = FastAPI(title="AI service")
    app.state.settings = settings or get_settings()
    app.state.client = client or build_client(app.state.settings)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        # Ошибки входных данных — 400, а не 422 по умолчанию.
        return JSONResponse(status_code=400, content={"detail": "Некорректные входные данные"})

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.post("/generate-cases", response_model=GenerateCasesResult)
    async def generate_cases(body: GenerateCasesRequest, request: Request, _=Depends(require_jwt)):
        return await ask(
            request.app.state.client,
            prompts.GENERATE_SYSTEM,
            prompts.generate_user_message(body.userPrompt),
            GenerateCasesResult,
        )

    @app.post("/refine-case", response_model=RefineCaseResult)
    async def refine_case(body: RefineCaseRequest, request: Request, _=Depends(require_jwt)):
        return await ask(
            request.app.state.client,
            prompts.REFINE_SYSTEM,
            prompts.refine_user_message(body.currentCase.model_dump(), body.userInstruction),
            RefineCaseResult,
        )

    return app


def parse_answer(text: str, model: type[T]) -> T:
    text = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", text.strip(), flags=re.I)
    return model.model_validate(json.loads(text))


async def ask(client: LLMClient, system: str, user: str, model: type[T]) -> T:
    """Вызов модели с проверкой ответа по схеме и одним автоповтором при невалидном ответе."""
    message = user
    for attempt in (1, 2):
        try:
            answer = await client.complete(system, message)
        except LLMTimeout:
            log.warning("LLM timeout")
            raise HTTPException(status_code=504, detail="Превышено время ожидания ответа модели")
        except LLMError:
            log.exception("LLM provider failure")
            raise HTTPException(status_code=502, detail="Не удалось получить ответ от модели")
        try:
            return parse_answer(answer, model)
        except (ValueError, ValidationError) as exc:
            log.warning("Invalid model response (attempt %d): %s", attempt, exc)
            message = f"{user}\n\n{prompts.RETRY_HINT}"
    raise HTTPException(status_code=502, detail="Модель вернула некорректный ответ")

