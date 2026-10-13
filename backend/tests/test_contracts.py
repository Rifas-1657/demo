"""
tests/test_contracts.py

1. Round-trip test: every server event example can be serialized and parsed back.
2. Parity test: Pydantic event type names and payload keys match the TypeScript contract.
3. Validation test: the client frame validator correctly rejects bad frames.

B1: Protocol version bumped to v2. auth_ok, auth_error, auth_ticket added.
"""
from __future__ import annotations

import json
import time

import pytest

from app.contracts.models import (
    BOOK_PROTOCOL_VERSION,
    AnswerChunkEvent,
    AnswerChunkPayload,
    AudioChunkEvent,
    AudioChunkPayload,
    CueEvent,
    CuePayload,
    DiagramDrawEvent,
    DiagramDrawPayload,
    DiagramNode,
    DiagramSpec,
    DiagramSpecEvent,
    DiagramSpecPayload,
    ErrorEvent,
    ErrorPayload,
    HighlightEvent,
    HighlightPayload,
    PageCompleteEvent,
    PageCompletePayload,
    QuestionReceivedEvent,
    QuestionReceivedPayload,
    RunResultEvent,
    RunResultPayload,
    RunTrace,
    RunTraceStep,
    RunTraceVariable,
    ScopeRefusedEvent,
    ScopeRefusedPayload,
    SessionStartedEvent,
    SessionStartedPayload,
    CodeStreamEvent,
    CodeStreamPayload,
    SourceItem,
    SourcesEvent,
    SourcesPayload,
    TextChunkEvent,
    TextChunkPayload,
    SERVER_EVENT_TYPES,
    CLIENT_EVENT_TYPES,
)
from app.contracts.validate import ParseError, parse_client_event


_NOW = int(time.time() * 1000)


# ---------------------------------------------------------------------------
# JSON examples — one per server event type
# ---------------------------------------------------------------------------

SERVER_EXAMPLES: dict[str, dict] = {
    "session_started": {
        "v": 2, "type": "session_started", "seq": 1, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"sessionId": "sess_1", "courseId": "python", "pageId": "lesson_python_1_1"},
    },
    "text_chunk": {
        "v": 2, "type": "text_chunk", "seq": 2, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"segmentId": "lesson_python_1_1#s0", "text": "Vanakkam!", "wordStart": 0, "wordEnd": 1, "audioStartMs": 0},
    },
    "audio_chunk": {
        "v": 2, "type": "audio_chunk", "seq": 3, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"segmentId": "lesson_python_1_1#s0", "mime": "audio/mpeg", "base64": "AAAA", "seq": 0, "final": False},
    },
    "cue": {
        "v": 2, "type": "cue", "seq": 4, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"segmentId": "lesson_python_1_1#s5", "atWord": 5, "action": "highlight", "targetId": "variable"},
    },
    "diagram_spec": {
        "v": 2, "type": "diagram_spec", "seq": 5, "sessionId": "sess_1", "ts": _NOW,
        "payload": {
            "diagramId": "lesson_python_1_1",
            "spec": {
                "kind": "variable-box",
                "title": "Variables as labeled boxes",
                "nodes": [{"id": "x", "label": "x", "value": "10"}],
            },
            "steps": ["x"],
        },
    },
    "diagram_draw": {
        "v": 2, "type": "diagram_draw", "seq": 6, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"diagramId": "lesson_python_1_1", "stepId": "x"},
    },
    "highlight": {
        "v": 2, "type": "highlight", "seq": 7, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"targetId": "variable", "style": "marker"},
    },
    "code_stream": {
        "v": 2, "type": "code_stream", "seq": 8, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"codeId": "run_1", "chunk": "x = 10\n", "final": False},
    },
    "run_result": {
        "v": 2, "type": "run_result", "seq": 9, "sessionId": None, "ts": _NOW,
        "payload": {
            "codeId": "run_1",
            "stdout": "10\n<class 'int'>\n",
            "stderr": "",
            "status": "success",
            "durationMs": 8.0,
            "trace": {
                "exampleId": "var_basic",
                "steps": [
                    {"logicalLine": 1, "output": None, "variables": [{"name": "x", "value": "10", "type": "int"}]},
                ],
                "stdin": [],
                "sampleInputs": None,
                "unsupported": None,
            },
        },
    },
    "question_received": {
        "v": 2, "type": "question_received", "seq": 10, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"questionId": "q_1", "source": "text", "text": "What is a variable?"},
    },
    "answer_chunk": {
        "v": 2, "type": "answer_chunk", "seq": 11, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"questionId": "q_1", "text": "A variable is a labeled box.", "final": True, "attachments": None},
    },
    "scope_refused": {
        "v": 2, "type": "scope_refused", "seq": 12, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"questionId": "q_2", "message": "I can only help with this course."},
    },
    "sources": {
        "v": 2, "type": "sources", "seq": 13, "sessionId": "sess_1", "ts": _NOW,
        "payload": {
            "questionId": "q_1",
            "items": [{"title": "Current page", "kind": "page", "ref": "0"}],
        },
    },
    "page_complete": {
        "v": 2, "type": "page_complete", "seq": 14, "sessionId": "sess_1", "ts": _NOW,
        "payload": {"pageId": "lesson_python_1_1"},
    },
    "error": {
        "v": 2, "type": "error", "seq": 15, "sessionId": None, "ts": _NOW,
        "payload": {"code": "page_not_found", "message": "No page found.", "recoverable": True},
    },
}

# One example per client event type (v2)
CLIENT_EXAMPLES: dict[str, str] = {
    "start_page": json.dumps({"v": 2, "type": "start_page", "payload": {"courseId": "python", "pageId": "lesson_python_1_1"}}),
    "pause": json.dumps({"v": 2, "type": "pause", "payload": {"sessionId": "sess_1"}}),
    "resume": json.dumps({"v": 2, "type": "resume", "payload": {"sessionId": "sess_1"}}),
    "seek": json.dumps({"v": 2, "type": "seek", "payload": {"sessionId": "sess_1", "segmentId": "p1#s10", "wordIndex": 10}}),
    "speed": json.dumps({"v": 2, "type": "speed", "payload": {"sessionId": "sess_1", "value": 1.5}}),
    "ask_question": json.dumps({
        "v": 2, "type": "ask_question",
        "payload": {
            "sessionId": "sess_1", "source": "text", "text": "What is a variable?",
            "questionId": "q_1",
            "context": {"courseId": "python", "pageId": "lesson_python_1_1", "language": "tanglish"},
        },
    }),
    "run_code": json.dumps({
        "v": 2, "type": "run_code",
        "payload": {
            "courseId": "python", "pageId": "lesson_python_1_1",
            "code": "x = 10\nprint(x)", "language": "python",
            "codeId": "run_1",
        },
    }),
    "submit_survey": json.dumps({
        "v": 2, "type": "submit_survey",
        "payload": {"courseId": "python", "answers": {"q1": "cricket", "q2": "visual"}},
    }),
    "audio_in": json.dumps({
        "v": 2, "type": "audio_in",
        "payload": {"sessionId": "sess_1", "seq": 0, "mime": "audio/webm;codecs=opus", "base64": "AAAA", "final": False},
    }),
}


# ---------------------------------------------------------------------------
# Round-trip tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("event_type,example", SERVER_EXAMPLES.items())
def test_server_event_round_trip(event_type: str, example: dict) -> None:
    """Each server event example survives serialisation and back."""
    raw = json.dumps(example)
    parsed = json.loads(raw)
    assert parsed["type"] == event_type
    assert parsed["v"] == BOOK_PROTOCOL_VERSION
    assert "payload" in parsed


@pytest.mark.parametrize("event_type,raw", CLIENT_EXAMPLES.items())
def test_client_event_round_trip(event_type: str, raw: str) -> None:
    """Each client event parses without error."""
    event = parse_client_event(raw)
    assert event.type == event_type


# ---------------------------------------------------------------------------
# Parity tests — TypeScript vs Pydantic
# ---------------------------------------------------------------------------

# These are the exact names from book-events.ts SERVER_EVENT_TYPES constant (v2)
TS_SERVER_EVENT_TYPES = frozenset([
    "session_started", "text_chunk", "audio_chunk", "cue", "diagram_spec",
    "diagram_draw", "highlight", "code_stream", "run_result",
    "question_received", "answer_chunk", "scope_refused", "sources",
    "page_complete", "error",
    # B1 connection-level
    "auth_ok", "auth_error",
])

# Client event types from book-events.ts ClientEventPayloads interface (v2)
# audio_in is in the TS contract (lib/contracts/book-events.ts line 183-193)
# auth_ticket is a connection-level frame (handled separately, not in ClientEventPayloads)
TS_CLIENT_EVENT_TYPES = frozenset([
    "start_page", "pause", "resume", "seek", "speed",
    "ask_question", "run_code", "submit_survey", "audio_in",
    "auth_ticket",
])

# Payload keys per server event from book-events.ts
TS_SERVER_PAYLOAD_KEYS: dict[str, frozenset[str]] = {
    "session_started": frozenset(["sessionId", "courseId", "pageId"]),
    "text_chunk": frozenset(["segmentId", "text", "wordStart", "wordEnd", "audioStartMs"]),
    "audio_chunk": frozenset(["segmentId", "mime", "base64", "seq", "final"]),
    "cue": frozenset(["segmentId", "atWord", "action", "targetId"]),
    "diagram_spec": frozenset(["diagramId", "spec", "steps"]),
    "diagram_draw": frozenset(["diagramId", "stepId"]),
    "highlight": frozenset(["targetId", "style"]),
    "code_stream": frozenset(["codeId", "chunk", "final"]),
    "run_result": frozenset(["codeId", "stdout", "stderr", "status", "durationMs"]),  # trace is optional
    "question_received": frozenset(["questionId", "source", "text"]),
    "answer_chunk": frozenset(["questionId", "text", "final"]),  # attachments optional
    "scope_refused": frozenset(["questionId", "message"]),
    "sources": frozenset(["questionId", "items"]),
    "page_complete": frozenset(["pageId"]),
    "error": frozenset(["code", "message", "recoverable"]),
}

TS_CLIENT_PAYLOAD_KEYS: dict[str, frozenset[str]] = {
    "start_page": frozenset(["courseId", "pageId"]),
    "pause": frozenset(["sessionId"]),
    "resume": frozenset(["sessionId"]),
    "seek": frozenset(["sessionId", "segmentId", "wordIndex"]),
    "speed": frozenset(["sessionId", "value"]),
    "ask_question": frozenset(["sessionId", "source", "text", "questionId", "context"]),
    "run_code": frozenset(["courseId", "pageId", "code", "language", "codeId"]),
    "submit_survey": frozenset(["courseId", "answers"]),
    "audio_in": frozenset(["sessionId", "seq", "mime", "base64", "final"]),
}


def test_server_event_types_parity():
    """Server event type names match TypeScript SERVER_EVENT_TYPES exactly."""
    assert SERVER_EVENT_TYPES == TS_SERVER_EVENT_TYPES, (
        f"Missing from Pydantic: {TS_SERVER_EVENT_TYPES - SERVER_EVENT_TYPES}\n"
        f"Extra in Pydantic: {SERVER_EVENT_TYPES - TS_SERVER_EVENT_TYPES}"
    )


def test_client_event_types_parity():
    """Client event type names match TypeScript ClientEventPayloads keys exactly."""
    assert CLIENT_EVENT_TYPES == TS_CLIENT_EVENT_TYPES, (
        f"Missing from Pydantic: {TS_CLIENT_EVENT_TYPES - CLIENT_EVENT_TYPES}\n"
        f"Extra in Pydantic: {CLIENT_EVENT_TYPES - TS_CLIENT_EVENT_TYPES}"
    )


@pytest.mark.parametrize("event_type,ts_keys", TS_SERVER_PAYLOAD_KEYS.items())
def test_server_payload_keys_parity(event_type: str, ts_keys: frozenset[str]) -> None:
    """Required payload keys for each server event match TypeScript interface."""
    example = SERVER_EXAMPLES[event_type]
    py_keys = frozenset(example["payload"].keys()) - {"trace", "attachments", "inputRequest", "sampleInputs", "unsupported"}
    missing = ts_keys - py_keys
    assert not missing, f"{event_type}: missing keys in example: {missing}"


@pytest.mark.parametrize("event_type,ts_keys", TS_CLIENT_PAYLOAD_KEYS.items())
def test_client_payload_keys_parity(event_type: str, ts_keys: frozenset[str]) -> None:
    """Required payload keys for each client event match TypeScript interface."""
    raw = CLIENT_EXAMPLES[event_type]
    data = json.loads(raw)
    py_keys = frozenset(data["payload"].keys())
    # Optional keys are allowed to be absent
    optional = {"stdin", "useSampleInput"}
    required_ts = ts_keys - optional
    missing = required_ts - py_keys
    assert not missing, f"{event_type}: missing keys in example: {missing}"


# ---------------------------------------------------------------------------
# Invalid frame rejection tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected_error_fragment", [
    ("not json", "not valid JSON"),
    # v:1 is now rejected (protocol bumped to v2)
    (json.dumps({"v": 1, "type": "start_page", "payload": {}}), "unsupported protocol version"),
    (json.dumps({"v": 2, "type": "unknown_type", "payload": {}}), ""),  # Pydantic discriminator error
    (json.dumps({"v": 2, "type": "start_page", "payload": {"courseId": "python"}}), ""),  # missing pageId
    (json.dumps({"v": 2, "type": "speed", "payload": {"sessionId": "s1", "value": -1}}), ""),  # negative speed
])
def test_invalid_frames_rejected(raw: str, expected_error_fragment: str) -> None:
    with pytest.raises(ParseError) as exc_info:
        parse_client_event(raw)
    if expected_error_fragment:
        assert expected_error_fragment in exc_info.value.message


def test_ping_not_rejected() -> None:
    """Ping is a connection-level frame — parse_client_event returns PingEvent."""
    from app.contracts.models import PingEvent
    raw = json.dumps({"type": "ping", "payload": {}})
    event = parse_client_event(raw)
    assert isinstance(event, PingEvent)
