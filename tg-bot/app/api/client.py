"""HTTP-клиент мастер-системы.

Бот не хранит проекты, слоты и заявки. Контракт, который ждёт этот клиент:

GET {AUTH_VALIDATE_PATH}
    Authorization: Bearer <jwt студента>
    2xx — токен принят сервером, любой другой ответ — нет.

GET /api/projects
    Ответ: список или {"projects": [...]} / {"items": [...]}.
    Элемент: id, name (или title), isRecruitmentOpen.
    Закрытый набор: isRecruitmentOpen = false.

GET /api/projects/{id}/available-slots
    Ответ: {"dates": [{"date": "2026-11-23", "slots": ["14:00-14:30"]}]}
    Слот можно прислать строкой "14:00-14:30" или объектом {"start": "14:00", "end": "14:30"}.
    Бот показывает не больше 5 ближайших дат из этого ответа.

POST /api/interviews/book
    Тело: projectId, teamName, telegramChatId, telegramUsername,
    startsAt, endsAt (ISO, местное время без перевода пояса),
    members: [{fullName, role, academicGroup, techStack}].
    201/200: projectName, startsAt, meetingLink.
    409 — слот уже занят, бот заново запрашивает доступные окна.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, datetime

import aiohttp

logger = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, status: int, detail: str = ""):
        self.status = status
        self.detail = detail
        super().__init__(f"API {status}")


@dataclass(frozen=True)
class Project:
    id: str
    name: str
    is_recruitment_open: bool


@dataclass(frozen=True)
class Slot:
    start: str
    end: str

    @property
    def label(self) -> str:
        return f"{self.start} - {self.end}"


@dataclass(frozen=True)
class DaySlots:
    day: date
    slots: list[Slot]


@dataclass(frozen=True)
class BookingConfirmation:
    project_name: str
    starts_at: datetime
    meeting_link: str


class PlatformApi:
    def __init__(self, base_url: str, session: aiohttp.ClientSession, validate_path: str):
        self.base_url = base_url.rstrip("/")
        self.session = session
        self.validate_path = validate_path

    async def validate_token(self, token: str) -> None:
        await self._request("GET", self.validate_path, token)

    async def get_projects(self, token: str) -> list[Project]:
        payload = await self._request("GET", "/api/projects", token)
        return [_project(item) for item in _as_list(payload)]

    async def get_slots(self, token: str, project_id: str) -> list[DaySlots]:
        payload = await self._request("GET", f"/api/projects/{project_id}/available-slots", token)
        source = payload.get("dates") if isinstance(payload, dict) else payload
        days = []
        for item in source or []:
            if not isinstance(item, dict):
                continue
            day = _date(item.get("date") or item.get("day"))
            slots = [slot for raw in item.get("slots") or [] if (slot := _slot(raw))]
            if day and slots:
                days.append(DaySlots(day=day, slots=slots))
        days.sort(key=lambda item: item.day)
        return days[:5]

    async def book(self, token: str, payload: dict) -> BookingConfirmation:
        body = await self._request("POST", "/api/interviews/book", token, payload)
        if not isinstance(body, dict):
            raise ApiError(502, "Пустой ответ на запись")
        starts_at = _datetime(body.get("startsAt") or body.get("starts_at"))
        link = body.get("meetingLink") or body.get("meeting_link") or ""
        name = body.get("projectName") or body.get("project_name") or ""
        if starts_at is None or not link:
            raise ApiError(502, "В ответе нет startsAt или meetingLink")
        return BookingConfirmation(project_name=name, starts_at=starts_at, meeting_link=link)

    async def _request(self, method: str, path: str, token: str, payload: dict | None = None):
        url = f"{self.base_url}{path}"
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        try:
            async with self.session.request(method, url, headers=headers, json=payload) as response:
                raw = await response.text()
        except aiohttp.ClientError as error:
            logger.warning("API недоступен: %s %s", method, path)
            raise ApiError(0, "network") from error

        if response.status >= 400:
            logger.warning("API %s %s -> %s", method, path, response.status)
            raise ApiError(response.status, raw[:500])
        if not raw.strip():
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError as error:
            logger.warning("API %s %s вернул не JSON", method, path)
            raise ApiError(502, "invalid json") from error


def _as_list(payload) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("projects", "items", "data"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []


def _project(item: dict) -> Project:
    raw_id = item.get("id", item.get("Id"))
    name = item.get("name") or item.get("title") or item.get("Name") or "Проект"
    opened = item.get("isRecruitmentOpen", item.get("is_recruitment_open", item.get("IsRecruitmentOpen", True)))
    return Project(id=str(raw_id), name=str(name), is_recruitment_open=bool(opened))


def _date(value) -> date | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _datetime(value) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _clock(value: str) -> str | None:
    parts = value.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        hour, minute = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return f"{hour:02d}:{minute:02d}"


def _slot(raw) -> Slot | None:
    if isinstance(raw, str):
        cleaned = raw.replace("—", "-").replace("–", "-")
        pieces = [piece.strip() for piece in cleaned.split("-")]
        if len(pieces) != 2:
            return None
        start, end = _clock(pieces[0]), _clock(pieces[1])
    elif isinstance(raw, dict):
        start = _clock(str(raw.get("start") or raw.get("from") or ""))
        end = _clock(str(raw.get("end") or raw.get("to") or ""))
    else:
        return None
    if not start or not end:
        return None
    return Slot(start=start, end=end)
