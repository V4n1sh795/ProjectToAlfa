import json
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.providers import LLMError, LLMTimeout
from app.settings import Settings

S = Settings(jwt_key="k" * 40, gigachat_credentials="x")
CASE = {"title": "Антифрод (Python)", "description": "д" * 200, "goal": "г" * 100, "result": "р" * 100}
CASES = {"cases": [CASE, CASE, CASE]}
REFINE = {"updatedCase": CASE, "assistantMessage": "Готово"}


class Fake:
    def __init__(self, *answers):
        self.answers, self.calls = list(answers), []

    async def complete(self, system, user):
        self.calls.append((system, user))
        a = self.answers.pop(0)
        if isinstance(a, Exception):
            raise a
        return a if isinstance(a, str) else json.dumps(a, ensure_ascii=False)


def token(**kw):
    claims = {"iss": S.jwt_issuer, "aud": S.jwt_audience, "exp": int(time.time()) + 60, **kw}
    return jwt.encode(claims, S.jwt_key, algorithm="HS256")


def call(fake, path, body, tok=None, headers=None):
    c = TestClient(create_app(S, fake))
    h = headers if headers is not None else {"Authorization": f"Bearer {tok or token()}"}
    return c.post(path, json=body, headers=h)


def test_requires_jwt():
    f = Fake(CASES)
    assert call(f, "/generate-cases", {"userPrompt": "AI"}, headers={}).status_code == 401
    bad = jwt.encode({"iss": S.jwt_issuer, "aud": S.jwt_audience, "exp": int(time.time()) + 60}, "z" * 40, algorithm="HS256")
    assert call(f, "/generate-cases", {"userPrompt": "AI"}, tok=bad).status_code == 401
    expired = token(exp=int(time.time()) - 5)
    assert call(f, "/generate-cases", {"userPrompt": "AI"}, tok=expired).status_code == 401
    assert call(f, "/refine-case", {"currentCase": CASE, "userInstruction": "x"}, headers={}).status_code == 401
    assert f.calls == []


def test_generate_ok_and_prompt_is_server_side():
    f = Fake(CASES)
    r = call(f, "/generate-cases", {"userPrompt": "  AI  "})
    assert r.status_code == 200 and len(r.json()["cases"]) == 3
    assert "ровно 3" in f.calls[0][0] and json.loads(f.calls[0][1]) == {"userPrompt": "AI"}


def test_generate_empty_topic_allowed_and_fenced_json():
    f = Fake("```json\n" + json.dumps(CASES) + "\n```")
    assert call(f, "/generate-cases", {"userPrompt": ""}).status_code == 200


def test_refine_ok():
    f = Fake(REFINE)
    r = call(f, "/refine-case", {"currentCase": {**CASE, "goal": ""}, "userInstruction": "Заполни цель"})
    assert r.status_code == 200 and r.json()["assistantMessage"] == "Готово"


@pytest.mark.parametrize("path,body", [
    ("/generate-cases", {"userPrompt": "x" * 501}),
    ("/generate-cases", {"userPrompt": 5}),
    ("/refine-case", {"currentCase": CASE, "userInstruction": "   "}),
    ("/refine-case", {"currentCase": {"title": "a"}, "userInstruction": "x"}),
    ("/refine-case", {"currentCase": CASE, "userInstruction": "x" * 501}),
])
def test_bad_input_is_400(path, body):
    f = Fake()
    assert call(f, path, body).status_code == 400
    assert f.calls == []


def test_invalid_answer_retried_once_then_ok():
    f = Fake("не json", CASES)
    assert call(f, "/generate-cases", {"userPrompt": "AI"}).status_code == 200
    assert len(f.calls) == 2


@pytest.mark.parametrize("bad", [
    {"cases": [CASE]},
    {"cases": [CASE, CASE, {**CASE, "title": ""}]},
    {"cases": [CASE, CASE, {**CASE, "description": "x" * 451}]},
    {"cases": [CASE, CASE, CASE], "extra": 1},
])
def test_schema_violations_give_502_after_one_retry(bad):
    f = Fake(bad, bad)
    assert call(f, "/generate-cases", {"userPrompt": "AI"}).status_code == 502
    assert len(f.calls) == 2


def test_refine_message_too_long_rejected():
    bad = {"updatedCase": CASE, "assistantMessage": "x" * 401}
    assert call(Fake(bad, bad), "/refine-case", {"currentCase": CASE, "userInstruction": "a"}).status_code == 502


def test_timeout_is_504_without_retry():
    f = Fake(LLMTimeout())
    assert call(f, "/generate-cases", {"userPrompt": "AI"}).status_code == 504
    assert len(f.calls) == 1


def test_provider_error_is_502():
    assert call(Fake(LLMError("boom")), "/generate-cases", {"userPrompt": "AI"}).status_code == 502


def test_no_generic_chat_endpoint():
    assert TestClient(create_app(S, Fake())).post("/chat", json={"prompt": "hi"}).status_code == 404


def test_assistant_message_key_typo_is_tolerated():
    from app.schemas import RefineCaseResult

    case = {"title": "T", "description": "d" * 200, "goal": "g" * 100, "result": "r" * 100}
    r = RefineCaseResult.model_validate({"updatedCase": case, "assistanceMessage": "Готово!"})
    assert r.assistantMessage == "Готово!"
