"""
load_test.py — B6-5: Concurrent load test for Bookey backend.

Opens 4 authenticated WebSocket sessions, each:
  1. Authenticates (REST login → JWT → WS ticket → WS auth_ticket)
  2. Starts a page (start_page)
  3. Waits for session_started + first text_chunk (measures TTFT)
  4. Asks a question (ask_question) and waits for first answer_chunk (TTFA)
  5. Runs through page_complete

Metrics:
  p50 / p95  time-to-first-text (TTFT) — ms
  p50 / p95  time-to-first-audio — ms (if audio frames appear)
  peak RSS memory — MB
  error count

Usage:
  python load_test.py --url http://localhost:8000 --sessions 4 --password <admin_password>

Requires: websockets, httpx, psutil  (pip install websockets httpx psutil)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
import time
import uuid

try:
    import httpx
    import psutil
    import websockets
except ImportError:
    sys.exit(
        "Missing deps. Run: pip install websockets httpx psutil\n"
        "Then retry: python load_test.py"
    )


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

async def login(client: httpx.AsyncClient, url: str, email: str, password: str) -> str:
    """Login and return JWT access token."""
    resp = await client.post(
        f"{url}/api/auth/login",
        json={"email": email, "password": password},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def get_ws_ticket(client: httpx.AsyncClient, url: str, token: str) -> str:
    """Exchange JWT for a single-use WS ticket."""
    resp = await client.post(
        f"{url}/api/ws-ticket",
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json()["ticket"]


# ---------------------------------------------------------------------------
# Single session worker
# ---------------------------------------------------------------------------

async def run_session(
    session_idx: int,
    ws_url: str,
    http_url: str,
    email: str,
    password: str,
    results: list[dict],
) -> None:
    proc = psutil.Process()
    errors = 0
    ttft_ms: float | None = None
    ttfa_ms: float | None = None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token = await login(client, http_url, email, password)
            ticket = await get_ws_ticket(client, http_url, token)

        async with websockets.connect(
            ws_url,
            max_size=4 * 1024 * 1024,
            open_timeout=10,
            close_timeout=5,
        ) as ws:

            # Auth
            await ws.send(json.dumps({"type": "auth_ticket", "payload": {"ticket": ticket}}))
            frame = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if frame.get("type") != "auth_ok":
                errors += 1
                print(f"  [s{session_idx}] auth failed: {frame}")
                return

            # Start page
            t_start_page = time.monotonic()
            await ws.send(json.dumps({
                "v": 2, "type": "start_page",
                "payload": {"courseId": "python", "pageId": "lesson_python_1_1"},
            }))

            # Wait for session_started then first text_chunk
            page_done = False
            question_sent = False
            t_question = 0.0

            async for raw in ws:
                frame = json.loads(raw)
                ftype = frame.get("type")

                if ftype == "text_chunk" and ttft_ms is None:
                    ttft_ms = (time.monotonic() - t_start_page) * 1000
                    print(f"  [s{session_idx}] TTFT = {ttft_ms:.0f}ms")

                if ftype == "text_chunk" and not question_sent and ttft_ms is not None:
                    # Ask a question mid-narration
                    t_question = time.monotonic()
                    await ws.send(json.dumps({
                        "v": 2, "type": "ask_question",
                        "payload": {
                            "sessionId": None, "source": "text",
                            "text": "What is a variable in Python?",
                            "questionId": str(uuid.uuid4()),
                            "context": {
                                "courseId": "python",
                                "pageId": "lesson_python_1_1",
                                "language": "tanglish",
                            },
                        },
                    }))
                    question_sent = True

                if ftype == "answer_chunk" and ttfa_ms is None:
                    ttfa_ms = (time.monotonic() - t_question) * 1000
                    print(f"  [s{session_idx}] TTFA = {ttfa_ms:.0f}ms")

                if ftype == "audio_chunk" and ttfa_ms is None:
                    # First audio (TTS) frame
                    ttfa_ms = (time.monotonic() - t_start_page) * 1000
                    print(f"  [s{session_idx}] TTFA(audio) = {ttfa_ms:.0f}ms")

                if ftype == "page_complete":
                    print(f"  [s{session_idx}] page_complete")
                    page_done = True
                    break

                if ftype == "error":
                    print(f"  [s{session_idx}] server error: {frame}")
                    errors += 1

    except Exception as exc:
        errors += 1
        print(f"  [s{session_idx}] exception: {exc}")

    rss_mb = proc.memory_info().rss / 1024 / 1024
    results.append({
        "session": session_idx,
        "ttft_ms": ttft_ms,
        "ttfa_ms": ttfa_ms,
        "errors": errors,
        "rss_mb": rss_mb,
    })


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def _percentile(data: list[float], p: int) -> float:
    if not data:
        return float("nan")
    data = sorted(data)
    idx = max(0, int(len(data) * p / 100) - 1)
    return round(data[idx], 1)


def print_report(results: list[dict]) -> None:
    ttfts = [r["ttft_ms"] for r in results if r["ttft_ms"] is not None]
    ttfas = [r["ttfa_ms"] for r in results if r["ttfa_ms"] is not None]
    total_errors = sum(r["errors"] for r in results)
    peak_rss = max((r["rss_mb"] for r in results), default=0)

    print("\n" + "=" * 50)
    print("LOAD TEST REPORT")
    print("=" * 50)
    print(f"Sessions:          {len(results)}")
    print(f"Total errors:      {total_errors}")
    print(f"Peak RSS:          {peak_rss:.1f} MB")
    print()
    print(f"TTFT p50:          {_percentile(ttfts, 50):.0f} ms")
    print(f"TTFT p95:          {_percentile(ttfts, 95):.0f} ms")
    print(f"TTFA p50:          {_percentile(ttfas, 50):.0f} ms")
    print(f"TTFA p95:          {_percentile(ttfas, 95):.0f} ms")
    print("=" * 50)

    if total_errors > 0:
        print(f"\nWARNING: {total_errors} errors encountered.")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(args: argparse.Namespace) -> None:
    http_url = args.url.rstrip("/")
    ws_url = http_url.replace("http://", "ws://").replace("https://", "wss://") + "/ws/book"

    print(f"Load test: {args.sessions} sessions → {ws_url}")
    results: list[dict] = []

    tasks = [
        run_session(
            session_idx=i,
            ws_url=ws_url,
            http_url=http_url,
            email=args.email,
            password=args.password,
            results=results,
        )
        for i in range(args.sessions)
    ]
    await asyncio.gather(*tasks)
    print_report(results)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bookey backend load test")
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--sessions", type=int, default=4)
    parser.add_argument("--email", default="admin@bookey.app")
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    asyncio.run(main(args))
