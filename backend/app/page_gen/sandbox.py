"""
app/page_gen/sandbox.py

Isolated Python code execution sandbox.

Rules:
- NEVER runs in the FastAPI process
- Uses subprocess with:
    - 5 second hard timeout (SIGKILL)
    - stdin connected to /dev/null
    - No network (Windows: no equivalent to network namespace; mitigated by not importing network modules)
    - Separate temp dir cleaned up after each run
- Returns (actual_output, error_message)
- If the sandbox is unavailable (no Python executable), returns (None, "sandbox unavailable")
  so the caller can mark the page unverified and block publishing

Windows note:
- Linux resource limits (RLIMIT_*) are not available
- We compensate with process timeout + a restricted code prefix that
  disables common network/file modules via sys.modules patching
"""
from __future__ import annotations

import asyncio
import os
import sys
import tempfile
import textwrap
from pathlib import Path

SANDBOX_TIMEOUT_S = 5
MAX_OUTPUT_BYTES = 8192

# Prefix injected before user code: disables network and dangerous stdlib modules
_SAFETY_PREFIX = textwrap.dedent("""
import sys as _sys
# Block network imports
for _m in ("socket", "urllib", "urllib2", "urllib3", "httpx", "requests",
           "http", "ftplib", "smtplib", "imaplib", "poplib", "telnetlib",
           "xmlrpc", "nntplib", "subprocess", "os.system"):
    _sys.modules.setdefault(_m, type(_sys)(_m))
del _sys, _m
""").strip() + "\n\n"

# Sentinel to separate stdout from stderr in the combined output
_SEP = "__SANDBOX_OUT__"


class SandboxResult:
    def __init__(self, stdout: str, stderr: str, exit_code: int, timed_out: bool) -> None:
        self.stdout = stdout.strip()
        self.stderr = stderr.strip()
        self.exit_code = exit_code
        self.timed_out = timed_out
        self.available = True

    @property
    def success(self) -> bool:
        return self.exit_code == 0 and not self.timed_out


async def run_code(code: str, expected_output: str) -> tuple[str | None, str | None]:
    """
    Execute *code* in isolated subprocess.
    Returns (actual_output, error) where error is None on success.
    Returns (None, "sandbox unavailable") if Python executable cannot be found.
    """
    python = sys.executable
    if not python:
        return None, "sandbox unavailable: no Python executable"

    # Write code to temp file
    with tempfile.TemporaryDirectory(prefix="bookey_sandbox_") as tmpdir:
        code_path = Path(tmpdir) / "code.py"
        safe_code = _SAFETY_PREFIX + code
        code_path.write_text(safe_code, encoding="utf-8")

        try:
            proc = await asyncio.create_subprocess_exec(
                python, str(code_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
                env={
                    "PYTHONPATH": "",
                    "PATH": str(Path(python).parent),
                    "TEMP": tmpdir,
                    "TMP": tmpdir,
                },
            )
            try:
                stdout_b, stderr_b = await asyncio.wait_for(
                    proc.communicate(), timeout=SANDBOX_TIMEOUT_S
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.communicate()
                return None, f"Code execution timed out after {SANDBOX_TIMEOUT_S}s"

            stdout = stdout_b[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")
            stderr = stderr_b[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")
            exit_code = proc.returncode

            if exit_code != 0:
                return None, f"Code exited {exit_code}: {stderr[:400] or stdout[:400]}"

            actual = stdout.strip()
            expected = expected_output.strip()
            if actual != expected:
                return actual, f"Output mismatch: expected {expected!r}, got {actual!r}"

            return actual, None

        except Exception as exc:
            return None, f"sandbox error: {exc}"
