"""Проверка получения и обновления токена бота на поддельном бэкенде (реальный HTTP, без Telegram)."""
import asyncio

import aiohttp
from aiohttp import web

from api.client import ApiError, PlatformApi

KEY = "secret-key"


async def main():
    state = {"issued": 0, "valid": set(), "lifetime": 600}

    async def auth(request):
        body = await request.json()
        if body.get("apiKey") != KEY:
            return web.Response(status=401)
        state["issued"] += 1
        token = f"t{state['issued']}"
        state["valid"].add(token)
        return web.json_response({"token": token, "expiresIn": state["lifetime"]})

    async def projects(request):
        if request.headers.get("Authorization", "")[7:] not in state["valid"]:
            return web.Response(status=401)
        return web.json_response([{"id": 1, "name": "A", "isRecruitmentOpen": True}])

    app = web.Application()
    app.router.add_post("/api/auth/bot", auth)
    app.router.add_get("/api/projects", projects)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    base = f"http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}"

    async with aiohttp.ClientSession() as session:
        api = PlatformApi(base, session, "/api/auth/bot", KEY)

        # токен берётся один раз и переиспользуется, в том числе при параллельных запросах
        await asyncio.gather(*(api.get_projects() for _ in range(5)))
        assert state["issued"] == 1, state

        # сервер отозвал токен раньше срока: клиент получает новый и повторяет запрос
        state["valid"].clear()
        assert (await api.get_projects())[0].id == "1"
        assert state["issued"] == 2, state

        # срок почти вышел: следующий запрос обновит токен заранее
        api._expires_at = 0
        await api.get_projects()
        assert state["issued"] == 3, state

        # неверный ключ: понятная ошибка, а не бесконечные повторы
        bad = PlatformApi(base, session, "/api/auth/bot", "wrong")
        try:
            await bad.get_projects()
            raise SystemExit("wrong key was accepted")
        except ApiError as error:
            assert error.status == 401
    await runner.cleanup()
    print("ok")


asyncio.run(main())
