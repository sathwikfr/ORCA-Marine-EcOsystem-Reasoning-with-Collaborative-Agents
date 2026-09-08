"""
backend/app/websocket/manager.py
WebSocket connection manager — broadcasts events to all connected dashboard clients.
"""

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        self._connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id} | total={len(self._connections)}")

    def disconnect(self, client_id: str) -> None:
        self._connections.pop(client_id, None)
        logger.info(f"WebSocket disconnected: {client_id} | total={len(self._connections)}")

    async def send_personal(self, client_id: str, event: dict[str, Any]) -> None:
        ws = self._connections.get(client_id)
        if ws:
            try:
                await ws.send_text(json.dumps(event))
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, event: dict[str, Any]) -> None:
        """Send an event to all connected WebSocket clients."""
        dead = []
        for client_id, ws in self._connections.items():
            try:
                await ws.send_text(json.dumps(event, default=str))
            except Exception:
                dead.append(client_id)
        for cid in dead:
            self.disconnect(cid)

    @property
    def connected_count(self) -> int:
        return len(self._connections)


# Singleton instance used across the app
ws_manager = WebSocketManager()
