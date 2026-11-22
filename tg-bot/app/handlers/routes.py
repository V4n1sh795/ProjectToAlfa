import logging
from datetime import date, datetime
from html import escape

from aiogram import F, Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from api.client import ApiError, PlatformApi
from auth import TokenRejected, decode_token
from config import Settings

logger = logging.getLogger(__name__)
router = Router()

MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
NO_CASES = "Извините, на данный момент свободных кейсов для записи нет. Пожалуйста, напишите позже"
CLOSED_CASE = "Извините, набор на этот проект уже закончен. Пожалуйста, выберите другой кейс"
SLOT_TAKEN = "К сожалению, этот слот только что заняла другая команда. Пожалуйста, выберите другое время"
API_DOWN = "Сервис записи сейчас недоступен. Попробуйте чуть позже."
WELCOME = (
    "Привет! Выбери проект Альфа-Банка, на который хочет записаться твоя команда. "
    "Продолжая работу с ботом, вы даете согласие на обработку персональных данных"
)


class Booking(StatesGroup):
    team_name = State()
    members = State()
    picking_date = State()
    picking_slot = State()


def _session_fields(data: dict) -> dict:
    return {
        key: data[key]
        for key in ("access_token", "token_exp")
        if key in data
    }


async def reset_form(state: FSMContext) -> dict:
    data = await state.get_data()
    kept = _session_fields(data)
    await state.clear()
    await state.update_data(**kept)
    return kept


def _token(data: dict) -> str:
    return data["access_token"]


def _button_title(name: str, closed: bool) -> str:
    prefix = "[Закрыт] " if closed else ""
    limit = 64 - len(prefix)
    title = name if len(name) <= limit else name[: limit - 1] + "…"
    return prefix + title


def projects_keyboard(projects: list[dict]) -> InlineKeyboardMarkup:
    rows = []
    for index, project in enumerate(projects):
        rows.append(
            [
                InlineKeyboardButton(
                    text=_button_title(project["name"], not project["is_recruitment_open"]),
                    callback_data=f"p:{index}",
                )
            ]
        )
    return InlineKeyboardMarkup(inline_keyboard=rows)


def form_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Подтвердить", callback_data="form:ok")],
            [InlineKeyboardButton(text="Заполнить заново", callback_data="form:edit")],
        ]
    )


def pick_time_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Выбрать время собеседования", callback_data="cal:open")]
        ]
    )


def day_label(value: date) -> str:
    return f"{value.day} {MONTHS[value.month - 1]}"


def dates_keyboard(days: list[dict]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=day_label(date.fromisoformat(day["date"])), callback_data=f"d:{index}")]
            for index, day in enumerate(days)
        ]
    )


def slots_keyboard(slots: list[dict]) -> InlineKeyboardMarkup:
    rows = []
    row = []
    for index, slot in enumerate(slots):
        row.append(InlineKeyboardButton(text=f"{slot['start']} - {slot['end']}", callback_data=f"s:{index}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton(text="« К датам", callback_data="cal:dates")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def confirm_slot_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Подтвердить запись", callback_data="book:ok")],
            [InlineKeyboardButton(text="Выбрать другое время", callback_data="cal:slots")],
            [InlineKeyboardButton(text="« К датам", callback_data="cal:dates")],
        ]
    )


def parse_members(text: str) -> tuple[list[dict], str | None]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return [], (
            "Не удалось распознать формат. Пришлите хотя бы одного участника: "
            "ФИО ; Роль ; Академическая группа ; Стек"
        )

    members = []
    for number, line in enumerate(lines, 1):
        parts = [part.strip() for part in line.split(";")]
        stack = ";".join(parts[3:]).strip() if len(parts) > 3 else ""
        if len(parts) < 4 or not parts[0] or not parts[1] or not parts[2] or not stack:
            return [], (
                f"Не удалось распознать формат в строке {number}. "
                "Пожалуйста, убедитесь, что каждого участника вы пишете с новой строки "
                "и используете точку с запятой (;) для разделения: "
                "ФИО ; Роль ; Академическая группа ; Стек. "
                "Попробуйте отправить список еще раз"
            )
        members.append(
            {
                "fullName": parts[0],
                "role": parts[1],
                "academicGroup": parts[2],
                "techStack": stack,
            }
        )
    return members, None


def preview_text(data: dict) -> str:
    lines = [
        "<b>Проверьте анкету</b>",
        "",
        f"<b>Проект:</b> {escape(data['project_name'])}",
        f"<b>Команда:</b> {escape(data['team_name'])}",
        "",
        "<b>Участники:</b>",
    ]
    for index, member in enumerate(data["members"], 1):
        lines.append(
            f"\n{index}. {escape(member['fullName'])}\n"
            f"Роль: {escape(member['role'])}\n"
            f"Группа: {escape(member['academicGroup'])}\n"
            f"Стек: {escape(member['techStack'])}"
        )
    lines.append("\nЕсли всё верно — подтвердите данные.")
    return "\n".join(lines)


def members_prompt() -> str:
    return (
        "Введите список участников вашей команды в одном сообщении. "
        "Каждого участника пишите с новой строки в формате: "
        "<b>ФИО ; Роль ; Академическая группа ; Стек технологий (через запятую)</b>.\n\n"
        "Пример:\n"
        "<code>Иванов Иван Иванович ; Тимлид / Backend ; РИ-340913 ; C#, PostgreSQL, Docker\n"
        "Петров Петр Петрович ; Аналитик ; РИ-340901 ; UML, BPMN, Системный анализ</code>"
    )


def booking_text(project_name: str, starts_at: datetime, link: str) -> str:
    return (
        f"Вы успешно записаны на собеседование по проекту {escape(project_name)}! "
        f"Встреча состоится {starts_at.strftime('%d.%m.%Y')} в {starts_at.strftime('%H:%M')}. "
        f'Ссылка на видеовстречу в Контур.Толк: <a href="{escape(link)}">{escape(link)}</a>'
    )


def _json_id(value: str):
    return int(value) if str(value).isdigit() else value


def _days_payload(days) -> list[dict]:
    return [
        {
            "date": day.day.isoformat(),
            "slots": [{"start": slot.start, "end": slot.end} for slot in day.slots],
        }
        for day in days
    ]


async def tell_api_error(target: Message, error: ApiError, state: FSMContext):
    if error.status in {401, 403}:
        await state.clear()
        await target.answer("Сессия недействительна. Отправьте /start и токен ещё раз.")
        return
    await target.answer(API_DOWN)


async def show_projects(message: Message, state: FSMContext, api: PlatformApi):
    data = await state.get_data()
    try:
        projects = await api.get_projects(_token(data))
    except ApiError as error:
        await tell_api_error(message, error, state)
        return

    open_projects = [project for project in projects if project.is_recruitment_open]
    if not projects or not open_projects:
        await message.answer(NO_CASES)
        return

    stored = [
        {"id": project.id, "name": project.name, "is_recruitment_open": project.is_recruitment_open}
        for project in projects
    ]
    await state.update_data(projects=stored)
    await message.answer(WELCOME, reply_markup=projects_keyboard(stored))


@router.message(CommandStart())
async def start(message: Message, command: CommandObject, state: FSMContext, api: PlatformApi, settings: Settings):
    token = (command.args or "").strip().strip("'\"")
    if token:
        try:
            payload = decode_token(token, settings.jwt_secret, settings.jwt_algorithm)
            await api.validate_token(token)
        except TokenRejected as error:
            await state.clear()
            await message.answer(error.message)
            return
        except ApiError as error:
            await state.clear()
            if error.status in {401, 403}:
                await message.answer("Токен не принят сервером. Попросите новый.")
            else:
                await message.answer(API_DOWN)
            return

        await state.clear()
        await state.update_data(access_token=token, token_exp=int(payload["exp"]))
        try:
            await message.delete()
        except Exception:
            logger.info("Не удалось удалить сообщение с токеном, chat_id=%s", message.chat.id)
    elif not (await state.get_data()).get("access_token"):
        await message.answer("Чтобы начать, отправьте токен командой:\n/start <токен>")
        return
    else:
        await reset_form(state)

    await show_projects(message, state, api)


@router.callback_query(F.data.startswith("p:"))
async def choose_project(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    projects = data.get("projects") or []
    try:
        project = projects[int(callback.data.split(":", 1)[1])]
    except (ValueError, IndexError):
        await callback.answer("Список проектов устарел. Отправьте /start", show_alert=True)
        return

    if not project["is_recruitment_open"]:
        await callback.answer(CLOSED_CASE, show_alert=True)
        return

    kept = _session_fields(data)
    await state.clear()
    await state.set_state(Booking.team_name)
    await state.update_data(
        **kept,
        project_id=project["id"],
        project_name=project["name"],
    )
    await callback.message.answer(
        f"Проект: <b>{escape(project['name'])}</b>\n\nОтлично! Введите название вашей команды:"
    )
    await callback.answer()


@router.message(Booking.team_name, F.text)
async def save_team_name(message: Message, state: FSMContext):
    team_name = message.text.strip()
    if not team_name or team_name.startswith("/"):
        await message.answer("Название команды нужно отправить обычным текстом.")
        return
    if len(team_name) > 100:
        await message.answer("Название слишком длинное. Уложитесь в 100 символов.")
        return

    await state.update_data(team_name=team_name)
    await state.set_state(Booking.members)
    await message.answer(members_prompt())


@router.message(Booking.team_name)
async def team_name_not_text(message: Message):
    await message.answer("Пришлите название команды текстом.")


@router.message(Booking.members, F.text)
async def save_members(message: Message, state: FSMContext):
    members, error = parse_members(message.text)
    if error:
        await message.answer(error)
        return

    await state.update_data(members=members)
    await message.answer(preview_text(await state.get_data()), reply_markup=form_keyboard())


@router.message(Booking.members)
async def members_not_text(message: Message):
    await message.answer("Пришлите состав команды одним текстовым сообщением.")


@router.callback_query(F.data == "form:edit")
async def edit_form(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    if "project_name" not in data:
        await callback.answer("Анкета не найдена. Нажмите /start", show_alert=True)
        return

    await state.set_state(Booking.team_name)
    await callback.message.answer(
        f"Проект: <b>{escape(data['project_name'])}</b>\n\nВведите название вашей команды:"
    )
    await callback.answer()


@router.callback_query(F.data == "form:ok")
async def confirm_form(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    if "members" not in data:
        await callback.answer("Сначала заполните анкету. Нажмите /start", show_alert=True)
        return

    await state.set_state(Booking.picking_date)
    await callback.message.edit_text(
        preview_text(data) + "\n\n<b>Анкета подтверждена.</b>",
        reply_markup=pick_time_keyboard(),
    )
    await callback.answer()


async def load_days(state: FSMContext, api: PlatformApi) -> list[dict] | None:
    data = await state.get_data()
    days = _days_payload(await api.get_slots(_token(data), data["project_id"]))
    await state.update_data(days=days)
    return days


@router.callback_query(F.data.in_({"cal:open", "cal:dates"}))
async def show_dates(callback: CallbackQuery, state: FSMContext, api: PlatformApi):
    data = await state.get_data()
    if "project_id" not in data:
        await callback.answer("Анкета не найдена. Нажмите /start", show_alert=True)
        return

    await callback.answer()
    try:
        days = await load_days(state, api)
    except ApiError as error:
        await tell_api_error(callback.message, error, state)
        return

    await state.set_state(Booking.picking_date)
    if not days:
        await callback.message.edit_text(
            "Свободного времени для собеседования сейчас нет. Попробуйте позже.",
            reply_markup=None,
        )
        return
    await callback.message.edit_text(
        "Выберите день собеседования:",
        reply_markup=dates_keyboard(days),
    )


@router.callback_query(F.data.startswith("d:"))
@router.callback_query(F.data == "cal:slots")
async def show_slots(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    days = data.get("days") or []
    if callback.data.startswith("d:"):
        try:
            day = days[int(callback.data.split(":", 1)[1])]
        except (ValueError, IndexError):
            await callback.answer("Эта дата уже недоступна. Откройте список ещё раз", show_alert=True)
            return
        await state.update_data(date=day["date"], slots=day["slots"])
    else:
        day = next((item for item in days if item["date"] == data.get("date")), None)
        if day is None:
            await callback.answer("Сначала выберите день", show_alert=True)
            return
        await state.update_data(slots=day["slots"])

    await state.set_state(Booking.picking_slot)
    meeting_day = date.fromisoformat(day["date"])
    await callback.message.edit_text(
        f"Дата: <b>{meeting_day.strftime('%d.%m.%Y')}</b>\nВыберите время:",
        reply_markup=slots_keyboard(day["slots"]),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("s:"))
async def choose_slot(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    slots = data.get("slots") or []
    if "date" not in data:
        await callback.answer("Сначала выберите день", show_alert=True)
        return
    try:
        slot = slots[int(callback.data.split(":", 1)[1])]
    except (ValueError, IndexError):
        await callback.answer("Этот слот уже недоступен", show_alert=True)
        return

    await state.update_data(slot_start=slot["start"], slot_end=slot["end"])
    meeting_day = date.fromisoformat(data["date"])
    await callback.message.edit_text(
        f"Проект: <b>{escape(data['project_name'])}</b>\n"
        f"Команда: <b>{escape(data['team_name'])}</b>\n"
        f"Собеседование: <b>{meeting_day.strftime('%d.%m.%Y')}, {slot['start']} - {slot['end']}</b>\n\n"
        "Нажмите «Подтвердить запись», чтобы завершить.",
        reply_markup=confirm_slot_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data == "book:ok")
async def confirm_booking(callback: CallbackQuery, state: FSMContext, api: PlatformApi):
    data = await state.get_data()
    required = ("slot_start", "slot_end", "date", "members", "project_id", "team_name")
    if any(key not in data for key in required):
        await callback.answer("Сначала выберите день и время", show_alert=True)
        return

    username = callback.from_user.username
    payload = {
        "projectId": _json_id(data["project_id"]),
        "teamName": data["team_name"],
        "telegramChatId": callback.message.chat.id,
        "telegramUsername": f"@{username}" if username else None,
        "startsAt": f"{data['date']}T{data['slot_start']}:00",
        "endsAt": f"{data['date']}T{data['slot_end']}:00",
        "members": data["members"],
    }
    await callback.answer()
    try:
        confirmation = await api.book(_token(data), payload)
    except ApiError as error:
        if error.status == 409:
            await callback.message.answer(SLOT_TAKEN)
            try:
                days = await load_days(state, api)
            except ApiError as refresh_error:
                await tell_api_error(callback.message, refresh_error, state)
                return
            same_day = next((day for day in days if day["date"] == data["date"]), None)
            await state.set_state(Booking.picking_slot if same_day else Booking.picking_date)
            if same_day:
                await state.update_data(slots=same_day["slots"])
                await callback.message.edit_text(
                    f"Дата: <b>{date.fromisoformat(same_day['date']).strftime('%d.%m.%Y')}</b>\nВыберите время:",
                    reply_markup=slots_keyboard(same_day["slots"]),
                )
            elif days:
                await callback.message.edit_text("Выберите день собеседования:", reply_markup=dates_keyboard(days))
            else:
                await callback.message.edit_text(
                    "Свободного времени для собеседования сейчас нет. Попробуйте позже.",
                    reply_markup=None,
                )
            return
        await tell_api_error(callback.message, error, state)
        return

    project_name = confirmation.project_name or data["project_name"]
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(booking_text(project_name, confirmation.starts_at, confirmation.meeting_link))
    await reset_form(state)


@router.message(Booking.picking_date)
@router.message(Booking.picking_slot)
async def wait_for_button(message: Message):
    await message.answer("Сейчас нужно нажать кнопку под сообщением. Чтобы начать заново — /start")


@router.message()
async def unknown_message(message: Message):
    await message.answer("Нажмите /start, чтобы выбрать проект и записаться на собеседование.")
