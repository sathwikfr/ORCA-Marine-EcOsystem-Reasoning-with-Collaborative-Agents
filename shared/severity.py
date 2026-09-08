"""
shared/severity.py
Severity and alert level enumerations used across all ORCA services.
"""

from enum import Enum


class AlertLevel(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    ORANGE = "ORANGE"
    RED = "RED"

    @property
    def numeric(self) -> int:
        return {"GREEN": 0, "YELLOW": 1, "ORANGE": 2, "RED": 3}[self.value]

    @classmethod
    def from_probability(cls, probability: float) -> "AlertLevel":
        """Map a 0–1 probability to an alert level."""
        if probability < 0.25:
            return cls.GREEN
        elif probability < 0.50:
            return cls.YELLOW
        elif probability < 0.75:
            return cls.ORANGE
        else:
            return cls.RED


class DisasterType(str, Enum):
    CYCLONE = "CYCLONE"
    TSUNAMI = "TSUNAMI"
    OIL_SPILL = "OIL_SPILL"
    HARMFUL_ALGAL_BLOOM = "HARMFUL_ALGAL_BLOOM"
    HEATWAVE = "HEATWAVE"
    FLOODING = "FLOODING"
    UNKNOWN = "UNKNOWN"


class QualityFlag(str, Enum):
    GOOD = "GOOD"
    SUSPECT = "SUSPECT"
    BAD = "BAD"


class AgentStatus(str, Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"
    DISABLED = "DISABLED"
