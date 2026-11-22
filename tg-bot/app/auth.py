import jwt


class TokenRejected(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def decode_token(token: str, secret: str, algorithm: str) -> dict:
    """Проверяет подпись и срок действия. Токен без exp не принимается."""
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[algorithm],
            options={"require": ["exp"]},
            leeway=30,
        )
    except jwt.ExpiredSignatureError as error:
        raise TokenRejected("Срок действия токена истёк. Запросите новый.") from error
    except jwt.InvalidTokenError as error:
        raise TokenRejected("Токен не принят. Проверьте его или попросите новый.") from error

    if not isinstance(payload, dict):
        raise TokenRejected("Токен не принят. Проверьте его или попросите новый.")
    return payload
