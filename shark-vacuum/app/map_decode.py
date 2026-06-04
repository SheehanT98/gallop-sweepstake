"""Decode Shark floor-map file blobs into displayable images."""

from __future__ import annotations

import base64
import binascii
import gzip
import json
import logging
import zlib
from dataclasses import dataclass
from typing import Any

_LOGGER = logging.getLogger(__name__)

IMAGE_SIGNATURES: list[tuple[bytes, str]] = [
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"BM", "image/bmp"),
]


@dataclass
class DecodedMap:
    data: bytes
    mime: str
    source: str  # how it was decoded


def _mime_at_offset(data: bytes, offset: int = 0) -> str | None:
    for sig, mime in IMAGE_SIGNATURES:
        if data[offset : offset + len(sig)] == sig:
            return mime
    return None


def _find_embedded_image(data: bytes, max_scan: int = 8_000_000) -> tuple[int, str] | None:
    scan = data[: min(len(data), max_scan)]
    for sig, mime in IMAGE_SIGNATURES:
        idx = scan.find(sig)
        if idx >= 0:
            return idx, mime
    return None


def _try_decompress(data: bytes) -> list[tuple[bytes, str]]:
    """Return candidate payloads after decompression attempts."""
    out: list[tuple[bytes, str]] = [(data, "raw")]

    if data[:2] == b"\x1f\x8b":
        try:
            out.append((gzip.decompress(data), "gzip"))
        except OSError:
            pass

    if data[:1] in (b"\x78",):
        for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
            try:
                out.append((zlib.decompress(data, wbits), f"zlib({wbits})"))
            except zlib.error:
                pass

    return out


def _b64_decode_field(value: Any) -> bytes | None:
    if not isinstance(value, str) or len(value) < 16:
        return None
    try:
        pad = "=" * (-len(value) % 4)
        return base64.b64decode(value + pad, validate=False)
    except (binascii.Error, ValueError):
        return None


def _image_from_json_obj(obj: Any, depth: int = 0) -> DecodedMap | None:
    if depth > 8:
        return None

    if isinstance(obj, dict):
        for key in (
            "image",
            "mapImage",
            "floorImage",
            "map",
            "data",
            "png",
            "jpeg",
            "floor",
            "visual",
            "mapData",
            "floor_map",
        ):
            if key not in obj:
                continue
            hit = _image_from_json_field(obj[key])
            if hit:
                return hit
        for v in obj.values():
            hit = _image_from_json_obj(v, depth + 1)
            if hit:
                return hit

    if isinstance(obj, list):
        for item in obj[:20]:
            hit = _image_from_json_obj(item, depth + 1)
            if hit:
                return hit

    return None


def _image_from_json_field(value: Any) -> DecodedMap | None:
    if isinstance(value, (bytes, bytearray)):
        return decode_map_bytes(bytes(value))
    if isinstance(value, str):
        raw = _b64_decode_field(value)
        if raw:
            return decode_map_bytes(raw)
        if value.strip().startswith("{"):
            try:
                return _image_from_json_obj(json.loads(value))
            except json.JSONDecodeError:
                pass
    return None


def decode_map_bytes(data: bytes) -> DecodedMap | None:
    """Best-effort decode; returns None if no image found."""
    if not data:
        return None

    candidates: list[tuple[bytes, str]] = []
    for payload, label in _try_decompress(data):
        candidates.append((payload, label))
        for inner, inner_label in _try_decompress(payload):
            candidates.append((inner, f"{label}+{inner_label}"))

    seen: set[int] = set()
    for payload, label in candidates:
        pid = id(payload)
        if pid in seen:
            continue
        seen.add(pid)

        mime = _mime_at_offset(payload, 0)
        if mime:
            return DecodedMap(payload, mime, label)

        embedded = _find_embedded_image(payload)
        if embedded:
            offset, mime = embedded
            return DecodedMap(payload[offset:], mime, f"{label}+embedded@{offset}")

        if payload[:1] in (b"{", b"["):
            try:
                obj = json.loads(payload.decode("utf-8"))
                hit = _image_from_json_obj(obj)
                if hit:
                    hit.source = f"{label}+json"
                    return hit
            except (UnicodeDecodeError, json.JSONDecodeError):
                pass

    return None


def parse_room_overlay(raw: bytes) -> list[dict[str, Any]]:
    """Extract room label positions (normalized 0–1) from definition blobs."""
    rooms: list[dict[str, Any]] = []
    text = _decode_text(raw)
    if not text:
        return rooms

    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return rooms

    def norm(v: float, scale: float = 1.0) -> float:
        if scale > 100:
            return max(0.0, min(1.0, v / scale))
        if 0 <= v <= 1:
            return v
        if 0 <= v <= 100:
            return v / 100.0
        return max(0.0, min(1.0, v / 1000.0))

    def add_room(name: str, x: float, y: float) -> None:
        rooms.append({"name": name, "x": norm(x), "y": norm(y)})

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            name = (
                node.get("name")
                or node.get("roomName")
                or node.get("label")
                or node.get("room_name")
            )
            x = node.get("x") or node.get("centerX") or node.get("cx")
            y = node.get("y") or node.get("centerY") or node.get("cy")
            if name and x is not None and y is not None:
                try:
                    add_room(str(name), float(x), float(y))
                except (TypeError, ValueError):
                    pass
            center = node.get("center")
            if name and isinstance(center, (list, tuple)) and len(center) >= 2:
                try:
                    add_room(str(name), float(center[0]), float(center[1]))
                except (TypeError, ValueError):
                    pass
            for key in ("rooms", "roomList", "RoomList", "areas"):
                if key in node and isinstance(node[key], list):
                    for item in node[key]:
                        walk(item)
            for v in node.values():
                if isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(obj)
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for r in rooms:
        n = r.get("name")
        if n and n not in seen:
            seen.add(n)
            unique.append(r)
    return unique


def parse_zone_overlay(raw: bytes) -> list[dict[str, Any]]:
    """Extract zone polygons/rects for map overlay."""
    zones: list[dict[str, Any]] = []
    text = _decode_text(raw)
    if not text:
        return zones
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return zones

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            zt = (
                node.get("type")
                or node.get("zoneType")
                or node.get("ZoneType")
                or "zone"
            )
            pts = (
                node.get("points")
                or node.get("polygon")
                or node.get("vertices")
                or node.get("coords")
            )
            if pts and isinstance(pts, list) and len(pts) >= 3:
                zones.append({"type": str(zt).lower(), "points": pts})
            for v in node.values():
                if isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(obj)
    return zones[:50]


def _decode_text(raw: bytes) -> str | None:
    for payload, _ in _try_decompress(raw):
        try:
            return payload.decode("utf-8")
        except UnicodeDecodeError:
            continue
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return None
