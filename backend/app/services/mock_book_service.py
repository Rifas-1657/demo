"""
app/services/mock_book_service.py

MockBookService: drives the realtime book protocol for B0.
On start_page, replays the seeded page as:
  session_started → diagram_spec → text_chunk (per word) →
  [cue / diagram_draw / highlight at anchored words] →
  page_complete

Also handles:
  pause, resume, seek, speed
  ask_question (scripted answers, scope_refused for non-Python, sources)
  run_code (seeded examples → run_result with trace)
  submit_survey (acknowledgement)
  audio_in (no-op in B0 — STT not connected)
"""
from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine, Optional

from app.contracts.models import (
    BOOK_PROTOCOL_VERSION,
    AnswerChunkEvent,
    AnswerChunkPayload,
    CueEvent,
    CuePayload,
    DiagramDrawEvent,
    DiagramDrawPayload,
    DiagramSpecEvent,
    DiagramSpecPayload,
    DiagramNode,
    DiagramSpec,
    ErrorEvent,
    ErrorPayload,
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
    SourceItem,
    SourcesEvent,
    SourcesPayload,
    TextChunkEvent,
    TextChunkPayload,
    TutorAttachments,
)

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------
SendFn = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


# ---------------------------------------------------------------------------
# Scripted answers (Tanglish tutor)
# ---------------------------------------------------------------------------

_SCRIPTED_ANSWERS: dict[str, list[str]] = {
    "variable": [
        "Oru variable na oru labeled box maari! ",
        "Box mela irukkura label thaan variable name, ",
        "box-kulla irukkura value thaan actual data. ",
        "Python-la x = 10 nu ezhudhina, 'x' andha box-oda peru, ",
        "10 adha kulla irukkura value. ",
        "Idha neengal eppovume maatha mudiyum — adha thaan re-assignment!",
    ],
    "int": [
        "int na integer, adhaavadhu whole number. ",
        "7, -3, 100 ellaam int thaan. ",
        "Decimal point illatha ellaa numbers-um Python-la int aagidum. ",
        "type(7) nu kettaal Python '<class int>' nu solludhu.",
    ],
    "float": [
        "float na floating-point number, adhaavadhu decimal irukkura number. ",
        "3.14, 2.5, -0.001 ellaam float. ",
        "Oru int-um float-um serndhu calculate panna, result eppovume float aagum. ",
        "Udharanathukku 7 + 0.5 na 7.5 varum, adhu float.",
    ],
    "str": [
        "str na string — quotes kulla irukkura text. ",
        "Single quotes illa double quotes, rendume sari. ",
        "name = 'Priya' nu ezhudhina, name oru str. ",
        "Strings-a + vachu join pannalaam, adha concatenation nu solluvaanga.",
    ],
    "type": [
        "type() function oru value-oda type-a kaattum. ",
        "type(10) na <class 'int'>, type('hello') na <class 'str'>. ",
        "Type-a therinjukka venum pothu idha use pannunga!",
    ],
    "print": [
        "print() function screen-la output kaattum. ",
        "print(x) nu ezhudhina x-oda value screen-la varum. ",
        "Niraiya values comma pottu kudukkalaam: print(x, y, z) — naduvula space automatic-aa varum.",
    ],
    "input": [
        "input() user-kitta oru question kekkum. ",
        "User type pannadhu ellaam string-aa varum. ",
        "Number venumna, int(input('Enter age: ')) nu convert pannanum, ",
        "illa na age + 1 panna error varum!",
    ],
    "default": [
        "Idu pathi sollanum naa... ",
        "Python-la idhu romba important concept. ",
        "Unga question-a paartha, neenga padicha chapter-la idhu irukkum. ",
        "Andha page-a thirumba paathu, doubt vandhaa kelungal!",
    ],
}

_SCOPE_REFUSE_MSG = (
    "Naan ippo Python from Zero course mattum help panna mudiyum. "
    "Unga question idha pathi illaa maadhiri theriyudhu. "
    "Course-la irukkura Python topics — variables, types, operators, conditions — "
    "pathi enna venum naalum kelu!"
)

_PYTHON_TOPICS = {
    "variable", "variables", "int", "float", "str", "string", "bool",
    "boolean", "list", "type", "print", "input", "assign", "assignment",
    "name", "naming", "snake_case", "operator", "operators", "conversion",
    "convert", "code", "python", "value", "values", "number", "numbers",
    "text", "concatenation", "index", "length", "len",
}


def _is_python_question(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in _PYTHON_TOPICS)


def _pick_answer_chunks(text: str) -> list[str]:
    lower = text.lower()
    for keyword, chunks in _SCRIPTED_ANSWERS.items():
        if keyword != "default" and keyword in lower:
            return chunks
    return _SCRIPTED_ANSWERS["default"]


# ---------------------------------------------------------------------------
# Seeded code examples (mirrors lib/runner.ts)
# ---------------------------------------------------------------------------

_SEEDED_EXAMPLES: dict[str, dict[str, Any]] = {
    "x = 10\nprint(x)\nprint(type(x))": {
        "stdout": "10\n<class 'int'>\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 8.0,
        "trace": {
            "exampleId": "var_basic",
            "steps": [
                {"logicalLine": 1, "output": None, "variables": [{"name": "x", "value": "10", "type": "int"}]},
                {"logicalLine": 2, "output": "10", "variables": [{"name": "x", "value": "10", "type": "int"}]},
                {"logicalLine": 3, "output": "<class 'int'>", "variables": [{"name": "x", "value": "10", "type": "int"}]},
            ],
            "stdin": [],
        },
    },
    "score = 10\nscore = score + 2\nprint(score)": {
        "stdout": "12\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 6.0,
        "trace": {
            "exampleId": "assignment",
            "steps": [
                {"logicalLine": 1, "output": None, "variables": [{"name": "score", "value": "10", "type": "int"}]},
                {"logicalLine": 2, "output": None, "variables": [{"name": "score", "value": "12", "type": "int"}]},
                {"logicalLine": 3, "output": "12", "variables": [{"name": "score", "value": "12", "type": "int"}]},
            ],
            "stdin": [],
        },
    },
    'age = 21\nprice = 3.5\nname = "Priya"\nready = True\nscores = [90, 85, 77]\nprint(type(age), type(price))\nprint(type(name), type(ready))\nprint(type(scores))': {
        "stdout": "<class 'int'> <class 'float'>\n<class 'str'> <class 'bool'>\n<class 'list'>\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 10.0,
        "trace": None,
    },
    'total_score = 42\n_hidden = "ok"\nplayer2 = "Arun"\n# 2player = "no"   -> SyntaxError\n# total score = 1  -> SyntaxError\nprint(total_score, player2)': {
        "stdout": "42 Arun\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 7.0,
        "trace": None,
    },
    'item = "Notebook"\nprice = 45.0\nquantity = 3\ntotal = price * quantity\nprint(item, "x", quantity, "=", total)': {
        "stdout": "Notebook x 3 = 135.0\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 9.0,
        "trace": {
            "exampleId": "bill_calc",
            "steps": [
                {"logicalLine": 1, "output": None, "variables": [{"name": "item", "value": '"Notebook"', "type": "str"}]},
                {"logicalLine": 2, "output": None, "variables": [{"name": "price", "value": "45.0", "type": "float"}]},
                {"logicalLine": 3, "output": None, "variables": [{"name": "quantity", "value": "3", "type": "int"}]},
                {"logicalLine": 4, "output": None, "variables": [{"name": "total", "value": "135.0", "type": "float"}]},
                {"logicalLine": 5, "output": "Notebook x 3 = 135.0", "variables": []},
            ],
            "stdin": [],
        },
    },
    "apples = 7\nprice = 12.5\nprint(apples * price)\nprint(7 // 2)\nprint(7 % 2)\nprint(2 ** 3)": {
        "stdout": "87.5\n3\n1\n8\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 8.0,
        "trace": None,
    },
    'name = "Priya"\nprint("Hello, " + name)\nprint(len(name))\nprint(name.upper())\nprint(name[0])': {
        "stdout": "Hello, Priya\n5\nPRIYA\nP\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 7.0,
        "trace": None,
    },
    "age = 21\nis_adult = age >= 18\nprint(is_adult)\nprint(age == 21)\nprint(age < 18)\nprint(is_adult and age < 25)": {
        "stdout": "True\nTrue\nFalse\nTrue\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 8.0,
        "trace": None,
    },
    'text = "5"\nnumber = int(text)\nprint(number + 5)\nprint(str(number) + "5")\nprint(float("3.5") * 2)\nprint(int(7.9))': {
        "stdout": "10\n55\n7.0\n7\n",
        "stderr": "",
        "status": "success",
        "duration_ms": 9.0,
        "trace": None,
    },
}


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

@dataclass
class _NarrationState:
    session_id: str
    course_id: str
    page_id: str
    words: list[str]
    cues: list[dict]
    diagram_spec: dict
    narration_text: str
    word_index: int = 0
    paused: bool = False
    speed: float = 1.0
    task: Optional[asyncio.Task] = None


# ---------------------------------------------------------------------------
# MockBookService
# ---------------------------------------------------------------------------

class MockBookService:
    """
    Connection-scoped mock service. Instantiated per WebSocket connection.
    seq_counter: monotonically increasing per connection.
    """

    def __init__(
        self,
        send: SendFn,
        user_id: str = "",
        token_ms: int = 85,
        thinking_ms: int = 600,
        answer_token_ms: int = 45,
        code_stream_ms: int = 30,
    ) -> None:
        self._send = send
        self._user_id = user_id
        self._token_ms = token_ms
        self._thinking_ms = thinking_ms
        self._answer_token_ms = answer_token_ms
        self._code_stream_ms = code_stream_ms

        self._seq: int = 0
        self._narration: Optional[_NarrationState] = None
        self._survey_answers: dict[str, dict[str, str]] = {}
        # Tutor: per-connection conversation history
        self._tutor_history: list[dict] = []
        self._tutor_course_id: str = "python"
        self._tutor_chapter: int = 1
        self._tutor_page: int = 1
        self._narration_active: bool = False
        # Audio: per-utterance buffer (seq → bytes)
        self._audio_buffers: dict[str, bytes] = {}

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    def _next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def _ts(self) -> int:
        return int(time.time() * 1000)

    async def _emit(self, event: Any, session_id: Optional[str] = None) -> None:
        data = event.model_dump(mode="json")
        # Inject seq and ts into the envelope if this is a server event
        if "seq" in data:
            data["seq"] = self._next_seq()
        if "ts" in data:
            data["ts"] = self._ts()
        if "sessionId" in data and session_id is not None:
            data["sessionId"] = session_id
        await self._send(data)

    async def _emit_error(self, code: str, message: str, recoverable: bool = True) -> None:
        ev = ErrorEvent(
            seq=0, sessionId=None, ts=0,
            payload=ErrorPayload(code=code, message=message, recoverable=recoverable),
        )
        await self._emit(ev)

    # -----------------------------------------------------------------------
    # Page loading helpers
    # -----------------------------------------------------------------------

    def _get_page_data(self, course_id: str, page_id: str) -> Optional[dict[str, Any]]:
        """Return the seeded page data for lesson_python_* pages."""
        from app.db.seed import PYTHON_PAGES
        if course_id != "python":
            return None
        for p in PYTHON_PAGES:
            if p["id"] == page_id:
                return p
        return None

    def _build_diagram_spec_payload(self, page_data: dict) -> DiagramSpecPayload:
        spec_raw = page_data["diagram_spec"]
        nodes = [DiagramNode(**n) for n in spec_raw.get("nodes", [])]
        spec = DiagramSpec(
            kind=spec_raw["kind"],
            title=spec_raw.get("title"),
            caption=spec_raw.get("caption"),
            nodes=nodes,
        )
        steps = [n.id for n in nodes]
        return DiagramSpecPayload(
            diagramId=page_data["id"],
            spec=spec,
            steps=steps,
        )

    # -----------------------------------------------------------------------
    # Narration
    # -----------------------------------------------------------------------

    async def handle_start_page(self, course_id: str, page_id: str) -> None:
        # Cancel any existing narration
        if self._narration and self._narration.task:
            self._narration.task.cancel()
            try:
                await self._narration.task
            except asyncio.CancelledError:
                pass

        page_data = self._get_page_data(course_id, page_id)
        if not page_data:
            await self._emit_error(
                "page_not_found",
                f"No page {page_id!r} in course {course_id!r}.",
                recoverable=True,
            )
            return

        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        words = page_data["narration_text"].split()
        cues = page_data.get("cues", [])

        state = _NarrationState(
            session_id=session_id,
            course_id=course_id,
            page_id=page_id,
            words=words,
            cues=cues,
            diagram_spec=page_data["diagram_spec"],
            narration_text=page_data["narration_text"],
        )
        self._narration = state

        # Send session_started
        await self._emit(
            SessionStartedEvent(
                seq=0, ts=0, sessionId=session_id,
                payload=SessionStartedPayload(
                    sessionId=session_id, courseId=course_id, pageId=page_id
                ),
            ),
            session_id=session_id,
        )

        # Send diagram_spec
        diagram_payload = self._build_diagram_spec_payload(page_data)
        await self._emit(
            DiagramSpecEvent(seq=0, ts=0, sessionId=session_id, payload=diagram_payload),
            session_id=session_id,
        )

        # Start narration task
        state.task = asyncio.create_task(self._narration_loop(state))

    async def _narration_loop(self, state: _NarrationState) -> None:
        words = state.words
        cues = state.cues
        page_id = state.page_id
        session_id = state.session_id

        # Build cue index: word_index → list[cue]
        cue_map: dict[int, list[dict]] = {}
        for cue in cues:
            idx = cue.get("atWord", 0)
            cue_map.setdefault(idx, []).append(cue)

        # Emit text_chunk per word, with cue side-effects
        i = state.word_index
        while i < len(words):
            if state.paused:
                await asyncio.sleep(0.05)
                continue

            word = words[i]
            segment_id = f"{page_id}#s{i}"
            audio_start_ms = i * (self._token_ms / state.speed)

            await self._emit(
                TextChunkEvent(
                    seq=0, ts=0, sessionId=session_id,
                    payload=TextChunkPayload(
                        segmentId=segment_id,
                        text=word,
                        wordStart=i,
                        wordEnd=i + 1,
                        audioStartMs=audio_start_ms,
                    ),
                ),
                session_id=session_id,
            )
            state.word_index = i

            # Fire cues anchored to this word
            for cue in cue_map.get(i, []):
                kind = cue.get("kind", "")
                target = cue.get("target", "")

                if kind == "focus-node":
                    await self._emit(
                        DiagramDrawEvent(
                            seq=0, ts=0, sessionId=session_id,
                            payload=DiagramDrawPayload(diagramId=page_id, stepId=target),
                        ),
                        session_id=session_id,
                    )
                elif kind == "highlight-term":
                    await self._emit(
                        CueEvent(
                            seq=0, ts=0, sessionId=session_id,
                            payload=CuePayload(
                                segmentId=segment_id, atWord=i,
                                action="highlight", targetId=target,
                            ),
                        ),
                        session_id=session_id,
                    )
                elif kind in ("focus-code-line", "runCode"):
                    await self._emit(
                        CueEvent(
                            seq=0, ts=0, sessionId=session_id,
                            payload=CuePayload(
                                segmentId=segment_id, atWord=i,
                                action="runCode", targetId=target,
                            ),
                        ),
                        session_id=session_id,
                    )

            delay = (self._token_ms / 1000.0) / state.speed
            await asyncio.sleep(delay)
            i += 1

        # page_complete
        await self._emit(
            PageCompleteEvent(seq=0, ts=0, sessionId=session_id, payload=PageCompletePayload(pageId=page_id)),
            session_id=session_id,
        )

    async def handle_pause(self, session_id: str) -> None:
        if self._narration and self._narration.session_id == session_id:
            self._narration.paused = True

    async def handle_resume(self, session_id: str) -> None:
        if self._narration and self._narration.session_id == session_id:
            self._narration.paused = False

    async def handle_seek(self, session_id: str, segment_id: str, word_index: int) -> None:
        if self._narration and self._narration.session_id == session_id:
            self._narration.word_index = max(0, min(word_index, len(self._narration.words) - 1))

    async def handle_speed(self, session_id: str, value: float) -> None:
        if value <= 0:
            await self._emit_error("invalid_speed", f"Speed must be > 0, got {value}.", recoverable=True)
            return
        if self._narration and self._narration.session_id == session_id:
            self._narration.speed = value

    # -----------------------------------------------------------------------
    # Questions
    # -----------------------------------------------------------------------

    async def handle_ask_question(
        self,
        session_id: Optional[str],
        source: str,
        text: str,
        question_id: str,
        context: dict,
    ) -> None:
        if not text.strip():
            await self._emit_error("empty_question", "Question cannot be empty.", recoverable=True)
            return

        # Echo back question_received
        await self._emit(
            QuestionReceivedEvent(
                seq=0, ts=0, sessionId=session_id,
                payload=QuestionReceivedPayload(questionId=question_id, source=source, text=text),  # type: ignore[arg-type]
            ),
            session_id=session_id,
        )

        # Update page context from the question's context payload
        course_id = context.get("courseId") or self._tutor_course_id
        chapter = context.get("chapter") or self._tutor_chapter
        page = context.get("page") or self._tutor_page
        page_script = context.get("pageScript") or ""
        learner_profile = context.get("learnerProfile") or {}

        # Run B4 tutor pipeline
        import asyncio
        try:
            from app.tutor.graph import (
                process_question,
                ANSWER_START, ANSWER_CHUNK, ANSWER_END, SOURCES_EVENT, SCOPE_REFUSED,
            )

            gen = await process_question(
                question=text,
                user_id=self._user_id or "anonymous",
                session_id=session_id or "default",
                course_id=course_id,
                chapter=chapter,
                page=page,
                history=self._tutor_history[-6:],  # last 3 exchanges (6 messages)
                page_script=page_script,
                learner_profile=learner_profile,
            )

            full_answer_parts: list[str] = []
            sources_payload: list[dict] = []

            async for ev in gen:
                etype = ev.get("type", "")

                if etype == SCOPE_REFUSED:
                    await self._emit(
                        ScopeRefusedEvent(
                            seq=0, ts=0, sessionId=session_id,
                            payload=ScopeRefusedPayload(
                                questionId=question_id,
                                message=ev.get("message", "Out of scope."),
                            ),
                        ),
                        session_id=session_id,
                    )
                    return

                elif etype == ANSWER_CHUNK:
                    word = ev.get("word", "")
                    full_answer_parts.append(word)
                    await self._emit(
                        AnswerChunkEvent(
                            seq=0, ts=0, sessionId=session_id,
                            payload=AnswerChunkPayload(
                                questionId=question_id,
                                text=word + " ",
                                final=False,
                                attachments=None,
                            ),
                        ),
                        session_id=session_id,
                    )

                elif etype == ANSWER_END:
                    # Send final empty chunk as end-of-answer marker
                    await self._emit(
                        AnswerChunkEvent(
                            seq=0, ts=0, sessionId=session_id,
                            payload=AnswerChunkPayload(
                                questionId=question_id,
                                text="",
                                final=True,
                                attachments=None,
                            ),
                        ),
                        session_id=session_id,
                    )

                elif etype == SOURCES_EVENT:
                    sources_payload = ev.get("sources", [])

            # Emit sources (always, even if empty — protocol requires the event)
            _source_items = [
                SourceItem(
                    title=s.get("chunkId", "")[:40] or "Reference",
                    kind="doc",
                    ref=s.get("documentId", ""),
                )
                for s in sources_payload[:5]
            ] or [SourceItem(title="Python Basics", kind="page", ref="0")]
            await self._emit(
                SourcesEvent(
                    seq=0, ts=0, sessionId=session_id,
                    payload=SourcesPayload(
                        questionId=question_id,
                        items=_source_items,
                    ),
                ),
                session_id=session_id,
            )

            # Update conversation history
            full_answer = " ".join(full_answer_parts)
            self._tutor_history.append({"role": "user", "content": text})
            self._tutor_history.append({"role": "assistant", "content": full_answer})
            if len(self._tutor_history) > 20:
                self._tutor_history = self._tutor_history[-20:]

        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Tutor pipeline error: %s", exc, exc_info=True)
            # Fallback to scripted answers so UI is never blank
            chunks = _pick_answer_chunks(text)
            for idx, chunk in enumerate(chunks):
                is_final = idx == len(chunks) - 1
                await self._emit(
                    AnswerChunkEvent(
                        seq=0, ts=0, sessionId=session_id,
                        payload=AnswerChunkPayload(
                            questionId=question_id, text=chunk, final=is_final,
                            attachments=None,
                        ),
                    ),
                    session_id=session_id,
                )

            # Always emit sources so clients receive the expected protocol event
            await self._emit(
                SourcesEvent(
                    seq=0, ts=0, sessionId=session_id,
                    payload=SourcesPayload(
                        questionId=question_id,
                        items=[SourceItem(title="Python Basics", kind="page", ref="0")],
                    ),
                ),
                session_id=session_id,
            )

    # -----------------------------------------------------------------------
    # Code runner
    # -----------------------------------------------------------------------

    async def handle_run_code(
        self,
        course_id: str,
        page_id: str,
        code: str,
        language: str,
        code_id: str,
        stdin: Optional[list[str]] = None,
        use_sample_input: Optional[bool] = None,
    ) -> None:
        example = _SEEDED_EXAMPLES.get(code.strip())
        if example is None:
            # Unsupported
            trace = RunTrace(
                exampleId=None,
                steps=[],
                stdin=[],
                unsupported="This code is not in the demo examples. Edit it to match a seeded example, or connect the Pyodide runner.",
            )
            await self._emit(
                RunResultEvent(
                    seq=0, ts=0, sessionId=None,
                    payload=RunResultPayload(
                        codeId=code_id, stdout="", stderr="",
                        status="error", durationMs=0.0, trace=trace,
                    ),
                )
            )
            return

        # Small delay to feel realistic
        await asyncio.sleep(example["duration_ms"] / 1000.0 * 3)

        trace_data = example.get("trace")
        trace = None
        if trace_data:
            trace = RunTrace(
                exampleId=trace_data["exampleId"],
                steps=[
                    RunTraceStep(
                        logicalLine=s["logicalLine"],
                        output=s.get("output"),
                        variables=[RunTraceVariable(**v) for v in s["variables"]],
                    )
                    for s in trace_data["steps"]
                ],
                stdin=trace_data.get("stdin", []),
            )

        await self._emit(
            RunResultEvent(
                seq=0, ts=0, sessionId=None,
                payload=RunResultPayload(
                    codeId=code_id,
                    stdout=example["stdout"],
                    stderr=example["stderr"],
                    status=example["status"],
                    durationMs=example["duration_ms"],
                    trace=trace,
                ),
            )
        )

    # -----------------------------------------------------------------------
    # Survey
    # -----------------------------------------------------------------------

    async def handle_submit_survey(self, course_id: str, answers: dict[str, str]) -> None:
        self._survey_answers[course_id] = answers
        # No protocol event for survey in B0 — just acknowledged silently.
        # Future: persist to DB and adjust tutor persona.

    # -----------------------------------------------------------------------
    # Audio in (no-op in B0)
    # -----------------------------------------------------------------------

    async def handle_audio_in(
        self,
        session_id: Optional[str] = None,
        seq: int = 0,
        mime: str = "audio/webm",
        base64: str = "",
        final: bool = False,
        **kwargs,
    ) -> None:
        """B5: STT pipeline. Assembles chunks, transcribes on final=True."""
        import base64 as b64
        buf_key = session_id or "default"

        # Accumulate audio chunks
        try:
            chunk_bytes = b64.b64decode(base64) if base64 else b""
        except Exception:
            chunk_bytes = b""

        self._audio_buffers[buf_key] = self._audio_buffers.get(buf_key, b"") + chunk_bytes

        if not final:
            return  # wait for more chunks

        audio_bytes = self._audio_buffers.pop(buf_key, b"")
        if not audio_bytes:
            return

        # Run B5 STT + feed to tutor
        try:
            from app.voice.pipeline import handle_audio_in as stt_handle
            await stt_handle(
                session_id=buf_key,
                audio_bytes=audio_bytes,
                mime=mime,
                user_id=self._user_id or "anonymous",
                course_id=self._tutor_course_id,
                chapter=self._tutor_chapter,
                page=self._tutor_page,
                ws_send=self._send,
                narration_active=self._narration_active,
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("audio_in STT failed: %s", exc)

    # -----------------------------------------------------------------------
    # Cleanup
    # -----------------------------------------------------------------------

    async def dispose(self) -> None:
        if self._narration and self._narration.task:
            self._narration.task.cancel()
            try:
                await self._narration.task
            except asyncio.CancelledError:
                pass
