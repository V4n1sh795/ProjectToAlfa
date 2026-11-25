import asyncio
import logging

import aiohttp
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from dotenv import load_dotenv

from api.client import PlatformApi
from config import Settings
from handlers.middlewares import AuthMiddleware
from handlers.routes import router

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

router.message.middleware(AuthMiddleware())
router.callback_query.middleware(AuthMiddleware())

dp = Dispatcher(storage=MemoryStorage())
dp.include_router(router)


async def main():
    settings = Settings.load()
    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        api = PlatformApi(settings.api_base_url, session, settings.auth_validate_path)
        bot = Bot(token=settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        # Сессия студента живёт только в MemoryStorage этого процесса.
        await dp.start_polling(bot, api=api, settings=settings)


if __name__ == "__main__":
    asyncio.run(main())
