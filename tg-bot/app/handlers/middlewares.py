import time

from aiogram import BaseMiddleware
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

AUTH_HINT = "Чтобы начать, отправьте токен командой:\n/start <токен>"
EXPIRED_HINT = "Сессия истекла. Отправьте /start и токен ещё раз."


class AuthMiddleware(BaseMiddleware):
    """Пускает дальше только чат, в котором в MemoryStorage лежит живой токен."""

    async def __call__(self, handler, event, data):
        if isinstance(event, Message) and (event.text or "").startswith("/start"):
            return await handler(event, data)

        state: FSMContext = data["state"]
        session = await state.get_data()
        expires_at = session.get("token_exp")
        token = session.get("access_token")
        if token and expires_at and expires_at > time.time():
            return await handler(event, data)

        await state.clear()
        if isinstance(event, CallbackQuery):
            await event.answer(EXPIRED_HINT if token else AUTH_HINT, show_alert=True)
            return None
        if isinstance(event, Message):
            await event.answer(EXPIRED_HINT if token else AUTH_HINT)
        return None
