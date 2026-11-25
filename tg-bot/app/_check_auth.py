import time

import jwt

from api.client import _as_list, _project, _slot
from auth import TokenRejected, decode_token


def main():
    secret = "test-secret"
    token = jwt.encode({"sub": "student", "exp": int(time.time()) + 3600}, secret, algorithm="HS256")
    assert decode_token(token, secret, "HS256")["sub"] == "student"

    expired = jwt.encode({"sub": "x", "exp": int(time.time()) - 120}, secret, algorithm="HS256")
    try:
        decode_token(expired, secret, "HS256")
        raise SystemExit("expired token was accepted")
    except TokenRejected as error:
        assert "истёк" in error.message

    try:
        decode_token(token, "other-secret", "HS256")
        raise SystemExit("bad signature was accepted")
    except TokenRejected:
        pass

    unsigned = jwt.encode({"sub": "x", "exp": int(time.time()) + 60}, "", algorithm="none")
    try:
        decode_token(unsigned, secret, "HS256")
        raise SystemExit("none algorithm was accepted")
    except TokenRejected:
        pass

    closed = _project({"id": 7, "name": "Кейс", "isRecruitmentOpen": False})
    assert closed.id == "7" and closed.is_recruitment_open is False
    assert _slot("14:00-14:30").label == "14:00 - 14:30"
    assert _slot({"start": "15:30", "end": "16:00"}).start == "15:30"
    assert _as_list({"items": [{"id": 1}]})[0]["id"] == 1
    print("ok")


if __name__ == "__main__":
    main()
