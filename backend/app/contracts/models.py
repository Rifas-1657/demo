"""
app/contracts/models.py

Pydantic v2 models for every server→client and client→server frame,
with a discriminated union on `type`.

Naming is 1:1 with the TypeScript contract in:
  lib/contracts/book-events.ts
  lib/contracts/validate.ts

Protocol version history:
  v1 — B0: initial protocol (mock-only, no auth)
  v2 — B1: WS ticket auth (auth_ticket / auth_ok / auth_error connection frames)
"""
from __future__ import annotations

import time
from typing import Annotated, Any, Literal, Optional, Union

from pydantic import BaseModel, Field

BOOK_PROTOCOL_VERSION: Literal[2] = 2

# ---------------------------------------------------------------------------
# Shared value types
# ---------------------------------------------------------------------------

CueAction = Literal["draw", "highlight", "runCode", "showOutput"]
HighlightStyle = Literal["marker", "ring", "underline"]
QuestionSource = Literal["voice", "text"]
RunStatus = Literal["success", "error"]
CodeLanguage = Literal["python"]
SourceKind = Literal["page", "note", "doc"]
TutorLanguage = Literal["tanglish", "tamil", "english"]


class SourceItem(BaseModel):
    title: str
    kind: SourceKind
    ref: str


class RunTraceVariable(BaseModel):
    name: str
    value: str
    type: str


class RunTraceStep(BaseModel):
    logicalLine: int = Field(ge=0)
    output: Optional[str] = None
    variables: list[RunTraceVariable]


class RunTrace(BaseModel):
    exampleId: Optional[str]
    steps: list[RunTraceStep]
    stdin: list[str]
    sampleInputs: Optional[list[str]] = None
    inputRequest: Optional[dict[str, Any]] = None
    unsupported: Optional[str] = None


class TutorAttachments(BaseModel):
    code: Optional[str] = None
    diagram: Optional[list[str]] = None


class DiagramNode(BaseModel):
    id: str
    label: Optional[str] = None
    value: Optional[str] = None
    caption: Optional[str] = None
    tone: Optional[str] = None

    model_config = {"extra": "allow"}


class DiagramSpec(BaseModel):
    kind: str
    title: Optional[str] = None
    caption: Optional[str] = None
    nodes: list[DiagramNode]

    model_config = {"extra": "allow"}


# ---------------------------------------------------------------------------
# Server → Client payloads
# ---------------------------------------------------------------------------

class SessionStartedPayload(BaseModel):
    sessionId: str
    courseId: str
    pageId: str


class TextChunkPayload(BaseModel):
    segmentId: str
    text: str
    wordStart: int = Field(ge=0)
    wordEnd: int = Field(ge=0)
    audioStartMs: float = Field(ge=0)


class AudioChunkPayload(BaseModel):
    segmentId: str
    mime: str
    base64: str
    seq: int = Field(ge=0)
    final: bool


class CuePayload(BaseModel):
    segmentId: str
    atWord: int = Field(ge=0)
    action: CueAction
    targetId: str


class DiagramSpecPayload(BaseModel):
    diagramId: str
    spec: DiagramSpec
    steps: list[str]


class DiagramDrawPayload(BaseModel):
    diagramId: str
    stepId: str


class HighlightPayload(BaseModel):
    targetId: str
    style: HighlightStyle


class CodeStreamPayload(BaseModel):
    codeId: str
    chunk: str
    final: bool


class RunResultPayload(BaseModel):
    codeId: str
    stdout: str
    stderr: str
    status: RunStatus
    durationMs: float = Field(ge=0)
    trace: Optional[RunTrace] = None


class QuestionReceivedPayload(BaseModel):
    questionId: str
    source: QuestionSource
    text: str


class AnswerChunkPayload(BaseModel):
    questionId: str
    text: str
    final: bool
    attachments: Optional[TutorAttachments] = None


class ScopeRefusedPayload(BaseModel):
    questionId: str
    message: str


class SourcesPayload(BaseModel):
    questionId: str
    items: list[SourceItem]


class PageCompletePayload(BaseModel):
    pageId: str


class ErrorPayload(BaseModel):
    code: str
    message: str
    recoverable: bool


# B1 connection-level payloads
class AuthOkPayload(BaseModel):
    userId: str
    role: Literal["learner", "admin"]


class AuthErrorPayload(BaseModel):
    code: str
    message: str


# Connection-level frames (not in TS protocol union — transport-level only)
class PongPayload(BaseModel):
    ts: int


# ---------------------------------------------------------------------------
# Server → Client envelopes (discriminated union)
# ---------------------------------------------------------------------------

def _now_ms() -> int:
    return int(time.time() * 1000)


class _ServerBase(BaseModel):
    v: Literal[2] = BOOK_PROTOCOL_VERSION
    seq: int = Field(ge=0)
    sessionId: Optional[str] = None
    ts: int = Field(default_factory=_now_ms)


class SessionStartedEvent(_ServerBase):
    type: Literal["session_started"] = "session_started"
    payload: SessionStartedPayload


class TextChunkEvent(_ServerBase):
    type: Literal["text_chunk"] = "text_chunk"
    payload: TextChunkPayload


class AudioChunkEvent(_ServerBase):
    type: Literal["audio_chunk"] = "audio_chunk"
    payload: AudioChunkPayload


class CueEvent(_ServerBase):
    type: Literal["cue"] = "cue"
    payload: CuePayload


class DiagramSpecEvent(_ServerBase):
    type: Literal["diagram_spec"] = "diagram_spec"
    payload: DiagramSpecPayload


class DiagramDrawEvent(_ServerBase):
    type: Literal["diagram_draw"] = "diagram_draw"
    payload: DiagramDrawPayload


class HighlightEvent(_ServerBase):
    type: Literal["highlight"] = "highlight"
    payload: HighlightPayload


class CodeStreamEvent(_ServerBase):
    type: Literal["code_stream"] = "code_stream"
    payload: CodeStreamPayload


class RunResultEvent(_ServerBase):
    type: Literal["run_result"] = "run_result"
    payload: RunResultPayload


class QuestionReceivedEvent(_ServerBase):
    type: Literal["question_received"] = "question_received"
    payload: QuestionReceivedPayload


class AnswerChunkEvent(_ServerBase):
    type: Literal["answer_chunk"] = "answer_chunk"
    payload: AnswerChunkPayload


class ScopeRefusedEvent(_ServerBase):
    type: Literal["scope_refused"] = "scope_refused"
    payload: ScopeRefusedPayload


class SourcesEvent(_ServerBase):
    type: Literal["sources"] = "sources"
    payload: SourcesPayload


class PageCompleteEvent(_ServerBase):
    type: Literal["page_complete"] = "page_complete"
    payload: PageCompletePayload


class ErrorEvent(_ServerBase):
    type: Literal["error"] = "error"
    payload: ErrorPayload
    sessionId: Optional[str] = None  # always null for error frames


# B1 connection-level server events
class AuthOkEvent(_ServerBase):
    type: Literal["auth_ok"] = "auth_ok"
    payload: AuthOkPayload
    sessionId: Optional[str] = None


class AuthErrorEvent(_ServerBase):
    type: Literal["auth_error"] = "auth_error"
    payload: AuthErrorPayload
    sessionId: Optional[str] = None


# Connection-level (pong)
class PongEvent(BaseModel):
    type: Literal["pong"] = "pong"
    payload: PongPayload


BookServerEvent = Annotated[
    Union[
        SessionStartedEvent,
        TextChunkEvent,
        AudioChunkEvent,
        CueEvent,
        DiagramSpecEvent,
        DiagramDrawEvent,
        HighlightEvent,
        CodeStreamEvent,
        RunResultEvent,
        QuestionReceivedEvent,
        AnswerChunkEvent,
        ScopeRefusedEvent,
        SourcesEvent,
        PageCompleteEvent,
        ErrorEvent,
        AuthOkEvent,
        AuthErrorEvent,
    ],
    Field(discriminator="type"),
]

SERVER_EVENT_TYPES = frozenset([
    "session_started", "text_chunk", "audio_chunk", "cue", "diagram_spec",
    "diagram_draw", "highlight", "code_stream", "run_result",
    "question_received", "answer_chunk", "scope_refused", "sources",
    "page_complete", "error",
    # B1 connection-level (included in TS SERVER_EVENT_TYPES for v2)
    "auth_ok", "auth_error",
])

# ---------------------------------------------------------------------------
# Client → Server payloads
# ---------------------------------------------------------------------------

class StartPagePayload(BaseModel):
    courseId: str
    pageId: str


class PausePayload(BaseModel):
    sessionId: str


class ResumePayload(BaseModel):
    sessionId: str


class SeekPayload(BaseModel):
    sessionId: str
    segmentId: str
    wordIndex: int = Field(ge=0)


class SpeedPayload(BaseModel):
    sessionId: str
    value: float = Field(gt=0)


class AskQuestionContext(BaseModel):
    courseId: str
    pageId: str
    language: TutorLanguage


class AskQuestionPayload(BaseModel):
    sessionId: Optional[str]
    source: QuestionSource
    text: str
    questionId: str
    context: AskQuestionContext


class RunCodePayload(BaseModel):
    courseId: str
    pageId: str
    code: str
    language: CodeLanguage
    codeId: str
    stdin: Optional[list[str]] = None
    useSampleInput: Optional[bool] = None


class SubmitSurveyPayload(BaseModel):
    courseId: str
    answers: dict[str, str]


class AudioInPayload(BaseModel):
    sessionId: Optional[str]
    seq: int = Field(ge=0)
    mime: str
    base64: str
    final: bool


# B1 connection-level client auth frame
class AuthTicketPayload(BaseModel):
    ticket: str


# ---------------------------------------------------------------------------
# Client → Server envelopes (discriminated union)
# ---------------------------------------------------------------------------

class _ClientBase(BaseModel):
    v: Literal[2] = BOOK_PROTOCOL_VERSION


class StartPageEvent(_ClientBase):
    type: Literal["start_page"] = "start_page"
    payload: StartPagePayload


class PauseEvent(_ClientBase):
    type: Literal["pause"] = "pause"
    payload: PausePayload


class ResumeEvent(_ClientBase):
    type: Literal["resume"] = "resume"
    payload: ResumePayload


class SeekEvent(_ClientBase):
    type: Literal["seek"] = "seek"
    payload: SeekPayload


class SpeedEvent(_ClientBase):
    type: Literal["speed"] = "speed"
    payload: SpeedPayload


class AskQuestionEvent(_ClientBase):
    type: Literal["ask_question"] = "ask_question"
    payload: AskQuestionPayload


class RunCodeEvent(_ClientBase):
    type: Literal["run_code"] = "run_code"
    payload: RunCodePayload


class SubmitSurveyEvent(_ClientBase):
    type: Literal["submit_survey"] = "submit_survey"
    payload: SubmitSurveyPayload


class AudioInEvent(_ClientBase):
    type: Literal["audio_in"] = "audio_in"
    payload: AudioInPayload


# B1 auth frame — sent as the FIRST frame after WebSocket open
class AuthTicketEvent(BaseModel):
    """Not in _ClientBase because it can also use v:1 for backwards compat."""
    type: Literal["auth_ticket"] = "auth_ticket"
    payload: AuthTicketPayload


# Connection-level (ping — not in protocol union, handled before frame validation)
class PingEvent(BaseModel):
    type: Literal["ping"] = "ping"
    payload: dict[str, Any] = Field(default_factory=dict)


BookClientEvent = Annotated[
    Union[
        StartPageEvent,
        PauseEvent,
        ResumeEvent,
        SeekEvent,
        SpeedEvent,
        AskQuestionEvent,
        RunCodeEvent,
        SubmitSurveyEvent,
        AudioInEvent,
    ],
    Field(discriminator="type"),
]

CLIENT_EVENT_TYPES = frozenset([
    "start_page", "pause", "resume", "seek", "speed",
    "ask_question", "run_code", "submit_survey", "audio_in",
    # B1 connection-level (NOT in TS ClientEventPayloads union — handled separately)
    "auth_ticket",
])
