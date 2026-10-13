"""
app/contracts/validate.py

Runtime validation of inbound client frames, mirroring the TypeScript
validate.ts logic. Rejects invalid frames and returns a typed error instead
of crashing the connection.

B1 changes:
- Accepts protocol version 2 (v2) frames
- Recognises auth_ticket as a connection-level frame (like ping)
"""
from __future__ import annotations

import json
from typing import Union

from pydantic import TypeAdapter, ValidationError

from .models import (
    BOOK_PROTOCOL_VERSION,
    AuthTicketEvent,
    BookClientEvent,
    PingEvent,
)


_client_adapter: TypeAdapter[BookClientEvent] = TypeAdapter(BookClientEvent)


class ParseError(Exception):
    """Raised when a client frame cannot be parsed or validated."""
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def parse_client_event(
    raw: Union[str, bytes],
) -> Union[BookClientEvent, PingEvent, AuthTicketEvent]:
    """
    Parse and validate an inbound client frame.

    Returns a typed BookClientEvent, PingEvent, or AuthTicketEvent.
    Raises ParseError for any validation failure — the gateway turns this into
    an `error` server event and never crashes the connection.
    """
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ParseError("frame is not valid JSON")

    if not isinstance(data, dict):
        raise ParseError("frame is not an object")

    # Connection-level ping — handled before protocol validation
    if data.get("type") == "ping":
        return PingEvent.model_validate(data)

    # B1: auth_ticket is a connection-level frame, not versioned
    if data.get("type") == "auth_ticket":
        try:
            return AuthTicketEvent.model_validate(data)
        except ValidationError as exc:
            first = exc.errors()[0]
            msg = first.get("msg", str(exc))
            raise ParseError(f"auth_ticket: {msg}")

    v = data.get("v")
    if v != BOOK_PROTOCOL_VERSION:
        raise ParseError(f"unsupported protocol version: {v!r}")

    event_type = data.get("type")
    if not isinstance(event_type, str):
        raise ParseError(f"unknown event type: {event_type!r}")

    try:
        return _client_adapter.validate_python(data)
    except ValidationError as exc:
        first = exc.errors()[0]
        loc = " -> ".join(str(x) for x in first.get("loc", []))
        msg = first.get("msg", str(exc))
        raise ParseError(f"{event_type}: {loc}: {msg}")
