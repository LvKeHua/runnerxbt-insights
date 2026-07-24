"""Real-time Telegram message listener with safety measures.

SAFETY NOTES:
- Reuses existing session (no re-login)
- Read-only: never sends messages
- Caches group entities at startup (no repeated get_entity calls)
- Handles FloodWaitError with automatic backoff
- Auto-reconnect with exponential delay
- Graceful shutdown on SIGINT/SIGTERM
"""
import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

from telethon import TelegramClient, events
from telethon.errors import FloodWaitError, SessionPasswordNeededError

from classifier import classify_message
from config import (
    CLASSIFICATION_RULES,
    DATA_DIR,
    MEDIA_DIR,
    MEDIA_MAX_SIZE,
    TELEGRAM_API_HASH,
    TELEGRAM_API_ID,
    TELEGRAM_GROUPS,
    TELEGRAM_SESSION,
)

logger = logging.getLogger(__name__)


class TelegramListener:
    """Listens for new messages in configured Telegram groups."""

    def __init__(self, on_message_callback: Optional[Callable] = None):
        self.client: Optional[TelegramClient] = None
        self.on_message = on_message_callback
        self._running = False
        self._entity_cache: dict = {}  # chat_id -> entity cache
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = 10

    async def start(self):
        """Connect to Telegram and start listening for new messages."""
        logger.info("Starting TelegramListener...")

        # Reuse existing session file
        session_path = TELEGRAM_SESSION
        if not os.path.exists(f"{session_path}.session"):
            logger.error(
                "Session file not found at %s. "
                "Run scraper/final2.py first to create a session.",
                session_path,
            )
            raise FileNotFoundError(f"Session not found: {session_path}.session")

        self.client = TelegramClient(session_path, TELEGRAM_API_ID, TELEGRAM_API_HASH)

        try:
            await self.client.connect()
            logger.info("Connected to Telegram")
        except ConnectionError as e:
            logger.error("Failed to connect to Telegram: %s", e)
            await self._reconnect()

        if not await self.client.is_user_authorized():
            logger.error("Session not authorized. Run scraper/final2.py first.")
            raise RuntimeError("Telegram session not authorized.")

        me = await self.client.get_me()
        logger.info("Logged in as: %s (id: %s)", me.first_name, me.id)

        # Cache group entities at startup (avoid repeated get_entity calls)
        for group in TELEGRAM_GROUPS:
            if not group.get("enabled", True):
                continue
            try:
                entity = await self.client.get_entity(group["username"])
                self._entity_cache[entity.id] = entity
                logger.info("Listening to: %s (id: %s)", group["username"], entity.id)

                # Register event handler for this chat
                self.client.add_event_handler(
                    self._handle_message,
                    events.NewMessage(chats=entity.id),
                )
            except FloodWaitError as e:
                logger.warning("FloodWait: waiting %ds before retrying %s", e.seconds, group["username"])
                await asyncio.sleep(e.seconds)
                # Retry once after wait
                try:
                    entity = await self.client.get_entity(group["username"])
                    self._entity_cache[entity.id] = entity
                    logger.info("Listening to: %s (id: %s)", group["username"], entity.id)
                    self.client.add_event_handler(
                        self._handle_message,
                        events.NewMessage(chats=entity.id),
                    )
                except Exception as retry_err:
                    logger.error("Failed to register handler for %s: %s", group["username"], retry_err)
            except Exception as e:
                logger.error("Failed to register handler for %s: %s", group["username"], e)

        self._running = True
        self._reconnect_attempts = 0
        logger.info("TelegramListener started. Waiting for messages...")

        # Register graceful shutdown
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop = asyncio.get_running_loop()
                loop.add_signal_handler(sig, lambda: asyncio.create_task(self.stop()))
            except NotImplementedError:
                # Windows doesn't support add_signal_handler
                pass

        try:
            await self.client.run_until_disconnected()
        except Exception as e:
            logger.error("Listener disconnected: %s", e)
            if self._running:
                await self._reconnect()

    async def _handle_message(self, event):
        """Handle a new message from a monitored group."""
        msg = event.message
        text = msg.text or ""

        # Classify message
        level = classify_message(text, CLASSIFICATION_RULES)

        # Build entry
        entry = {
            "id": msg.id,
            "date": msg.date.isoformat() if msg.date else None,
            "text": text,
            "level": level,
            "group": str(event.chat_id) if event.chat_id else None,
            "has_media": msg.media is not None,
            "timestamp": datetime.now().strftime("%H:%M"),
        }

        # Download media (async, non-blocking, with error handling)
        if msg.media:
            try:
                # Determine file extension
                ext = ".jpg"  # default
                if hasattr(msg.media, "document") and msg.media.document:
                    mime = msg.media.document.mime_type or ""
                    ext_map = {
                        "image/png": ".png",
                        "image/jpeg": ".jpg",
                        "image/webp": ".webp",
                        "video/mp4": ".mp4",
                        "video/gif": ".gif",
                    }
                    ext = ext_map.get(mime, ".bin")

                fname = f"msg_{msg.id}{ext}"
                fpath = str(MEDIA_DIR / fname)

                if not os.path.exists(fpath):
                    # Check file size limit
                    if hasattr(msg.media, "document") and msg.media.document:
                        size = msg.media.document.size or 0
                        if size > MEDIA_MAX_SIZE:
                            logger.warning("Skipping large media (%d bytes): msg %d", size, msg.id)
                        else:
                            downloaded = await self.client.download_media(msg, file=fpath)
                            if downloaded:
                                logger.info("Downloaded media: %s", fname)
                                entry["media_path"] = f"/media/{fname}"
                                if msg.media.photo:
                                    entry["images"] = [f"/media/{fname}"]
                    elif msg.media.photo:
                        downloaded = await self.client.download_media(msg, file=fpath)
                        if downloaded:
                            logger.info("Downloaded photo: %s", fname)
                            entry["media_path"] = f"/media/{fname}"
                            entry["images"] = [f"/media/{fname}"]
            except FloodWaitError as e:
                logger.warning("FloodWait on media download: waiting %ds", e.seconds)
                await asyncio.sleep(e.seconds)
            except Exception as e:
                logger.warning("Media download failed for msg %d: %s", msg.id, e)
                # Media failure should NOT block message delivery

        # Extract links
        if text:
            import re
            urls = re.findall(r'https?://[^\s<>"]+', text)
            if urls:
                entry["links"] = urls

        # Save to JSON (with error handling)
        try:
            await self._save_message(entry)
        except Exception as e:
            logger.error("Failed to save message %d: %s", msg.id, e)

        # Notify WebSocket hub (non-blocking)
        if self.on_message:
            try:
                await self.on_message(entry)
            except Exception as e:
                logger.error("Failed to notify WS hub for msg %d: %s", msg.id, e)

        logger.info("New message [%s] from chat %s: %s", level, event.chat_id, text[:50])

    async def _save_message(self, entry: dict):
        """Append message to messages_final.json (thread-safe)."""
        path = DATA_DIR / "messages_final.json"

        # Read existing data
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = []

        # Check for duplicate
        if any(m.get("id") == entry["id"] for m in data):
            logger.debug("Skipping duplicate message: %d", entry["id"])
            return

        # Append and save
        data.append(entry)

        # Sort by id descending (newest first, matching existing format)
        data.sort(key=lambda m: m.get("id", 0), reverse=True)

        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.debug("Saved message %d to messages_final.json", entry["id"])

    async def _reconnect(self):
        """Reconnect with exponential backoff."""
        self._reconnect_attempts += 1
        if self._reconnect_attempts > self._max_reconnect_attempts:
            logger.error("Max reconnection attempts (%d) reached. Giving up.", self._max_reconnect_attempts)
            return

        delay = min(2 ** self._reconnect_attempts, 60)  # 2s, 4s, 8s... max 60s
        logger.warning("Reconnecting in %ds (attempt %d/%d)...", delay, self._reconnect_attempts, self._max_reconnect_attempts)
        await asyncio.sleep(delay)

        try:
            if self.client:
                await self.client.disconnect()
            await self.start()
        except Exception as e:
            logger.error("Reconnection failed: %s", e)

    async def stop(self):
        """Gracefully stop the listener."""
        logger.info("Stopping TelegramListener...")
        self._running = False
        if self.client:
            await self.client.disconnect()
        logger.info("TelegramListener stopped.")


async def main():
    """Run listener standalone (for testing)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    listener = TelegramListener(on_message_callback=lambda msg: asyncio.sleep(0))  # no-op for standalone

    try:
        await listener.start()
    except KeyboardInterrupt:
        await listener.stop()
    except Exception as e:
        logger.error("Fatal error: %s", e)
        await listener.stop()
        raise


if __name__ == "__main__":
    asyncio.run(main())
