import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)


def require_jwt(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """Проверяет подпись, срок действия, issuer и audience JWT, выданного backend."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    settings = request.app.state.settings
    try:
        return jwt.decode(
            credentials.credentials,
            settings.jwt_key,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            options={"require": ["exp"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Недействительный токен")
