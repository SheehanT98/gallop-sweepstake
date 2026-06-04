"""Tests for map payload decoding."""

import base64
import gzip
import json

from app.map_decode import decode_map_bytes, parse_room_overlay

PNG_HEADER = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_raw_png():
    hit = decode_map_bytes(PNG_HEADER)
    assert hit is not None
    assert hit.mime == "image/png"


def test_gzip_png():
    payload = gzip.compress(PNG_HEADER)
    hit = decode_map_bytes(payload)
    assert hit is not None
    assert hit.mime == "image/png"


def test_json_base64_image():
    b64 = base64.b64encode(PNG_HEADER).decode()
    blob = json.dumps({"mapImage": b64}).encode()
    hit = decode_map_bytes(blob)
    assert hit is not None
    assert hit.mime == "image/png"


def test_room_overlay_json():
    raw = json.dumps(
        {
            "rooms": [
                {"name": "Kitchen", "x": 50, "y": 30},
                {"name": "Hall", "center": [20, 80]},
            ]
        }
    ).encode()
    rooms = parse_room_overlay(raw)
    assert len(rooms) == 2
    assert rooms[0]["name"] == "Kitchen"
