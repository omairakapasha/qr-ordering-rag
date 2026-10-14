import os
import asyncio
import logging
from contextlib import asynccontextmanager
from time import monotonic
from typing import Optional

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from openai import AsyncOpenAI, APIConnectionError, APIStatusError
from agents import Agent, Runner
from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel
from agents import set_tracing_disabled

set_tracing_disabled(True)

logger = logging.getLogger("ai-chat")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
INTERNAL_API_SECRET = os.environ.get("INTERNAL_API_SECRET", "")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
LOCAL_LLM_MODEL = os.environ.get("LOCAL_LLM_MODEL", "llama3.2:3b")
GEMINI_MODEL = "gemini-3.5-flash"
CURRENCY_SYMBOL = os.environ.get("CURRENCY_SYMBOL", "QAR")

# Primary backend: Gemini (cloud). A short *connect* timeout with no retries means
# that when the internet is down the request fails within ~3s and we fall straight
# through to the local model. The longer read timeout still allows normal Gemini
# generation latency when online, so a slow-but-reachable Gemini never triggers a
# false fallback.
gemini_client: Optional[AsyncOpenAI] = (
    AsyncOpenAI(
        api_key=GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        timeout=httpx.Timeout(30.0, connect=3.0),
        max_retries=0,
    )
    if GEMINI_API_KEY
    else None
)

# Fallback backend: a local model served by Ollama's OpenAI-compatible API.
# Available whenever the Ollama server is running on the box — no internet needed.
local_client: AsyncOpenAI = AsyncOpenAI(
    api_key="ollama",  # Ollama ignores this, but the SDK requires a non-empty value.
    base_url=f"{OLLAMA_BASE_URL}/v1",
)

db_pool: Optional[asyncpg.Pool] = None

_MENU_TTL = 60.0  # seconds
_menu_cache: list[dict] = []
_menu_cache_expires: float = 0.0

# Per-session conversation history: last 5 exchanges (10 messages)
_HISTORY_MAX_TURNS = 5
_SESSION_TTL = 3600.0  # prune sessions idle for 1 hour
_MAX_SESSIONS = 500
_chat_histories: dict[str, list] = {}
_chat_history_times: dict[str, float] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

    yield

    if db_pool:
        await db_pool.close()


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    if db_pool is None:
        db_status = "starting"
    else:
        try:
            await db_pool.fetchval("SELECT 1")
            db_status = "ok"
        except Exception:
            db_status = "error"

    # Cheap reachability probe for the local model server (bounded so a down
    # Ollama can't hang the health check).
    local_status = "unreachable"
    try:
        await asyncio.wait_for(local_client.models.list(), timeout=2.0)
        local_status = "ok"
    except Exception:
        local_status = "unreachable"

    gemini_status = "configured" if gemini_client is not None else "absent"
    overall = "ok" if db_status == "ok" else ("starting" if db_status == "starting" else "degraded")
    return {
        "status": overall,
        "db": db_status,
        "gemini": gemini_status,
        "local_llm": local_status,
    }


def _get_history(session_id: str) -> list:
    now = monotonic()
    last = _chat_history_times.get(session_id, 0.0)
    if session_id and (now - last) > _SESSION_TTL:
        _chat_histories.pop(session_id, None)
        _chat_history_times.pop(session_id, None)
    return list(_chat_histories.get(session_id, []))


def _save_history(session_id: str, history: list) -> None:
    if not session_id:
        return
    trimmed = history[-(2 * _HISTORY_MAX_TURNS):]
    _chat_histories[session_id] = trimmed
    _chat_history_times[session_id] = monotonic()
    # Prune oldest sessions if over limit
    if len(_chat_histories) > _MAX_SESSIONS:
        oldest = sorted(_chat_history_times.items(), key=lambda x: x[1])
        for sid, _ in oldest[: _MAX_SESSIONS // 2]:
            _chat_histories.pop(sid, None)
            _chat_history_times.pop(sid, None)


class ChatRequest(BaseModel):
    message: str
    sessionId: str = ""


class ChatResponse(BaseModel):
    reply: str
    backend: str = ""  # "gemini" (cloud primary) or "local" (offline fallback)


async def _get_menu() -> list[dict]:
    global _menu_cache, _menu_cache_expires
    if monotonic() < _menu_cache_expires:
        return _menu_cache
    _menu_cache = await _fetch_menu()
    _menu_cache_expires = monotonic() + _MENU_TTL
    return _menu_cache


async def _fetch_menu() -> list[dict]:
    rows = await db_pool.fetch(
        """
        SELECT name, description, price::text, category,
               is_vegetarian, spice_level, allergens, popular
        FROM menu_items
        WHERE archived = false AND available = true
        ORDER BY category, name
        """
    )
    return [dict(row) for row in rows]


def _format_menu(items: list[dict]) -> str:
    if not items:
        return "No items currently available."
    spice_labels = {1: "mild spice", 2: "medium spice", 3: "very spicy"}
    lines: list[str] = []
    current_cat: Optional[str] = None
    for item in items:
        if item["category"] != current_cat:
            current_cat = item["category"]
            lines.append(f"\n{current_cat}:")
        flags: list[str] = []
        if item["is_vegetarian"]:
            flags.append("vegetarian")
        spice = spice_labels.get(item["spice_level"] or 0)
        if spice:
            flags.append(spice)
        if item["popular"]:
            flags.append("popular")
        allergens = item["allergens"] or []
        if allergens:
            flags.append(f"allergens: {', '.join(allergens)}")
        flag_str = f" ({', '.join(flags)})" if flags else ""
        price = float(item["price"])
        desc = f" — {item['description']}" if item.get("description") else ""
        lines.append(f"  - {item['name']}: {CURRENCY_SYMBOL} {price:.0f}{flag_str}{desc}")
    return "\n".join(lines)


def _build_agent(menu_text: str, model: str, client: AsyncOpenAI) -> Agent:
    return Agent(
        name="Menu Assistant",
        instructions=(
            "You are a warm, welcoming, and charismatic waiter for our restaurant! Your goal is to make the customer excited about their meal. "
            "Answer their questions accurately using only the menu below, but describe the food in a mouth-watering, appetizing way. "
            "Be helpful, friendly, and enthusiastic! If something is not on the menu, politely let them know and recommend a delicious alternative from the menu. "
            "Keep answers brief and conversational — 2-3 sentences max.\n\n"
            f"Current menu:\n{menu_text}"
        ),
        model=OpenAIChatCompletionsModel(
            model=model,
            openai_client=client,
        ),
    )


@app.post("/api/ai/menu-chat", response_model=ChatResponse)
async def menu_chat(request: ChatRequest, x_internal_token: str = Header(default="")):
    if INTERNAL_API_SECRET and x_internal_token != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    menu_items = await _get_menu()
    menu_text = _format_menu(menu_items)

    history = _get_history(request.sessionId)
    input_messages = history + [{"role": "user", "content": request.message}]

    reply: Optional[str] = None
    backend = ""

    # Primary: Gemini whenever reachable. Connection failures (internet down),
    # quota (429, an APIStatusError), and upstream 5xx all fall through to local.
    if gemini_client is not None:
        try:
            result = await Runner.run(
                _build_agent(menu_text, GEMINI_MODEL, gemini_client), input_messages
            )
            reply = result.final_output
            backend = "gemini"
        except (APIConnectionError, APIStatusError) as e:
            logger.warning(
                "Gemini unavailable (%s) — falling back to local model", type(e).__name__
            )

    # Fallback: local model via Ollama. This is what keeps the assistant alive
    # when the internet is gone.
    if reply is None:
        try:
            result = await Runner.run(
                _build_agent(menu_text, LOCAL_LLM_MODEL, local_client), input_messages
            )
            reply = result.final_output
            backend = "local"
        except (APIConnectionError, APIStatusError) as e:
            logger.error("Local model unavailable (%s)", type(e).__name__)
            raise HTTPException(
                status_code=503,
                detail="AI assistant is unavailable (no cloud, and no local model running)",
            )

    _save_history(request.sessionId, input_messages + [{"role": "assistant", "content": reply}])
    return ChatResponse(reply=reply, backend=backend)
