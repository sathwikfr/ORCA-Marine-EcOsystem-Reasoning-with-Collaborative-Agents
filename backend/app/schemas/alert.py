"""
backend/app/schemas/alert.py
Pydantic schemas for Alert endpoints.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class AlertOut(BaseModel):
    alert_id: UUID
    alert_level: str
    alert_type: str
    title: str
    explanation: str
    recommended_actions: list[str]
    confidence: Optional[float]
    source_agents: list[str]
    is_active: bool
    acknowledged_by: Optional[UUID]
    acknowledged_at: Optional[datetime]
    created_at: datetime
    metadata: Optional[dict[str, Any]] = {}

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    total: int
    page: int
    per_page: int
    alerts: list[AlertOut]


class AcknowledgeRequest(BaseModel):
    acknowledgment_note: Optional[str] = None


class ResolveRequest(BaseModel):
    resolution_note: Optional[str] = None


class InternalAlertCreate(BaseModel):
    """Schema for alerts created internally by the agents service."""
    alert_level: str
    alert_type: str
    title: str
    explanation: str
    recommended_actions: list[str] = []
    confidence: float = 0.5
    source_agents: list[str] = []
    metadata: dict[str, Any] = {}
