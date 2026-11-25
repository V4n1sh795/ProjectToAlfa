from dataclasses import dataclass
from os import getenv


@dataclass(frozen=True)
class Settings:
    bot_token: str
    api_base_url: str
    jwt_secret: str
    jwt_algorithm: str
    auth_validate_path: str

    @classmethod
    def load(cls) -> "Settings":
        algorithm = (getenv("JWT_ALGORITHM") or "HS256").strip()
        if algorithm not in {"HS256", "HS384", "HS512"}:
            raise SystemExit("JWT_ALGORITHM должен быть HS256, HS384 или HS512")

        settings = cls(
            bot_token=(getenv("BOT_TOKEN") or "").strip(),
            api_base_url=(getenv("API_BASE_URL") or "").strip().rstrip("/"),
            jwt_secret=getenv("JWT_SECRET") or "",
            jwt_algorithm=algorithm,
            auth_validate_path=(getenv("AUTH_VALIDATE_PATH") or "/api/auth/verify").strip(),
        )
        missing = [
            name
            for name, value in (
                ("BOT_TOKEN", settings.bot_token),
                ("API_BASE_URL", settings.api_base_url),
                ("JWT_SECRET", settings.jwt_secret),
            )
            if not value
        ]
        if missing:
            raise SystemExit("В окружении не задано: " + ", ".join(missing))
        if not settings.auth_validate_path.startswith("/"):
            raise SystemExit("AUTH_VALIDATE_PATH должен начинаться с /")
        return settings
