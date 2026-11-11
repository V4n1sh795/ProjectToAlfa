from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Провайдер LLM выбирается конфигурацией, код менять не нужно.
    llm_provider: Literal["gigachat", "openai"] = "gigachat"
    llm_timeout_seconds: float = 30.0
    llm_model: str = Field(default="", validation_alias=AliasChoices("LLM_MODEL", "GIGACHAT_MODEL"))

    # GigaChat
    gigachat_credentials: str = ""
    gigachat_scope: str = "GIGACHAT_API_PERS"
    gigachat_verify_ssl_certs: bool = True
    gigachat_ca_bundle_file: str | None = None

    # Любой OpenAI-совместимый API (OpenAI, vLLM, Ollama, YandexGPT-gateway и т.п.)
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""

    # Проверка JWT: параметры должны совпадать с cash/Models/AuthOptions.cs
    jwt_key: str = Field(min_length=1)
    jwt_issuer: str = "SuperSecurityEvolvedCompanyEvenJWTTokenIsOpenService"
    jwt_audience: str = "SuperSecurityEvolvedCompanyEvenJWTTokenIsOpenClient"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


def get_settings() -> Settings:
    return Settings()
