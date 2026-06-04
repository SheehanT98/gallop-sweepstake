"""Load settings from environment / .env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    email: str
    password: str
    europe: bool
    device_dsn: str | None
    host: str
    port: int
    refresh_seconds: float

    @classmethod
    def from_env(cls) -> "Settings":
        region = (os.getenv("SHARK_REGION") or "europe").lower()
        europe = region in ("europe", "eu", "uk")
        return cls(
            email=os.getenv("SHARK_EMAIL", "").strip(),
            password=os.getenv("SHARK_PASSWORD", "").strip(),
            europe=europe,
            device_dsn=(os.getenv("SHARK_DEVICE_DSN") or "").strip() or None,
            host=os.getenv("SHARK_APP_HOST", "127.0.0.1"),
            port=int(os.getenv("SHARK_APP_PORT", "8765")),
            refresh_seconds=float(os.getenv("SHARK_REFRESH_SECONDS", "4")),
        )

    def validate(self) -> None:
        if not self.email or not self.password:
            raise ValueError(
                "SHARK_EMAIL and SHARK_PASSWORD must be set in shark-vacuum/.env"
            )


settings = Settings.from_env()
