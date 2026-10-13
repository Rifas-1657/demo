"""
app/page_gen/schema.py

Pydantic schema for GeneratedPage.

Segments: explanation | code | practice | diagram_ref
Cues: word-level triggers for frontend animations
Diagram: bounded geometry (0-800 x 0-600), node/edge/steps with unique IDs
Code blocks: language, code, expected_output (verified by sandbox)
Practice prompts: difficulty-tagged
Analogies: movie and cricket variants (Tanglish)
Citations: chunk_id + document_id + quote
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Cue(BaseModel):
    at_word: str = Field(alias="atWord", description="Narration word that triggers this cue")
    action: Literal["highlight", "animate", "scroll", "pulse", "reveal"]
    target_id: str = Field(alias="targetId", description="ID of diagram node, code block, or segment")

    model_config = {"populate_by_name": True}


class DiagramNode(BaseModel):
    id: str
    label: str
    x: float = Field(ge=0, le=800)
    y: float = Field(ge=0, le=600)
    w: float = Field(ge=10, le=400)
    h: float = Field(ge=10, le=200)
    style: str = ""   # optional CSS class hint


class DiagramEdge(BaseModel):
    from_id: str = Field(alias="from")
    to_id: str = Field(alias="to")
    label: str = ""
    style: str = ""

    model_config = {"populate_by_name": True}


class DiagramStep(BaseModel):
    step: int = Field(ge=1)
    node_id: str = Field(alias="nodeId")
    description: str

    model_config = {"populate_by_name": True}


class Diagram(BaseModel):
    nodes: list[DiagramNode] = Field(default_factory=list)
    edges: list[DiagramEdge] = Field(default_factory=list)
    steps: list[DiagramStep] = Field(default_factory=list)

    @field_validator("nodes")
    @classmethod
    def node_ids_unique(cls, nodes: list[DiagramNode]) -> list[DiagramNode]:
        ids = [n.id for n in nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("Diagram node IDs must be unique")
        return nodes

    @model_validator(mode="after")
    def edges_reference_valid_nodes(self) -> "Diagram":
        node_ids = {n.id for n in self.nodes}
        for edge in self.edges:
            if edge.from_id not in node_ids:
                raise ValueError(f"Dangling edge from '{edge.from_id}' — node not found")
            if edge.to_id not in node_ids:
                raise ValueError(f"Dangling edge to '{edge.to_id}' — node not found")
        return self

    @model_validator(mode="after")
    def steps_reference_valid_nodes(self) -> "Diagram":
        node_ids = {n.id for n in self.nodes}
        for step in self.steps:
            if step.node_id not in node_ids:
                raise ValueError(f"Step {step.step} references unknown node '{step.node_id}'")
        return self


class Segment(BaseModel):
    id: str
    type: Literal["explanation", "code", "practice", "diagram_ref", "quiz"]
    text: str = ""
    cues: list[Cue] = Field(default_factory=list)
    # Code segments
    code: str = ""
    language: str = "python"
    expected_output: str = ""
    code_verified: bool = False
    # Practice
    practice_prompt: str = ""
    difficulty: Literal["easy", "medium", "hard"] = "easy"


class PracticePrompt(BaseModel):
    id: str
    prompt: str
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    hint: str = ""


class Analogies(BaseModel):
    movie: str = ""
    cricket: str = ""


class Citation(BaseModel):
    chunk_id: str
    document_id: str
    quote: str = ""


# ---------------------------------------------------------------------------
# Top-level GeneratedPage
# ---------------------------------------------------------------------------

class GeneratedPage(BaseModel):
    # Identity
    course_id: str
    chapter: int = Field(ge=1)
    page: int = Field(ge=1)
    content_version: str = "v1"
    personalization_hash: str = ""

    # Content
    title: str
    narration: str = Field(description="Tanglish narration; technical terms stay in English")
    word_count: int = Field(ge=0, default=0)
    segments: list[Segment] = Field(default_factory=list)
    diagram: Diagram = Field(default_factory=Diagram)
    practice_prompts: list[PracticePrompt] = Field(default_factory=list)
    analogies: Analogies = Field(default_factory=Analogies)
    citations: list[Citation] = Field(default_factory=list)

    # Verification status
    verified: bool = False
    verification_errors: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def compute_word_count(self) -> "GeneratedPage":
        if self.word_count == 0 and self.narration:
            self.word_count = len(self.narration.split())
        return self

    @model_validator(mode="after")
    def segment_ids_unique(self) -> "GeneratedPage":
        ids = [s.id for s in self.segments]
        if len(ids) != len(set(ids)):
            raise ValueError("Segment IDs must be unique")
        return self

    @model_validator(mode="after")
    def cue_targets_exist(self) -> "GeneratedPage":
        """Every cue target_id must be a segment ID or diagram node ID."""
        valid = {s.id for s in self.segments} | {n.id for n in self.diagram.nodes}
        errors = []
        for seg in self.segments:
            for cue in seg.cues:
                if cue.target_id not in valid:
                    errors.append(f"Cue target '{cue.target_id}' not found in segments or diagram nodes")
        if errors:
            raise ValueError("; ".join(errors))
        return self
