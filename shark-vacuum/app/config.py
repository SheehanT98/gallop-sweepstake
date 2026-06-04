"""Load settings from environment / .env."""

from __future__ import annotations

import os
import socket
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


def _lan_enabled() -> bool:
    return os.getenv("SHARK_LAN", "").strip().lower() in ("1", "true", "yes", "on")


def _resolve_host() -> str:
    if _lan_enabled():
        return "0.0.0.0"
    return os.getenv("SHARK_APP_HOST", "127.0.0.1").strip() or "127.0.0.1"


def get_lan_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


@dataclass(frozen=True)
class Settings:
    email: str
    password: str
    europe: bool
    device_dsn: str | None
    host: str
    port: int
    refresh_seconds: float
    lan_mode: bool
    timezone: str
    background_interval_seconds: float
    telegram_bot_token: str | None
    telegram_chat_id: str | None
    webhook_url: str | None
    enable_rt_map: bool

    @classmethod
    def from_env(cls) -> "Settings":
        region = (os.getenv("SHARK_REGION") or "europe").lower()
        europe = region in ("europe", "eu", "uk")
        lan = _lan_enabled()
        return cls(
            email=os.getenv("SHARK_EMAIL", "").strip(),
            password=os.getenv("SHARK_PASSWORD", "").strip(),
            europe=europe,
            device_dsn=(os.getenv("SHARK_DEVICE_DSN") or "").strip() or None,
            host=_resolve_host(),
            port=int(os.getenv("SHARK_APP_PORT", "8765")),
            refresh_seconds=float(os.getenv("SHARK_REFRESH_SECONDS", "4")),
            lan_mode=lan,
            timezone=os.getenv("SHARK_TIMEZONE", "Europe/London"),
            background_interval_seconds=float(
                os.getenv("SHARK_BACKGROUND_INTERVAL", "30")
            ),
            telegram_bot_token=os.getenv("SHARK_TELEGRAM_BOT_TOKEN", "").strip()
            or None,
            telegram_chat_id=os.getenv("SHARK_TELEGRAM_CHAT_ID", "").strip() or None,
            webhook_url=os.getenv("SHARK_WEBHOOK_URL", "").strip() or None,
            enable_rt_map=os.getenv("SHARK_ENABLE_RT_MAP", "true").lower()
            in ("1", "true", "yes"),
        )

    def validate(self) -> None:
        if not self.email or not self.password:
            raise ValueError(
                "SHARK_EMAIL and SHARK_PASSWORD must be set in shark-vacuum/.env"
            )

    def phone_url(self) -> str | None:
        if not self.lan_mode and self.host in ("127.0.0.1", "localhost"):
            return None
        ip = get_lan_ip()
        if not ip:
            return None
        return f"http://{ip}:{self.port}"

    def notifications_configured(self) -> bool:
        return bool(
            (self.telegram_bot_token and self.telegram_chat_id) or self.webhook_url
        )


settings = Settings.from_env()
