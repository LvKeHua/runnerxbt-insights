"""FastAPI backend serving RunnerXBT with real-time WebSocket support."""
import asyncio
import json
import logging
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ws_hub import WebSocketHub
from classifier import classify_message
from config import DATA_DIR, MEDIA_DIR

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── App Setup ──────────────────────────────────────────────────────
app = FastAPI(title="RunnerXBT Insights", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── WebSocket Hub ──────────────────────────────────────────────────
hub = WebSocketHub()

# ── Telegram Listener (optional - only starts if session exists) ──
listener = None

# ── Level Classification Cache ────────────────────────────────────
_level_cache: dict[int, str] = {}  # msg_id -> level


def classify_messages_batch(messages: list[dict]) -> None:
    """Pre-compute level classification for all messages and cache results."""
    global _level_cache
    for msg in messages:
        msg_id = msg.get("id")
        if msg_id is not None and (msg.get("level") is None or msg.get("level") == ""):
            msg["level"] = classify_message(msg.get("text", ""))
            _level_cache[msg_id] = msg["level"]
        elif msg_id is not None and msg.get("level"):
            _level_cache[msg_id] = msg["level"]


def refresh_cache():
    """Re-classify all messages. Called after data refresh."""
    global _level_cache
    _level_cache.clear()


@app.on_event("startup")
async def startup():
    """Start Telegram listener if session is available and warm classification cache."""
    global listener
    # Warm the classification cache
    try:
        data = load_json(DATA_DIR / "messages_final.json")
        if data:
            classify_messages_batch(data)
            logger.info(f"Classification cache warmed: {len(_level_cache)} messages classified")
    except Exception as e:
        logger.warning(f"Failed to warm classification cache: {e}")
    session_path = Path(__file__).parent.parent / "scraper" / "tg_session"
    if session_path.with_suffix(".session").exists():
        try:
            from telegram_listener import TelegramListener
            listener = TelegramListener(on_message_callback=hub.broadcast)
            asyncio.create_task(listener.start())
            logger.info("Telegram listener started")
        except Exception as e:
            logger.warning("Failed to start Telegram listener: %s. Running without real-time updates.", e)
    else:
        logger.info("No Telegram session found. Running without real-time updates.")


@app.on_event("shutdown")
async def shutdown():
    """Stop Telegram listener."""
    if listener:
        await listener.stop()
        logger.info("Telegram listener stopped")


# ── Serve Media ───────────────────────────────────────────────────
MEDIA_DIR.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")


# ── Helper ────────────────────────────────────────────────────────
def load_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


# ── REST API Endpoints ────────────────────────────────────────────
@app.get("/api/messages")
def get_messages():
    """Get all messages with dates and cleaned media paths."""
    data = load_json(DATA_DIR / "messages_final.json")
    if data is None:
        raise HTTPException(404, "messages_final.json not found")
    # Use cached classification instead of per-request computation
    classify_messages_batch(data)
    return {"total": len(data), "data": data}


@app.get("/api/daily")
def get_daily():
    """Get messages grouped by date."""
    data = load_json(DATA_DIR / "messages_daily_final.json")
    if data is None:
        raise HTTPException(404, "messages_daily_final.json not found")
    return {"total_days": len(data), "data": data}


@app.get("/api/btc")
def get_btc():
    """Get BTC 1D OHLCV data."""
    data = load_json(DATA_DIR / "btc_ohlcv_1d.json")
    if data is None:
        raise HTTPException(404, "btc_ohlcv_1d.json not found")
    return {"symbol": "BTC/USDT", "total": len(data), "data": data}


@app.get("/api/btc4h")
def get_btc4h():
    """Get BTC 4H OHLCV data."""
    data = load_json(DATA_DIR / "btc_ohlcv_4h.json")
    if data is None:
        raise HTTPException(404, "btc_ohlcv_4h.json not found")
    return {"symbol": "BTC/USDT", "total": len(data), "data": data}


@app.get("/api/eth")
def get_eth():
    """Get ETH 1D OHLCV data."""
    data = load_json(DATA_DIR / "eth_ohlcv_1d.json")
    if data is None:
        raise HTTPException(404, "eth_ohlcv_1d.json not found")
    return {"symbol": "ETH/USDT", "total": len(data), "data": data}


@app.get("/api/status")
def get_status():
    """Get overall status summary."""
    msgs = load_json(DATA_DIR / "messages_final.json")
    daily = load_json(DATA_DIR / "messages_daily_final.json")
    btc = load_json(DATA_DIR / "btc_ohlcv_1d.json")
    eth = load_json(DATA_DIR / "eth_ohlcv_1d.json")
    media_count = len(list(MEDIA_DIR.iterdir())) if MEDIA_DIR.exists() else 0

    return {
        "messages": len(msgs) if msgs else 0,
        "days": len(daily) if daily else 0,
        "btc_candles": len(btc) if btc else 0,
        "eth_candles": len(eth) if eth else 0,
        "media_files": media_count,
        "project": "RunnerXBT Insights",
        "updated": datetime.now().isoformat(),
        "ws_connections": hub.active_count,
    }


# ── WebSocket Endpoint ────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time message push."""
    await hub.connect(websocket)
    try:
        while True:
            # Keep connection alive - client can send pings
            data = await websocket.receive_text()
            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await hub.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket error: %s", e)
        await hub.disconnect(websocket)


# ── Frontend Static Files ────────────────────────────────────────
FRONTEND_DIR = DATA_DIR.parent / "frontend"


@app.get("/")
async def serve_index():
    """Serve frontend SPA index.html."""
    # Development: serve Vite dev server (handled by Vite proxy)
    # Production: serve built frontend
    dist_dir = FRONTEND_DIR / "dist"
    if dist_dir.exists():
        return FileResponse(str(dist_dir / "index.html"))
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"message": "RunnerXBT API v2.0 running. Frontend not built yet."}


@app.get("/assets/{path:path}")
async def serve_assets(path: str):
    """Serve frontend assets."""
    dist_dir = FRONTEND_DIR / "dist"
    filepath = dist_dir / "assets" / path
    if filepath.exists() and filepath.is_file():
        return FileResponse(str(filepath))
    raise HTTPException(404, "Asset not found")



# ── RunnerXBT Prefixed Routes (for Cloudflare Tunnel) ─────────────
@app.get('/runnerxbt/api/messages')
def get_messages_prefixed():
    return get_messages()

@app.get('/runnerxbt/api/daily')
def get_daily_prefixed():
    return get_daily()

@app.get('/runnerxbt/api/btc')
def get_btc_prefixed():
    return get_btc()

@app.get('/runnerxbt/api/btc4h')
def get_btc4h_prefixed():
    return get_btc4h()

@app.get('/runnerxbt/api/eth')
def get_eth_prefixed():
    return get_eth()

@app.get('/runnerxbt/api/status')
def get_status_prefixed():
    return get_status()

@app.get('/runnerxbt/api/refresh')
async def refresh_messages_prefixed():
    return await refresh_messages()

@app.get("/api/refresh")
async def refresh_messages():
    """Manually trigger a fetch of new messages from Telegram (catch-up)."""
    session_path = Path(__file__).parent.parent / "scraper" / "tg_session"
    if not session_path.with_suffix(".session").exists():
        raise HTTPException(400, "No Telegram session found. Cannot refresh.")

    try:
        from telethon import TelegramClient
        from telethon.errors import FloodWaitError
        from config import TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_GROUPS, MEDIA_DIR, CLASSIFICATION_RULES
        from classifier import classify_message

        # Read existing messages to find max id
        current = load_json(DATA_DIR / "messages_final.json") or []
        max_id = max((m.get("id", 0) for m in current), default=0)
        existing_ids = {m.get("id") for m in current}

        client = TelegramClient(str(session_path), TELEGRAM_API_ID, TELEGRAM_API_HASH)
        await client.connect()
        if not await client.is_user_authorized():
            await client.disconnect()
            raise HTTPException(400, "Telegram session not authorized. Re-run scraper.")

        new_count = 0
        for group in TELEGRAM_GROUPS:
            if not group.get("enabled", True):
                continue
            try:
                entity = await client.get_entity(group["username"])
                async for msg in client.iter_messages(entity, offset_id=max_id, reverse=True, limit=100):
                    if msg.id in existing_ids:
                        continue
                    text = msg.text or ""
                    level = classify_message(text, CLASSIFICATION_RULES)
                    entry = {
                        "id": msg.id,
                        "date": msg.date.isoformat() if msg.date else None,
                        "text": text,
                        "level": level,
                        "group": str(entity.id),
                        "has_media": msg.media is not None,
                        "timestamp": datetime.now().strftime("%H:%M"),
                    }
                    # Download media
                    if msg.media:
                        try:
                            ext = ".jpg"
                            if hasattr(msg.media, "document") and msg.media.document:
                                mime = msg.media.document.mime_type or ""
                                ext_map = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
                                           "video/mp4": ".mp4", "video/gif": ".gif"}
                                ext = ext_map.get(mime, ".bin")
                            fname = f"msg_{msg.id}{ext}"
                            fpath = str(MEDIA_DIR / fname)
                            if not Path(fpath).exists():
                                downloaded = await client.download_media(msg, file=fpath)
                                if downloaded:
                                    entry["media_path"] = f"/media/{fname}"
                                    if msg.media.photo:
                                        entry["images"] = [f"/media/{fname}"]
                        except Exception as e:
                            logger.warning("Media download failed for msg %d: %s", msg.id, e)

                    # Extract links
                    if text:
                        import re
                        urls = re.findall(r'https?://[^\s<>"]+', text)
                        if urls:
                            entry["links"] = urls

                    current.append(entry)
                    existing_ids.add(msg.id)
                    new_count += 1

                    # Broadcast via WebSocket
                    try:
                        await hub.broadcast(entry)
                    except Exception:
                        pass

            except FloodWaitError as e:
                logger.warning("FloodWait on refresh for %s: waiting %ds", group["username"], e.seconds)
            except Exception as e:
                logger.warning("Refresh fetch failed for %s: %s", group["username"], e)

        if new_count > 0:
            current.sort(key=lambda m: m.get("id", 0), reverse=True)
            (DATA_DIR / "messages_final.json").write_text(
                json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            # Clear cache so it gets rebuilt on next request
            refresh_cache()

        await client.disconnect()
        return {"refreshed": True, "new_messages": new_count}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Refresh failed: %s", e)
        raise HTTPException(500, f"Refresh failed: {e}")


@app.websocket('/runnerxbt/ws')
async def websocket_endpoint_prefixed(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get('/runnerxbt/')
async def serve_index_prefixed():
    return await serve_index()

@app.get('/runnerxbt/assets/{path:path}')
async def serve_assets_prefixed(path: str):
    return await serve_assets(path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
