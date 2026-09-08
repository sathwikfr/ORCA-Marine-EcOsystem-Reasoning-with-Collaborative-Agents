"""
shared/orca_event.py
Canonical event schema shared across all ORCA agents and services.
All agents must publish events conforming to this schema.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Optional
import json
import uuid


@dataclass
class GeoPoint:
    lat: float
    lon: float

    def to_geojson(self) -> dict:
        return {"type": "Point", "coordinates": [self.lon, self.lat]}


@dataclass
class BoundingBox:
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float

    def to_geojson_polygon(self) -> dict:
        coords = [
            [self.lon_min, self.lat_min],
            [self.lon_max, self.lat_min],
            [self.lon_max, self.lat_max],
            [self.lon_min, self.lat_max],
            [self.lon_min, self.lat_min],
        ]
        return {"type": "Polygon", "coordinates": [coords]}


@dataclass
class OrcaAnomaly:
    """Represents a single detected anomaly within an agent's domain."""
    anomaly_type: str           # e.g. RAPID_PRESSURE_DROP, SST_ANOMALY
    severity: str               # LOW | MEDIUM | HIGH | CRITICAL
    confidence: float           # 0.0 – 1.0
    description: str
    location: Optional[GeoPoint] = None


@dataclass
class OrcaEvent:
    """
    Standard event published by every ORCA agent to the Redis message bus.
    All agents produce this schema; the Coordinator and Disaster Reasoning
    Agent consume it.
    """
    agent_id: str
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    region: Optional[BoundingBox] = None
    observations: dict[str, Any] = field(default_factory=dict)
    anomalies: list[OrcaAnomaly] = field(default_factory=list)
    risk_score: float = 0.0         # 0.0 (safe) – 1.0 (critical)
    confidence: float = 1.0         # Agent's confidence in its own output
    data_source: str = "unknown"
    quality_flag: str = "GOOD"      # GOOD | SUSPECT | BAD
    metadata: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None     # Set if agent encountered an error

    def to_dict(self) -> dict:
        d = asdict(self)
        # Convert nested dataclasses to plain dicts (already done by asdict)
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)

    @classmethod
    def error_event(cls, agent_id: str, error_msg: str) -> "OrcaEvent":
        """Create a minimal error event when an agent fails."""
        return cls(
            agent_id=agent_id,
            risk_score=0.0,
            confidence=0.0,
            quality_flag="BAD",
            error=error_msg,
        )
