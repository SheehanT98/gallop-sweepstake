"""Outbound notifications (Telegram, webhook) on robot events."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

from .config import Settings
from .store import Store

_LOGGER = logging.getLogger(__name__)


class Notifier:
    def __init__(self, settings: Settings, store: Store) -> None:
        self._settings = settings
        self._store = store
        self._session: aiohttp.ClientSession | None = None

    async def ensure_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    @property
    def enabled(self) -> bool:
        return bool(
            self._settings.telegram_bot_token and self._settings.telegram_chat_id
        ) or bool(self._settings.webhook_url)

    async def send(self, title: str, body: str, extra: dict[str, Any] | None = None) -> None:
        text = f"*{title}*\n{body}" if title else body
        payload = {"title": title, "body": body, **(extra or {})}
        self._store.log_notification({"title": title, "body": body, **(extra or {})})

        if not self.enabled:
            _LOGGER.info("Notification (not configured): %s — %s", title, body)
            return

        session = await self.ensure_session()
        if self._settings.telegram_bot_token and self._settings.telegram_chat_id:
            await self._send_telegram(session, text)
        if self._settings.webhook_url:
            await self._send_webhook(session, payload)

    async def _send_telegram(self, session: aiohttp.ClientSession, text: str) -> None:
        token = self._settings.telegram_bot_token
        chat_id = self._settings.telegram_chat_id
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        try:
            async with session.post(
                url,
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status >= 400:
                    _LOGGER.warning("Telegram error %s: %s", resp.status, await resp.text())
        except Exception as exc:  # noqa: BLE001
            _LOGGER.warning("Telegram send failed: %s", exc)

    async def _send_webhook(self, session: aiohttp.ClientSession, payload: dict) -> None:
        try:
            async with session.post(
                self._settings.webhook_url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status >= 400:
                    _LOGGER.warning("Webhook error %s", resp.status)
        except Exception as exc:  # noqa: BLE001
            _LOGGER.warning("Webhook send failed: %s", exc)

    async def on_state_change(
        self, old_state: str | None, new_status: dict[str, Any]
    ) -> None:
        state = new_status.get("state", "unknown")
        name = new_status.get("device_name", "Shark")
        battery = new_status.get("battery_percent")
        err = new_status.get("error_text")

        if old_state == state:
            if err and state not in ("stopped",):
                await self.send(f"{name} alert", err, {"type": "error"})
            return

        if state == "cleaning" and old_state in (None, "stopped", "paused"):
            await self.send(f"{name}", "Started cleaning", {"type": "started"})
        elif state in ("stopped",) and old_state in (
            "cleaning",
            "mopping",
            "vacuum_and_mop",
            "returning",
        ):
            msg = f"Cleaning finished. Battery {battery}%." if battery is not None else "Cleaning finished."
            await self.send(f"{name}", msg, {"type": "finished"})
        elif state == "returning" and old_state in ("cleaning", "mopping", "vacuum_and_mop"):
            await self.send(f"{name}", "Returning to dock", {"type": "docking"})
        elif err:
            await self.send(f"{name} error", err, {"type": "error"})
