"""
agents/core/config.py
Configuration for the Agents service, loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class AgentConfig(BaseSettings):
    # Redis
    redis_url: str = Field("redis://redis:6379/0", env="REDIS_URL")

    # LLM
    google_api_key: str = Field("", env="GOOGLE_API_KEY")
    openai_api_key: str = Field("", env="OPENAI_API_KEY")
    llm_provider: str = Field("google", env="LLM_PROVIDER")   # google | openai | local
    llm_model: str = Field("gemini-1.5-pro", env="LLM_MODEL")
    fallback_to_template: bool = Field(True, env="FALLBACK_TO_TEMPLATE")

    # External APIs
    open_meteo_base_url: str = Field(
        "https://api.open-meteo.com/v1", env="OPEN_METEO_BASE_URL"
    )
    copernicus_marine_user: str = Field("", env="COPERNICUS_MARINE_USER")
    copernicus_marine_pass: str = Field("", env="COPERNICUS_MARINE_PASS")
    sentinel_hub_client_id: str = Field("", env="SENTINEL_HUB_CLIENT_ID")
    sentinel_hub_client_secret: str = Field("", env="SENTINEL_HUB_CLIENT_SECRET")
    aishub_username: str = Field("", env="AISHUB_USERNAME")
    gbif_base_url: str = Field("https://api.gbif.org/v1", env="GBIF_BASE_URL")

    # Risk thresholds
    alert_threshold_probability: float = Field(
        0.65, env="ALERT_THRESHOLD_PROBABILITY"
    )
    alert_threshold_confidence: float = Field(
        0.60, env="ALERT_THRESHOLD_CONFIDENCE"
    )

    # Polling intervals
    agent_cycle_interval_minutes: int = Field(15, env="AGENT_CYCLE_INTERVAL_MINUTES")
    vessel_update_interval_minutes: int = Field(2, env="VESSEL_UPDATE_INTERVAL_MINUTES")
    satellite_analysis_interval_hours: int = Field(
        6, env="SATELLITE_ANALYSIS_INTERVAL_HOURS"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Singleton instance
config = AgentConfig()
