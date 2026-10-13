"""
IqraBook — LangGraph Orchestrator
State machine: TEACHING → PAUSED → ANSWERING → RESUMING

Token optimization:
- Use Groq Llama for fast/cheap tasks (classification, Q&A)
- Use Gemini Flash ONLY for lesson content (needs RAG context)
- Sliding window context (last 10 turns max) to reduce tokens
- Topic-scoped RAG: only retrieve for current topic (3 chunks max)
"""
from __future__ import annotations

from typing import Annotated, AsyncGenerator, Literal
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
import json
import logging
import re

logger = logging.getLogger(__name__)


# ── State Definition ──────────────────────────────────────────────

class IqraState(TypedDict):
    """Full state passed between all LangGraph nodes."""
    messages: Annotated[list, add_messages]       # Conversation history
    session_id: str
    user_id: str
    course_id: int
    current_topic_id: str
    current_topic_title: str
    rag_context: str                              # Retrieved RAG chunks
    generated_text: str                           # Current lesson text
    pending_diagram: str                          # Mermaid syntax if needed
    pending_code: str                             # Code example if needed
    agent_state: Literal[
        "TEACHING", "PAUSED", "ANSWERING", "RESUMING", "CODING", "COMPLETED"
    ]
    rl_action: str                                # RL decision for content style
    interests: list[str]                          # For personalized examples
    preferred_examples: str


# ── Node Functions ────────────────────────────────────────────────

async def classify_intent_node(state: IqraState) -> dict:
    """
    Use Groq Llama (fast, cheap) to classify latest user message.
    Token cost: ~50 tokens per call.
    """
    from app.core.groq_client import GroqClient
    from app.core.config import settings

    if not state["messages"]:
        return {"agent_state": "TEACHING"}

    last_msg = state["messages"][-1]
    if hasattr(last_msg, "content"):
        user_text = last_msg.content
    else:
        user_text = str(last_msg)

    client = GroqClient(settings.GROQ_API_KEY)
    result = await client.classify_intent(user_text)
    intent = result.get("intent", "CONTINUE")

    state_map = {
        "QA": "PAUSED",
        "CONTINUE": "TEACHING",
        "DIAGRAM": "TEACHING",
        "OFF_TOPIC": "TEACHING",
    }

    return {"agent_state": state_map.get(intent, "TEACHING")}


async def retrieve_context_node(state: IqraState) -> dict:
    """
    RAG retrieval — get 3 relevant chunks for current topic.
    Token optimization: max 3 chunks, ~300 tokens total.
    Only called when starting a new topic (not every message).
    """
    try:
        from app.rag.vectorstore import ChromaManager
        manager = ChromaManager()
        query = f"{state['current_topic_title']} python tutorial"
        chunks = await manager.similarity_search(
            query=query,
            course_id=str(state["course_id"]),
            top_k=3,
        )
        context = "\n\n".join(chunks) if chunks else ""
        return {"rag_context": context}
    except Exception as e:
        logger.warning(f"RAG retrieval failed: {e}")
        return {"rag_context": ""}


async def generate_lesson_node(state: IqraState) -> dict:
    """
    Generate lesson content using Gemini Flash.
    Token optimization:
    - System prompt: ~200 tokens (constant, cached)
    - RAG context: ~300 tokens (3 chunks)
    - User context: ~100 tokens
    - Total input: ~600 tokens per lesson chunk
    """
    from app.core.gemini_client import GeminiClient
    from app.core.config import settings

    client = GeminiClient(settings.GEMINI_API_KEY)

    # Build token-efficient prompt
    interests_str = ", ".join(state.get("interests", [])) or "general examples"
    rl_action = state.get("rl_action", "balanced")

    # Adapt teaching style based on RL action
    style_instruction = {
        "increase_detail": "Detailed explanation, step by step.",
        "decrease_detail": "Simple, short explanation.",
        "add_quiz": "Include a quick quiz question at the end.",
        "more_diagrams": "Mention that a diagram will be shown. Request mermaid diagram.",
        "add_example": f"Use {state.get('preferred_examples', 'real-world')} examples.",
        "simplify": "Explain in the simplest possible way.",
    }.get(rl_action, "Balanced explanation.")

    system = (
        "You are IqraBook's AI tutor. Teach in Tanglish (Tamil + English mixed). "
        "Example style: 'Intha variable concept romba simple — oru box maari nenachuko.' "
        "Keep responses conversational, warm, encouraging. Max 150 words per chunk. "
        "ONLY teach Python-related content. Refuse all other topics politely in Tanglish."
    )

    prompt = (
        f"Topic: {state['current_topic_title']}\n"
        f"Teaching style: {style_instruction}\n"
        f"Use examples related to: {interests_str}\n\n"
        f"Course context:\n{state.get('rag_context', '')[:500]}\n\n"  # limit context
        "Teach this topic now in Tanglish. Be natural and conversational."
    )

    chunks = []
    async for chunk in client.generate_text_stream(prompt, system):
        chunks.append(chunk)

    text = "".join(chunks)
    pending_code = ""
    match = re.search(r"```(?:python)?\s*\n(.*?)```", text or "", re.DOTALL | re.IGNORECASE)
    if match:
        pending_code = match.group(1).strip()
    return {
        "generated_text": text,
        "pending_code": pending_code,
        "agent_state": "TEACHING",
    }


async def generate_diagram_node(state: IqraState) -> dict:
    """
    Generate Mermaid diagram for current topic.
    Token cost: ~200 tokens input, ~100 tokens output.
    """
    from app.core.gemini_client import GeminiClient
    from app.core.config import settings

    client = GeminiClient(settings.GEMINI_API_KEY)

    prompt = (
        f"Generate a simple Mermaid.js diagram for: {state['current_topic_title']}\n"
        "Output ONLY valid mermaid syntax. No explanation. No markdown fences.\n"
        "Example: flowchart TD\n  A[Start] --> B[Variables]\n  B --> C[Print]"
    )

    chunks = []
    async for chunk in client.generate_text_stream(prompt):
        chunks.append(chunk)

    diagram = "".join(chunks).strip()
    # Clean up if model added fences
    if "```" in diagram:
        lines = diagram.split("\n")
        diagram = "\n".join(
            l for l in lines if not l.startswith("```")
        )

    low = diagram.lower()
    if not diagram or ("graph" not in low and "flowchart" not in low):
        diagram = "graph TD\n A[Python] --> B[Variables]\n B --> C[Functions]"

    return {"pending_diagram": diagram}


async def answer_question_node(state: IqraState) -> dict:
    """
    Answer user's question using Groq Llama (fast).
    Token optimization: only use RAG if needed, Groq for speed.
    """
    from app.core.groq_client import GroqClient
    from app.core.config import settings

    if not state["messages"]:
        return {"agent_state": "RESUMING"}

    last_msg = state["messages"][-1]
    question = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

    client = GroqClient(settings.GROQ_API_KEY)

    system = (
        "You are IqraBook's AI tutor. Answer ONLY Python-related questions in Tanglish. "
        "If question is off-topic, say 'Adhu Python related illai — Python pathi kekanum!' "
        "Keep answers short and clear. Max 80 words."
    )

    try:
        answer = await client.generate_fast(
            prompt=f"Student question: {question}\nTopic context: {state['current_topic_title']}",
            system=system,
        )
    except Exception as e:
        logger.warning(f"Groq Q&A failed, using fallback: {e}")
        answer = (
            "Oru second — network slow-a iruku. Question nalla iruku! "
            "Python pathi continue pannalam, thirumba kekunga."
        )

    return {
        "generated_text": answer,
        "agent_state": "RESUMING",
    }


async def resume_teaching_node(state: IqraState) -> dict:
    """Resume teaching after Q&A — keep the answer, then continue."""
    prev = (state.get("generated_text") or "").strip()
    resume_msg = (
        "Seri, question clear-a? Good! Naama continue pannalam — "
        f"{state['current_topic_title']} pathi idhu varaikkum paathom. "
        "Next part paarkalamey?"
    )
    combined = f"{prev}\n\n{resume_msg}" if prev else resume_msg
    return {"generated_text": combined, "agent_state": "TEACHING"}


# ── Routing Logic ─────────────────────────────────────────────────

def route_after_classify(state: IqraState) -> str:
    """Route to appropriate node based on classified intent."""
    agent_state = state.get("agent_state", "TEACHING")
    if agent_state == "PAUSED":
        return "answer_question"
    return "retrieve_context"


def route_after_teaching(state: IqraState) -> str:
    """After teaching, check if we need a diagram."""
    if state.get("pending_diagram"):
        return END
    return END


# ── Build Graph ───────────────────────────────────────────────────

def build_orchestrator() -> StateGraph:
    """Build and compile the IqraBook LangGraph orchestrator."""
    graph = StateGraph(IqraState)

    # Add nodes
    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("retrieve_context", retrieve_context_node)
    graph.add_node("generate_lesson", generate_lesson_node)
    graph.add_node("generate_diagram", generate_diagram_node)
    graph.add_node("answer_question", answer_question_node)
    graph.add_node("resume_teaching", resume_teaching_node)

    # Set entry point
    graph.set_entry_point("classify_intent")

    # Conditional routing after classification
    graph.add_conditional_edges(
        "classify_intent",
        route_after_classify,
        {
            "answer_question": "answer_question",
            "retrieve_context": "retrieve_context",
        },
    )

    # Linear teaching flow
    graph.add_edge("retrieve_context", "generate_lesson")
    graph.add_edge("generate_lesson", END)

    # Q&A flow → resume
    graph.add_edge("answer_question", "resume_teaching")
    graph.add_edge("resume_teaching", END)

    # Diagram (triggered separately)
    graph.add_edge("generate_diagram", END)

    return graph.compile()


# Singleton compiled graph
_orchestrator = None

def get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = build_orchestrator()
    return _orchestrator
