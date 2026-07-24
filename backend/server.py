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


@app.on_event("startup")
async def startup():
    """Start Telegram listener if session is available."""
    global listener
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
