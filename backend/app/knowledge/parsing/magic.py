"""
app/knowledge/parsing/magic.py

Magic-byte verification for the four allowed document types.
Never trust extensions alone — verify file signatures.

Signatures:
  PDF  : %PDF  (25 50 44 46)
  DOCX : PK zip magic (50 4B 03 04)  — Office Open XML is a ZIP
  MD   : UTF-8 text (no magic; heuristic: printable ASCII)
  TXT  : UTF-8 text (same heuristic)

MIME types we declare for each:
  PDF  → application/pdf
  DOCX → application/vnd.openxmlformats-officedocument.wordprocessingml.document
  MD   → text/markdown
  TXT  → text/plain
"""
from __future__ import annotations

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}
ALLOWED_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/markdown",
    "text/plain",
}

_PDF_MAGIC  = b"%PDF"
_DOCX_MAGIC = b"PK\x03\x04"     # ZIP magic (OOXML)


def detect_mime(header: bytes) -> str | None:
    """
    Detect MIME type from the first 512 bytes of file content.
    Returns the MIME string or None if not recognized/allowed.
    """
    if header[:4] == _PDF_MAGIC:
        return "application/pdf"
    if header[:4] == _DOCX_MAGIC:
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    # Text heuristic: if first 512 bytes are mostly printable UTF-8, treat as text
    try:
        sample = header[:512].decode("utf-8", errors="strict")
        # Reject if high fraction of control chars (binary data)
        ctrl = sum(1 for c in sample if ord(c) < 9 or (11 <= ord(c) < 32))
        if ctrl / max(len(sample), 1) < 0.05:
            return "text/plain"  # caller refines to text/markdown by extension
    except UnicodeDecodeError:
        pass
    return None


def verify_magic(data: bytes, filename: str) -> tuple[bool, str, str | None]:
    """
    Verify magic bytes and return (ok, mime, error_message).
    Also maps text/plain + .md extension → text/markdown.
    """
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, "", f"File extension '{ext}' is not allowed. Use: pdf, docx, md, txt"

    header = data[:512]
    detected = detect_mime(header)

    if detected is None:
        return False, "", "File content does not match any allowed type (PDF, DOCX, MD, TXT)"

    # Reclassify plain text as markdown when extension says so
    if detected == "text/plain" and ext == ".md":
        detected = "text/markdown"

    # Cross-check: extension must agree with detected magic
    ext_to_expected = {
        ".pdf":  "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".md":   "text/markdown",
        ".txt":  "text/plain",
    }
    expected = ext_to_expected[ext]
    if detected != expected:
        return False, "", (
            f"File extension '{ext}' does not match file content "
            f"(detected: {detected})"
        )

    return True, detected, None
