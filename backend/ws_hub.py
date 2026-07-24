"""WebSocket hub for broadcasting messages to connected clients."""
import asyncio
import json
import logging
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketHub:
    """Manages WebSocket connections and broadcasts messages to all clients."""

    def __init__(self):
        self.connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        """Accept and register a new WebSocket connection."""
        await ws.accept()
        async with self._lock:
            self.connections.add(ws)
        logger.info("Client connected. Active connections: %d", len(self.connections))

    async def disconnect(self, ws: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            self.connections.discard(ws)
        logger.info("Client disconnected. Active connections: %d", len(self.connections))

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        if not self.connections:
            return

        data = json.dumps(message, ensure_ascii=False, default=str)
        dead: Set[WebSocket] = set()

        for ws in list(self.connections):
            try:
                await ws.send_text(data)
            except Exception as e:
                logger.warning("Failed to send to client: %s", e)
                dead.add(ws)

        # Clean up dead connections
        if dead:
            async with self._lock:
                self.connections -= dead
            logger.info("Removed %d dead connections", len(dead))

    @property
    def active_count(self) -> int:
        """Return the number of active connections."""
        return len(self.connections)
