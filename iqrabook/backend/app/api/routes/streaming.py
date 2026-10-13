"""
IqraBook — WebSocket Streaming Route
/ws/chat/{session_id}

Flow:
1. Client connects → sends text or audio
2. Server: classify (Groq) → RAG (ChromaDB) → lesson (Gemini)
3. Per chunk: {"type":"text","content":"chunk","word_index":N}
4. After lesson: if code → {"type":"code","content":"..."}
5. Diagram: {"type":"diagram","content":"mermaid syntax"}
6. TTS: every ~2 sentences → {"type":"audio","data":"base64"}
7. Interrupt: cancel in-flight turn → pause → Groq Q&A → resume
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
import base64
import re

from app.core.stt import IqraSTT
from app.core.gemini_client import GeminiClient
from app.core.groq_client import GroqClient
from app.core.config import settings
from app.agents.orchestrator import get_orchestrator, generate_diagram_node

logger = logging.getLogger(__name__)
router = APIRouter(tags=["streaming"])

_CODE_FENCE = re.compile(r"```(?:python)?\s*\n(.*?)```", re.DOTALL | re.IGNORECASE)
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


@router.websocket("/ws/chat/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Full-duplex WebSocket for IqraBook live teaching sessions.
    Interrupt can cancel an in-flight lesson without blocking the receive loop.
    """
    await websocket.accept()
    logger.info(f"WS connected: session={session_id}")

    gemini = GeminiClient(settings.GEMINI_API_KEY)
    groq = GroqClient(settings.GROQ_API_KEY)
    stt = IqraSTT(groq, gemini)
    orchestrator = get_orchestrator()

    session_state = {
        "session_id": session_id,
        "user_id": "user_1",
        "course_id": 1,
        "current_topic_id": "py_01",
        "current_topic_title": "Introduction & Setup",
        "rag_context": "",
        "generated_text": "",
        "pending_diagram": "",
        "pending_code": "",
        "agent_state": "TEACHING",
        "rl_action": "balanced",
        "interests": ["movies"],
        "preferred_examples": "movies",
        "messages": [],
        "_diagram_sent": False,
    }
    turn_task: asyncio.Task | None = None
    recv_task = asyncio.create_task(websocket.receive_text())

    try:
        while True:
            wait_set = {recv_task}
            if turn_task and not turn_task.done():
                wait_set.add(turn_task)

            done, _ = await asyncio.wait(wait_set, return_when=asyncio.FIRST_COMPLETED)

            if turn_task in done:
                try:
                    await turn_task
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.error(f"Turn error: {e}", exc_info=True)
                    await _send(websocket, {"type": "error", "content": str(e)})
                turn_task = None
                if recv_task not in done:
                    continue

            if recv_task not in done:
                continue

            try:
                raw = recv_task.result()
            except WebSocketDisconnect:
                raise
            recv_task = asyncio.create_task(websocket.receive_text())

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, {"type": "error", "content": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "interrupt":
                if turn_task and not turn_task.done():
                    turn_task.cancel()
                    try:
                        await turn_task
                    except (asyncio.CancelledError, Exception):
                        pass
                    turn_task = None
                session_state["agent_state"] = "PAUSED"
                await _send(websocket, {"type": "control", "action": "paused"})
                continue

            if msg_type == "audio":
                audio_b64 = msg.get("data", "")
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                except Exception:
                    await _send(websocket, {"type": "error", "content": "Bad audio payload"})
                    continue
                transcribed = await stt.transcribe(audio_bytes)
                logger.info(f"STT: {transcribed[:80]}")

                from langchain_core.messages import HumanMessage
                session_state["messages"].append(HumanMessage(content=transcribed))
                await _send(websocket, {
                    "type": "control",
                    "action": "transcribed",
                    "text": transcribed,
                })

            elif msg_type == "text":
                text = msg.get("content", "")
                if not str(text).strip():
                    continue
                from langchain_core.messages import HumanMessage
                session_state["messages"].append(HumanMessage(content=text))

            elif msg_type == "control":
                action = msg.get("action")
                if action == "start_topic":
                    session_state["current_topic_id"] = msg.get("topic_id", "py_01")
                    session_state["current_topic_title"] = msg.get("topic_title", "Introduction")
                    session_state["_diagram_sent"] = False
                elif action == "next_topic":
                    await _send(websocket, {"type": "control", "action": "topic_complete"})
                    continue
                session_state["agent_state"] = "TEACHING"

            else:
                continue

            # Last 3 exchanges (~6 messages) for prompt; sliding window cap 10
            msgs = session_state.get("messages") or []
            if len(msgs) > 10:
                session_state["messages"] = msgs[-6:]
            elif len(msgs) > 6:
                session_state["messages"] = msgs[-6:]

            if turn_task and not turn_task.done():
                turn_task.cancel()
                try:
                    await turn_task
                except (asyncio.CancelledError, Exception):
                    pass

            turn_task = asyncio.create_task(
                _run_turn(
                    websocket,
                    orchestrator,
                    gemini,
                    session_state,
                    msg_type,
                    bool(session_state.get("_diagram_sent")),
                )
            )

    except WebSocketDisconnect:
        logger.info(f"WS disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WS error: {e}", exc_info=True)
        try:
            await _send(websocket, {"type": "error", "content": str(e)})
        except Exception:
            pass
    finally:
        if turn_task and not turn_task.done():
            turn_task.cancel()
        if recv_task and not recv_task.done():
            recv_task.cancel()


async def _run_turn(
    websocket: WebSocket,
    orchestrator,
    gemini: GeminiClient,
    session_state: dict,
    msg_type: str,
    diagram_sent: bool,
) -> None:
    """One teaching/Q&A turn — cancellable, no blocking receive."""
    result = await orchestrator.ainvoke(session_state)
    session_state.update(result)

    response_text = result.get("generated_text", "") or ""
    pending_diagram = result.get("pending_diagram", "") or ""
    pending_code = result.get("pending_code", "") or _extract_code(response_text)

    if not response_text:
        await _send(websocket, {
            "type": "text",
            "content": "Oru nimisham — AI ready aagudhu, thirumba try pannunga.",
            "word_index": 0,
            "total_words": 1,
        })
        await _send(websocket, {"type": "control", "action": "lesson_done"})
        return

    await asyncio.gather(
        _stream_text(websocket, response_text),
        _stream_tts(websocket, gemini, response_text),
    )

    if pending_code:
        await _send(websocket, {"type": "code", "content": pending_code})
        session_state["pending_code"] = ""

    sent_flag = session_state.get("_diagram_sent", diagram_sent)
    if not pending_diagram and not sent_flag:
        try:
            diag_result = await generate_diagram_node(session_state)
            pending_diagram = diag_result.get("pending_diagram", "") or ""
            session_state["pending_diagram"] = pending_diagram
        except Exception as e:
            logger.warning(f"Diagram generation skipped: {e}")

    if pending_diagram:
        await _send(websocket, {
            "type": "diagram",
            "content": pending_diagram,
        })
        session_state["pending_diagram"] = ""
        session_state["_diagram_sent"] = True

    await _send(websocket, {"type": "control", "action": "lesson_done"})

    # Keep a compact, real conversation window: the user message was appended
    # before this task started and this assistant response completes the exchange.
    # The receive loop trims it to the most recent three exchanges (six messages).
    try:
        from langchain_core.messages import AIMessage
        session_state["messages"].append(AIMessage(content=response_text))
    except Exception:
        logger.debug("Could not persist assistant message for this turn")

    if result.get("agent_state") == "TEACHING" and msg_type in ("audio", "text"):
        await _send(websocket, {"type": "control", "action": "resume"})


def _extract_code(text: str) -> str:
    """Pull the first Python fenced block from a lesson, if any."""
    match = _CODE_FENCE.search(text or "")
    return match.group(1).strip() if match else ""


async def _send(ws: WebSocket, data: dict) -> None:
    """Send JSON message to frontend."""
    try:
        await ws.send_text(json.dumps(data))
    except Exception:
        pass


async def _stream_text(ws: WebSocket, text: str) -> None:
    """Stream text word by word to frontend for karaoke-style display."""
    words = text.split()
    total = len(words)
    for i, word in enumerate(words):
        await _send(ws, {
            "type": "text",
            "content": word + (" " if i < total - 1 else ""),
            "word_index": i,
            "total_words": total,
        })
        await asyncio.sleep(0.05)


async def _stream_tts(ws: WebSocket, gemini: GeminiClient, text: str) -> None:
    """
    Generate TTS audio in ~2-sentence batches (not per-word).
    Lower latency than waiting for the full lesson; cheaper than per-sentence.
    """
    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]
    if not sentences:
        return

    batches: list[str] = []
    buf: list[str] = []
    for sentence in sentences:
        buf.append(sentence)
        if len(buf) >= 2:
            batches.append(" ".join(buf))
            buf = []
    if buf:
        batches.append(" ".join(buf))

    for batch in batches:
        try:
            audio_bytes = await gemini.generate_tts_audio(batch)
            if not audio_bytes:
                continue
            audio_b64 = base64.b64encode(audio_bytes).decode()
            await _send(ws, {
                "type": "audio",
                "data": audio_b64,
                "text": batch,
            })
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning(f"TTS failed for batch: {e}")
