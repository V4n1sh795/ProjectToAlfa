from dataclasses import dataclass
from os import getenv


@dataclass(frozen=True)
class Settings:
    bot_token: str
    api_base_url: str
    api_key: str
    auth_path: str

    @classmethod
    def load(cls) -> "Settings":
        settings = cls(
            bot_token=(getenv("BOT_TOKEN") or "").strip(),
            api_base_url=(getenv("API_BASE_URL") or "").strip().rstrip("/"),
            api_key=(getenv("BOT_API_KEY") or "").strip(),
            auth_path=(getenv("AUTH_PATH") or "/api/auth/bot").strip(),
        )
        missing = [
            name
            for name, value in (
                ("BOT_TOKEN", settings.bot_token),
                ("API_BASE_URL", settings.api_base_url),
                ("BOT_API_KEY", settings.api_key),
            )
            if not value
        ]
        if missing:
            raise SystemExit("В окружении не задано: " + ", ".join(missing))
        if not settings.auth_path.startswith("/"):
            raise SystemExit("AUTH_PATH должен начинаться с /")
        return settings
