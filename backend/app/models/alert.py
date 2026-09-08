"""
backend/app/models/alert.py
Alert ORM model.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

from ..core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=True)
    alert_level = Column(String(10), nullable=False)
    alert_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    recommended_actions = Column(ARRAY(Text), default=[])
    confidence = Column(Float)
    source_agents = Column(ARRAY(String(50)), default=[])
    acknowledged_by = Column(UUID(as_uuid=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    metadata_ = Column("metadata", JSONB, default={})
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
