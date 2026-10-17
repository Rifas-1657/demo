# Bookey Python Course Style Guide

**Extracted from Chapter 1-2 (approved content)**

This document defines the writing style, structure, and constraints for Python course page generation. All generated pages must follow these patterns exactly.

---

## 1. LANGUAGE: TANGLISH NARRATION

### What is Tanglish?
A natural mix of Tamil (written in Tamil script) and English (written in Latin script), used by Tamil speakers in everyday conversation.

### Rules
- **Conversational Tamil** for explanations, connectors, and everyday language
- **English technical terms** stay in Latin script: `variable`, `function`, `loop`, `list`, `int`, `float`, `str`, `bool`, `type()`, `print()`, `input()`, `assignment operator`, `snake_case`, etc.
- **No translation** of technical terms to Tamil
- **Natural code-switching**: Just like how Tamil speakers naturally say "variable-ku value assign pannuvom" in conversation

### Examples from approved content

✅ **Good:**
```
"Variable-u nu solluvadhukku Python-la oru name-ku value assign pannuvom."
"Python-la neenga type-a solla venaam, value-a paarthu Python thaanaaga kandupidichidum."
"Doubt vandha type() function use pannunga, adhu type-a kaattum."
```

❌ **Bad:**
- Pure Tamil technical terms: "மாறி" instead of "variable"
- Pure English narration without Tamil
- Awkward or unnatural mixing

---

## 2. SENTENCE STRUCTURE

### Length and Pace
- **Narration word count**: 120–200 words (STRICT — verified by system)
- **Sentence length**: 15–25 words average
- **Pace**: Conversational, like explaining to a friend sitting next to you
- **Tone**: Patient, encouraging, practical

### Patterns from approved content
1. **Start with context**: "Ippo variable-ku peru vaikkura rules paarkalaam"
2. **Explain one idea**: "Peru oru letter-la illa underscore-la thaan start aaganum"
3. **Give concrete examples**: "2player thappu, player2 sari"
4. **Connect to next step**: "Idhai purinjikittaa, aduthu varra chapter-la..."

### Avoid
- ❌ Long academic sentences (>30 words)
- ❌ Multiple clauses in one sentence
- ❌ Passive voice
- ❌ Jargon without explanation

---

## 3. ANALOGIES

Every page MUST include **two analogies**: one from **cricket**, one from **movies**. (A third "neutral" analogy is optional but not required for generation.)

### Cricket Analogies
Use familiar cricket concepts: scoreboard, overs, boundaries, fielding positions, runs, wickets, innings.

**Examples:**
```json
"cricket": "A variable is the scoreboard: the label says 'Runs', the number on it changes as the match goes on."
"cricket": "Integer division is like overs: 10 balls bowled // 6 = 1 complete over, 10 % 6 = 4 balls remaining."
"cricket": "A boolean is like an umpire's decision: Out or Not Out. No middle ground."
```

### Movie Analogies
Use familiar film concepts: actors, scenes, reels, dubbing, editing, box office, characters, roles.

**Examples:**
```json
"movies": "A variable is the name on a seat in a theatre: the name stays, and the person sitting there can change."
"movies": "Re-assigning is a recast: the role name stays the same, but a different actor now plays it."
"movies": "True/False is like a movie's box-office result: hit or flop, based on a threshold."
```

### Quality Standards
- ✅ Concrete and visual
- ✅ One-sentence format
- ✅ Uses familiar concepts
- ❌ Abstract or confusing metaphors
- ❌ Multi-step analogies

---

## 4. PAGE STRUCTURE

Every generated page MUST include these components in this order:

### A. Narration (Tanglish)
- 120–200 words (STRICT)
- Explains the concept in conversational Tanglish
- Refers to code examples and diagram elements
- Encourages the learner to try variations

### B. Segments (6–10 per page)
Each segment has:
- **Unique ID** (e.g., "seg-1", "seg-2")
- **Type**: `explanation`, `code`, `practice`, `diagram_ref`, or `quiz`
- **Text**: English paragraph (for explanation segments)
- **Cues**: 6–10 cues total across all segments (see section 5)

### C. Code Block
- **Language**: `"python"` only
- **Source**: 3–8 lines of runnable Python
- **Expected output**: Exact stdout string (WILL BE VERIFIED by sandbox execution)
- **Runnable**: `true`

**Code quality standards:**
- ✅ Clear variable names (avoid `a`, `b`, `c`)
- ✅ Demonstrates one concept clearly
- ✅ Uses `print()` to show output
- ✅ 3–8 lines (not too short, not overwhelming)
- ❌ No input() in generated code (can be in practice prompts)
- ❌ No imports unless absolutely necessary
- ❌ No error-inducing code (unless teaching error handling)

### D. Diagram
- **Nodes**: 3–6 nodes with unique IDs, labels, positions (x: 0–800, y: 0–600)
- **Edges**: 0–4 edges connecting nodes
- **Steps**: 0–5 animation steps tied to narration cues
- **Purpose**: Visual representation of the concept (memory boxes, flow diagrams, type relationships)

### E. Practice Prompts (2 per page)
- One **easy**: Direct modification ("Change x = 10 to x = 25...")
- One **medium**: Extension or prediction ("Predict the output if line 2 becomes...")
- Format: Clear instruction that builds on the code example
- No **hard** prompts in early chapters

### F. Key Terms (3–7)
English technical terms highlighted in the narration, e.g., `["variable", "labeled box", "value"]`

### G. Citations
- If knowledge base documents are retrieved, cite them with `chunk_id`, `document_id`, and optionally a short `quote`
- If no KB documents used, citations array is empty `[]`

---

## 5. CUES (SYNCHRONIZATION POINTS)

Cues tie narration words to visual elements on the page. Every page MUST have **6–10 cues**.

### Cue Format
```json
{
  "atWord": "variable",      // word in narration text (can be string or integer position)
  "action": "highlight",     // highlight | animate | scroll | pulse | reveal | focus-node | focus-code-line
  "targetId": "seg-1"        // must match a segment.id or diagram node.id
}
```

### Rules
- ✅ Every `targetId` MUST exist in segments or diagram nodes (VALIDATED by schema)
- ✅ Spread cues evenly across the narration
- ✅ Use `highlight-term` for key terms, `focus-node` for diagram nodes, `focus-code-line` for code lines
- ❌ No dangling cue targets (system will reject)

### Examples from approved content
```json
{"id": "c1", "atWord": 5, "kind": "highlight-term", "target": "variable"},
{"id": "c3", "atWord": 22, "kind": "focus-node", "target": "x"},
{"id": "c7", "atWord": 60, "kind": "focus-code-line", "target": "2"}
```

---

## 6. DIAGRAM SPECIFICATIONS

### Node Placement
- **Canvas**: 800 × 600 pixels
- **Node size**: width 80–300, height 30–80
- **Spacing**: Leave 40–60px between nodes
- **Common layouts**:
  - **Variable boxes**: 3–4 horizontal boxes showing name → value
  - **Flow diagrams**: Vertical flow with arrows showing steps
  - **Type relationships**: Grid of types with properties

### Node Schema
```json
{
  "id": "unique-id",
  "label": "Variable x",
  "x": 100,  // 0–800
  "y": 100,  // 0–600
  "w": 120,  // 80–300
  "h": 40,   // 30–80
  "caption": "optional subtitle",
  "value": "optional value display",
  "tone": "highlight | valid | invalid | muted"
}
```

### Edge Schema
```json
{
  "from": "node1-id",
  "to": "node2-id",
  "label": "stores"
}
```
- ✅ Both `from` and `to` must reference existing node IDs (VALIDATED)

---

## 7. WHAT THE TUTOR MUST NOT DO

Generated content must NEVER include:

❌ **Unverified claims**: Every fact must be verifiable or cite a source  
❌ **Non-Python content**: No JavaScript, Java, C++, or other languages  
❌ **Unrunnable code**: All code blocks must execute without error  
❌ **Wrong expected output**: System will verify actual output matches expected  
❌ **Security anti-patterns**: No hardcoded passwords, SQL injection examples, or unsafe file operations  
❌ **Discourag ing tone**: No "this is hard", "you might not get this", or negative language  
❌ **Off-topic content**: Stay focused on the page topic  
❌ **Incomplete explanations**: Every concept introduced must be explained  

---

## 8. GENERATION CHECKLIST

Before submitting a page, verify:

- [ ] **Language**: Tanglish narration with English technical terms
- [ ] **Word count**: 120–200 words
- [ ] **Analogies**: One cricket, one movie analogy
- [ ] **Cues**: 6–10 cues, all targets exist
- [ ] **Code**: 3–8 lines, runnable, expected output correct
- [ ] **Diagram**: 3–6 nodes, positioned in bounds, edges valid
- [ ] **Practice**: 2 prompts (easy + medium)
- [ ] **Key terms**: 3–7 technical terms
- [ ] **Citations**: All KB-sourced claims cited
- [ ] **No forbidden content**: Python only, factually correct, encouraging tone

---

## 9. EXAMPLE FULL PAGE OUTLINE

**Title**: "What is a variable?"

**Narration** (151 words in Tanglish):
Explains variable concept, labeled box analogy, memory storage, gives examples, encourages trying the code.

**Segments**:
1. Explanation segment with cues
2. Code segment: `x = 10\nprint(x)\nprint(type(x))` → `"10\n<class 'int'>"`
3. Practice segment with prompts

**Diagram**: Variable-box visualization showing x → 10 → memory flow

**Cues**: 8 cues spread across narration

**Practice Prompts**:
1. "Change x = 10 to x = 25, run the code, and say what print(x) shows." (easy)
2. "Add a second variable y = 3 and print it next to x." (medium)

**Analogies**:
- Cricket: "A variable is the scoreboard: the label says 'Runs', the number on it changes..."
- Movie: "A variable is the name on a seat in a theatre: the name stays, and the person sitting there can change."

**Key terms**: `["variable", "labeled box", "value"]`

**Citations**: `[]` (no KB documents used for this basic concept)

---

## 10. COMMON MISTAKES TO AVOID

From B3 testing and repair loops:

1. **Dangling cue target**: Cue references "seg-99" but no segment has that ID → REJECTED
2. **Wrong output**: Code prints `10` but expected_output is `"12"` → REJECTED by sandbox
3. **Narration too short**: Only 80 words → REJECTED (min 120)
4. **Narration too long**: 250 words → REJECTED (max 200)
5. **Diagram out of bounds**: Node at x=900 → REJECTED (max 800)
6. **Duplicate IDs**: Two nodes both id="n1" → REJECTED
7. **Missing analogy**: Only cricket analogy provided → REJECTED (need both)
8. **No code example**: Page has no executable code → REJECTED (every page needs runnable code)

---

## 11. QUALITY STANDARDS

### Technically Correct
- All Python syntax is valid
- All claims are verifiable or cited
- All code executes and produces stated output

### Tanglish Natural
- Reads like spoken conversation
- No awkward code-switching
- Technical terms feel integrated

### No Off-Topic Content
- Every sentence relates to the page topic
- No tangents or unrelated examples
- Stays within chapter scope

---

**End of Style Guide**

This document is the authoritative reference for all Python course content generation. Any generated page that violates these rules will be rejected by the verification pipeline.
