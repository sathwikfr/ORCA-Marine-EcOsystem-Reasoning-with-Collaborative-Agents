# ORCA – Marine EcOsystem Reasoning with Collaborative Agents
## Low-Level Design Document (LLD)
### Smart India Hackathon 2026 | PS ID: SIH26176
**Version:** 1.0 | **Derived from:** HLD v1.0 | **Date:** September 2026

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Database Schema (SQL)](#2-database-schema-sql)
3. [REST API Specification](#3-rest-api-specification)
4. [WebSocket API Specification](#4-websocket-api-specification)
5. [Class Diagrams – Agents](#5-class-diagrams--agents)
6. [Class Diagrams – Services](#6-class-diagrams--services)
7. [LangGraph DAG Specification](#7-langgraph-dag-specification)
8. [Celery Task Design](#8-celery-task-design)
9. [Redis Channel Schema](#9-redis-channel-schema)
10. [Sequence Diagrams](#10-sequence-diagrams)
11. [Environment & Configuration](#11-environment--configuration)
12. [Phased Implementation Plan](#12-phased-implementation-plan)

---

## 1. Folder Structure

### 1.1 Repository Overview (Monorepo)

```
orca/
├── README.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
│
├── frontend/                    # React.js application
├── backend/                     # FastAPI application
├── agents/                      # AI Agents + LangGraph
├── shared/                      # Shared schemas/utilities
├── infra/                       # Docker, Nginx, K8s configs
└── docs/                        # Architecture docs (HLD, LLD)
```

---

### 1.2 Frontend (`frontend/`)

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Root component + routing
│   │
│   ├── assets/
│   │   ├── icons/               # SVG icons
│   │   └── images/              # Static images
│   │
│   ├── components/              # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Badge.jsx        # Severity badge (RED/ORANGE/etc)
│   │   │   ├── Spinner.jsx
│   │   │   └── Modal.jsx
│   │   │
│   │   ├── map/
│   │   │   ├── OrcaMap.jsx      # Main Leaflet map wrapper
│   │   │   ├── RiskZoneLayer.jsx
│   │   │   ├── VesselLayer.jsx
│   │   │   ├── StormTrackLayer.jsx
│   │   │   └── SatelliteLayer.jsx
│   │   │
│   │   ├── alerts/
│   │   │   ├── AlertFeed.jsx
│   │   │   ├── AlertCard.jsx
│   │   │   └── AlertDetail.jsx
│   │   │
│   │   ├── agents/
│   │   │   ├── AgentStatusPanel.jsx
│   │   │   └── AgentCard.jsx
│   │   │
│   │   └── charts/
│   │       ├── SSTChart.jsx
│   │       ├── WindPressureChart.jsx
│   │       └── RiskTrendChart.jsx
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── MapPage.jsx
│   │   ├── AlertsPage.jsx
│   │   ├── HistoryPage.jsx
│   │   └── SettingsPage.jsx
│   │
│   ├── hooks/
│   │   ├── useWebSocket.js      # WebSocket connection hook
│   │   ├── useAlerts.js
│   │   ├── useMapData.js
│   │   └── useAuth.js
│   │
│   ├── services/                # API call functions
│   │   ├── api.js               # Axios instance + interceptors
│   │   ├── authService.js
│   │   ├── alertService.js
│   │   ├── mapService.js
│   │   └── weatherService.js
│   │
│   ├── store/                   # Global state (Zustand)
│   │   ├── authStore.js
│   │   ├── alertStore.js
│   │   └── mapStore.js
│   │
│   └── utils/
│       ├── formatters.js        # Date/severity formatters
│       ├── geoUtils.js          # Coordinate helpers
│       └── constants.js         # Severity levels, colors
│
├── package.json
├── vite.config.js
└── Dockerfile
```

---

### 1.3 Backend (`backend/`)

```
backend/
├── main.py                      # FastAPI app entry point
├── requirements.txt
├── Dockerfile
├── alembic.ini                  # Database migrations config
│
├── app/
│   ├── __init__.py
│   │
│   ├── core/
│   │   ├── config.py            # Settings from env vars (Pydantic)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── redis_client.py      # Redis connection pool
│   │   ├── security.py          # JWT utilities
│   │   └── logging.py           # Structured JSON logger
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py            # Master API router
│   │   │
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py          # /auth endpoints
│   │       ├── alerts.py        # /alerts endpoints
│   │       ├── weather.py       # /weather endpoints
│   │       ├── ocean.py         # /ocean endpoints
│   │       ├── vessels.py       # /vessels endpoints
│   │       ├── satellite.py     # /satellite endpoints
│   │       ├── ecosystem.py     # /ecosystem endpoints
│   │       ├── map.py           # /map GeoJSON endpoints
│   │       └── agents.py        # /agents status endpoints
│   │
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── alert.py
│   │   ├── weather_data.py
│   │   ├── ocean_data.py
│   │   ├── satellite_observation.py
│   │   ├── vessel.py
│   │   ├── vessel_track.py
│   │   ├── disaster_event.py
│   │   ├── prediction.py
│   │   └── audit_log.py
│   │
│   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── alert.py
│   │   ├── weather.py
│   │   ├── ocean.py
│   │   ├── vessel.py
│   │   ├── satellite.py
│   │   └── common.py
│   │
│   ├── services/                # Business logic
│   │   ├── auth_service.py
│   │   ├── alert_service.py
│   │   ├── notification_service.py
│   │   ├── map_service.py
│   │   └── recommendation_service.py
│   │
│   ├── tasks/                   # Celery tasks
│   │   ├── __init__.py
│   │   ├── celery_app.py        # Celery instance
│   │   ├── agent_scheduler.py   # Periodic trigger tasks
│   │   └── notification_tasks.py
│   │
│   └── websocket/
│       ├── __init__.py
│       ├── manager.py           # WebSocket connection manager
│       └── events.py            # Event type definitions
│
└── alembic/
    ├── env.py
    └── versions/                # Migration files
```

---

### 1.4 Agents (`agents/`)

```
agents/
├── requirements.txt
├── Dockerfile
├── main.py                      # Agent service entry point
│
├── core/
│   ├── __init__.py
│   ├── base_agent.py            # Abstract base class for all agents
│   ├── event_schema.py          # Standard ORCA Event JSON schema
│   ├── redis_bus.py             # Publisher/Subscriber utilities
│   └── config.py                # Agent configuration
│
├── agents/
│   ├── __init__.py
│   ├── weather_agent.py
│   ├── ocean_agent.py
│   ├── satellite_agent.py
│   ├── vessel_agent.py
│   ├── ecosystem_agent.py
│   ├── disaster_reasoning_agent.py
│   └── coordinator_agent.py
│
├── data_providers/              # External API adapters
│   ├── __init__.py
│   ├── base_provider.py         # Abstract provider
│   ├── open_meteo_provider.py
│   ├── copernicus_marine_provider.py
│   ├── sentinel_provider.py
│   ├── ais_provider.py
│   ├── gbif_provider.py
│   └── erddap_provider.py
│
├── processors/                  # Data processing utilities
│   ├── __init__.py
│   ├── image_processor.py       # Satellite image analysis
│   ├── risk_scorer.py           # Rule-based risk scoring
│   └── geo_utils.py             # Geospatial helpers (GeoPandas)
│
├── reasoning/
│   ├── __init__.py
│   ├── langgraph_dag.py         # LangGraph DAG definition
│   ├── llm_synthesizer.py       # LLM explanation generation
│   ├── rag_engine.py            # RAG pipeline
│   └── knowledge_loader.py     # Load docs into vector store
│
└── tests/
    ├── test_weather_agent.py
    ├── test_ocean_agent.py
    ├── test_coordinator.py
    └── fixtures/
        └── sample_events.json
```

---

### 1.5 Shared (`shared/`)

```
shared/
├── __init__.py
├── orca_event.py                # Canonical OrcaEvent dataclass
├── severity.py                  # SeverityLevel enum
└── regions.py                   # Indian coastal zone definitions
```

---

### 1.6 Infrastructure (`infra/`)

```
infra/
├── nginx/
│   ├── nginx.conf
│   └── ssl/                     # TLS certificates
│
├── postgres/
│   └── init.sql                 # PostGIS extension setup
│
└── k8s/                         # Kubernetes manifests (future)
    ├── frontend-deployment.yaml
    ├── backend-deployment.yaml
    ├── agents-deployment.yaml
    ├── postgres-statefulset.yaml
    └── redis-deployment.yaml
```

---

## 2. Database Schema (SQL)

### 2.1 Setup: Enable PostGIS

```sql
-- Run once on database creation
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;  -- for time-series optimization
CREATE EXTENSION IF NOT EXISTS pgvector;     -- for RAG embeddings
```

---

### 2.2 Users Table

```sql
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL
                    CHECK (role IN ('ndma_admin', 'coast_guard',
                                    'port_authority', 'fisherman',
                                    'researcher', 'system')),
    region          VARCHAR(100),            -- e.g. "Bay of Bengal North"
    phone           VARCHAR(20),
    notification_prefs JSONB DEFAULT '{"sms": true, "email": true, "push": false}',
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_region ON users(region);
```

---

### 2.3 Disaster Events Table

```sql
CREATE TABLE disaster_events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(50) NOT NULL
                    CHECK (event_type IN ('CYCLONE', 'TSUNAMI', 'OIL_SPILL',
                                          'HARMFUL_ALGAL_BLOOM', 'HEATWAVE',
                                          'FLOODING', 'UNKNOWN')),
    event_name      VARCHAR(255),            -- e.g. "Cyclone Amphan"
    status          VARCHAR(20) DEFAULT 'ACTIVE'
                    CHECK (status IN ('PREDICTED', 'ACTIVE', 'RESOLVED')),
    severity        INTEGER CHECK (severity BETWEEN 1 AND 5),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    epicenter       GEOMETRY(POINT, 4326),   -- PostGIS: lon/lat point
    affected_zone   GEOMETRY(POLYGON, 4326), -- Impacted area polygon
    affected_area_km2 DECIMAL(12, 2),
    estimated_pop_at_risk INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disaster_events_type ON disaster_events(event_type);
CREATE INDEX idx_disaster_events_status ON disaster_events(status);
CREATE INDEX idx_disaster_events_epicenter ON disaster_events USING GIST(epicenter);
CREATE INDEX idx_disaster_events_affected_zone ON disaster_events USING GIST(affected_zone);
```

---

### 2.4 Alerts Table

```sql
CREATE TABLE alerts (
    alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES disaster_events(event_id),
    alert_level     VARCHAR(10) NOT NULL
                    CHECK (alert_level IN ('GREEN', 'YELLOW', 'ORANGE', 'RED')),
    alert_type      VARCHAR(50) NOT NULL,    -- e.g. "CYCLONE_WARNING"
    title           VARCHAR(255) NOT NULL,
    explanation     TEXT NOT NULL,           -- LLM-generated plain-language text
    recommended_actions TEXT[],             -- Array of action strings
    confidence      DECIMAL(4, 3)           -- 0.000 to 1.000
                    CHECK (confidence BETWEEN 0 AND 1),
    affected_zone   GEOMETRY(POLYGON, 4326),
    source_agents   VARCHAR(50)[],          -- Which agents contributed
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',     -- Flexible extra data
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_level ON alerts(alert_level);
CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_alerts_event ON alerts(event_id);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_zone ON alerts USING GIST(affected_zone);
```

---

### 2.5 Weather Data Table

```sql
CREATE TABLE weather_data (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL,
    location        GEOMETRY(POINT, 4326) NOT NULL,
    region_name     VARCHAR(100),
    wind_speed_kmph DECIMAL(6, 2),
    wind_direction  INTEGER CHECK (wind_direction BETWEEN 0 AND 360),
    pressure_hpa    DECIMAL(7, 2),
    temperature_c   DECIMAL(5, 2),
    humidity_pct    DECIMAL(5, 2),
    rainfall_mm     DECIMAL(6, 2),
    visibility_km   DECIMAL(6, 2),
    storm_probability DECIMAL(4, 3),
    cyclone_risk_score DECIMAL(4, 3),
    data_source     VARCHAR(50) DEFAULT 'open_meteo',
    quality_flag    VARCHAR(10) DEFAULT 'GOOD'
                    CHECK (quality_flag IN ('GOOD', 'SUSPECT', 'BAD')),
    raw_response    JSONB,                   -- Original API response
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- TimescaleDB hypertable for efficient time-range queries
SELECT create_hypertable('weather_data', 'timestamp', if_not_exists => TRUE);

CREATE INDEX idx_weather_location ON weather_data USING GIST(location);
CREATE INDEX idx_weather_timestamp ON weather_data(timestamp DESC);
```

---

### 2.6 Ocean Data Table

```sql
CREATE TABLE ocean_data (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL,
    location        GEOMETRY(POINT, 4326) NOT NULL,
    depth_m         DECIMAL(8, 2) DEFAULT 0,
    sst_celsius     DECIMAL(5, 2),           -- Sea Surface Temperature
    sst_anomaly_c   DECIMAL(5, 2),           -- Deviation from climatology
    salinity_psu    DECIMAL(6, 3),
    wave_height_m   DECIMAL(5, 2),
    wave_period_s   DECIMAL(5, 2),
    current_speed   DECIMAL(5, 2),           -- m/s
    current_dir     INTEGER CHECK (current_dir BETWEEN 0 AND 360),
    chlorophyll_mgl DECIMAL(8, 4),
    upwelling_detected BOOLEAN DEFAULT FALSE,
    anomaly_score   DECIMAL(4, 3),
    data_source     VARCHAR(50),
    quality_flag    VARCHAR(10) DEFAULT 'GOOD',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('ocean_data', 'timestamp', if_not_exists => TRUE);
CREATE INDEX idx_ocean_location ON ocean_data USING GIST(location);
CREATE INDEX idx_ocean_timestamp ON ocean_data(timestamp DESC);
CREATE INDEX idx_ocean_sst ON ocean_data(sst_celsius);
```

---

### 2.7 Satellite Observations Table

```sql
CREATE TABLE satellite_observations (
    obs_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capture_time    TIMESTAMPTZ NOT NULL,
    satellite_name  VARCHAR(50),             -- e.g. "Sentinel-2A"
    scene_id        VARCHAR(100),
    coverage_area   GEOMETRY(POLYGON, 4326) NOT NULL,
    center_point    GEOMETRY(POINT, 4326),
    anomaly_type    VARCHAR(50)
                    CHECK (anomaly_type IN ('OIL_SPILL', 'ALGAL_BLOOM',
                                            'TURBIDITY', 'COASTLINE_CHANGE',
                                            'CLEAR', 'UNKNOWN')),
    anomaly_area_km2 DECIMAL(12, 2),
    confidence      DECIMAL(4, 3),
    image_url       VARCHAR(500),            -- MinIO object URL
    thumbnail_url   VARCHAR(500),
    indices         JSONB,                   -- NDWI, NDVI, chlorophyll etc
    model_version   VARCHAR(20),
    processing_status VARCHAR(20) DEFAULT 'PENDING'
                    CHECK (processing_status IN ('PENDING', 'PROCESSING',
                                                  'DONE', 'FAILED')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_satellite_capture ON satellite_observations(capture_time DESC);
CREATE INDEX idx_satellite_coverage ON satellite_observations USING GIST(coverage_area);
CREATE INDEX idx_satellite_anomaly ON satellite_observations(anomaly_type);
```

---

### 2.8 Vessels Table

```sql
CREATE TABLE vessels (
    mmsi            VARCHAR(9) PRIMARY KEY,  -- Maritime Mobile Service Identity
    imo_number      VARCHAR(10),
    vessel_name     VARCHAR(255),
    call_sign       VARCHAR(20),
    vessel_type     VARCHAR(50),             -- FISHING, CARGO, TANKER, etc.
    flag_country    VARCHAR(3),              -- ISO 3166-1 alpha-3
    length_m        DECIMAL(7, 2),
    gross_tonnage   INTEGER,
    owner_name      VARCHAR(255),
    emergency_contact VARCHAR(20),
    home_port       VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vessels_type ON vessels(vessel_type);
CREATE INDEX idx_vessels_flag ON vessels(flag_country);
```

---

### 2.9 Vessel Tracks Table

```sql
CREATE TABLE vessel_tracks (
    id              BIGSERIAL PRIMARY KEY,
    mmsi            VARCHAR(9) REFERENCES vessels(mmsi),
    timestamp       TIMESTAMPTZ NOT NULL,
    position        GEOMETRY(POINT, 4326) NOT NULL,
    speed_knots     DECIMAL(5, 2),
    course_degrees  INTEGER CHECK (course_degrees BETWEEN 0 AND 360),
    heading         INTEGER,
    nav_status      VARCHAR(50),             -- "Under way using engine" etc.
    in_risk_zone    BOOLEAN DEFAULT FALSE,
    risk_zone_id    UUID REFERENCES alerts(alert_id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('vessel_tracks', 'timestamp', if_not_exists => TRUE);
CREATE INDEX idx_vessel_tracks_mmsi ON vessel_tracks(mmsi, timestamp DESC);
CREATE INDEX idx_vessel_tracks_position ON vessel_tracks USING GIST(position);
CREATE INDEX idx_vessel_tracks_risk ON vessel_tracks(in_risk_zone)
    WHERE in_risk_zone = TRUE;
```

---

### 2.10 Predictions Table

```sql
CREATE TABLE predictions (
    prediction_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_type   VARCHAR(50) NOT NULL,
    probability     DECIMAL(4, 3) NOT NULL CHECK (probability BETWEEN 0 AND 1),
    confidence      DECIMAL(4, 3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    predicted_location GEOMETRY(POINT, 4326),
    predicted_zone  GEOMETRY(POLYGON, 4326),
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ NOT NULL,
    model_version   VARCHAR(50),
    agent_inputs    JSONB,                   -- Raw inputs from all agents
    explanation     TEXT,                   -- LLM explanation
    became_event_id UUID REFERENCES disaster_events(event_id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_type ON predictions(disaster_type);
CREATE INDEX idx_predictions_valid ON predictions(valid_until);
CREATE INDEX idx_predictions_zone ON predictions USING GIST(predicted_zone);
```

---

### 2.11 Ecosystem Data Table

```sql
CREATE TABLE ecosystem_data (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL,
    location        GEOMETRY(POINT, 4326),
    region_name     VARCHAR(100),
    coral_bleaching_risk DECIMAL(4, 3),
    biodiversity_index DECIMAL(5, 3),
    protected_area_violation BOOLEAN DEFAULT FALSE,
    species_sightings JSONB,                -- Array of {species, count, confidence}
    ecosystem_health_score DECIMAL(4, 3)
                    CHECK (ecosystem_health_score BETWEEN 0 AND 1),
    data_source     VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('ecosystem_data', 'timestamp', if_not_exists => TRUE);
CREATE INDEX idx_ecosystem_location ON ecosystem_data USING GIST(location);
```

---

### 2.12 Audit Log Table

```sql
CREATE TABLE audit_logs (
    log_id          BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ DEFAULT NOW(),
    user_id         UUID REFERENCES users(user_id),
    action          VARCHAR(100) NOT NULL,   -- e.g. "ALERT_ACKNOWLEDGED"
    resource_type   VARCHAR(50),
    resource_id     VARCHAR(100),
    ip_address      INET,
    details         JSONB,
    correlation_id  UUID                     -- traces one request through system
);

-- Append-only: no UPDATE or DELETE on this table
CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

---

### 2.13 Knowledge Base (RAG Embeddings)

```sql
CREATE TABLE knowledge_documents (
    doc_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    source          VARCHAR(255),            -- NDMA, IMO, etc.
    content         TEXT NOT NULL,
    doc_type        VARCHAR(50),             -- SOP, CASE_STUDY, REGULATION
    tags            VARCHAR(50)[],
    embedding       vector(1536),            -- pgvector for semantic search
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_embedding ON knowledge_documents
    USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_tags ON knowledge_documents USING GIN(tags);
```

---

## 3. REST API Specification

**Base URL:** `https://orca.api.sih2026.in/api/v1`

All authenticated endpoints require: `Authorization: Bearer <jwt_token>`

---

### 3.1 Authentication Endpoints

#### POST `/auth/register`
Register a new user.

**Request:**
```json
{
  "email": "officer@coastguard.gov.in",
  "password": "SecurePass123!",
  "full_name": "Cmdr. Rajesh Kumar",
  "role": "coast_guard",
  "region": "Bay of Bengal North",
  "phone": "+919876543210"
}
```

**Response `201`:**
```json
{
  "user_id": "uuid-...",
  "email": "officer@coastguard.gov.in",
  "full_name": "Cmdr. Rajesh Kumar",
  "role": "coast_guard",
  "created_at": "2026-09-08T14:30:00Z"
}
```

---

#### POST `/auth/login`
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "officer@coastguard.gov.in",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "user_id": "uuid-...",
    "role": "coast_guard",
    "region": "Bay of Bengal North"
  }
}
```

---

#### POST `/auth/refresh`
Refresh an expired access token.

**Request:**
```json
{ "refresh_token": "eyJhbGci..." }
```

**Response `200`:**
```json
{ "access_token": "eyJhbGci...", "expires_in": 900 }
```

---

### 3.2 Alert Endpoints

#### GET `/alerts`
List alerts (paginated, filterable).

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `level` | string | GREEN, YELLOW, ORANGE, RED |
| `is_active` | bool | true/false |
| `event_type` | string | CYCLONE, OIL_SPILL, etc. |
| `lat` | float | Center latitude for spatial filter |
| `lon` | float | Center longitude for spatial filter |
| `radius_km` | float | Filter alerts within this radius |
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 20, max: 100) |

**Response `200`:**
```json
{
  "total": 47,
  "page": 1,
  "per_page": 20,
  "alerts": [
    {
      "alert_id": "uuid-...",
      "alert_level": "RED",
      "alert_type": "CYCLONE_WARNING",
      "title": "Severe Cyclone Warning – Bay of Bengal",
      "explanation": "A deep depression has intensified into a severe cyclonic storm. Wind speed 95 km/h, central pressure 968 hPa. Landfall predicted near Vizag in 36 hours.",
      "recommended_actions": [
        "All fishing vessels to return to port immediately",
        "Coast guard to activate rescue protocol RC-7",
        "NDMA to pre-position relief materials in Vizag and Bhimavaram"
      ],
      "confidence": 0.87,
      "affected_zone": {
        "type": "Polygon",
        "coordinates": [[[80.5, 14.2], [82.1, 14.2], [82.1, 16.8], [80.5, 16.8], [80.5, 14.2]]]
      },
      "source_agents": ["weather_agent", "ocean_agent", "vessel_agent"],
      "is_active": true,
      "created_at": "2026-09-08T14:30:00Z"
    }
  ]
}
```

---

#### GET `/alerts/{alert_id}`
Get full alert detail.

**Response `200`:** Full alert object + linked prediction + agent evidence

---

#### PATCH `/alerts/{alert_id}/acknowledge`
Acknowledge an alert (requires coast_guard or ndma_admin role).

**Request:**
```json
{ "acknowledgment_note": "Teams dispatched to Vizag" }
```

**Response `200`:**
```json
{
  "alert_id": "uuid-...",
  "acknowledged_by": "uuid-user",
  "acknowledged_at": "2026-09-08T14:45:00Z"
}
```

---

#### PATCH `/alerts/{alert_id}/resolve`
Mark alert as resolved.

**Request:**
```json
{ "resolution_note": "Cyclone dissipated offshore, threat passed" }
```

---

### 3.3 Weather Endpoints

#### GET `/weather/current`
Get current weather for a location or region.

**Query params:** `lat`, `lon` OR `region_name`

**Response `200`:**
```json
{
  "timestamp": "2026-09-08T14:00:00Z",
  "location": { "lat": 13.08, "lon": 80.27 },
  "region_name": "Chennai Coast",
  "wind_speed_kmph": 42.0,
  "wind_direction": 180,
  "pressure_hpa": 1008.5,
  "temperature_c": 28.4,
  "humidity_pct": 82.0,
  "storm_probability": 0.12,
  "cyclone_risk_score": 0.08,
  "data_source": "open_meteo",
  "data_age_seconds": 180
}
```

---

#### GET `/weather/forecast`
Get 72-hour forecast.

**Query params:** `lat`, `lon`, `hours` (24/48/72)

**Response `200`:**
```json
{
  "location": { "lat": 13.08, "lon": 80.27 },
  "forecast": [
    {
      "timestamp": "2026-09-08T15:00:00Z",
      "wind_speed_kmph": 45.0,
      "pressure_hpa": 1007.0,
      "storm_probability": 0.15
    }
  ]
}
```

---

#### GET `/weather/history`
Get historical weather data.

**Query params:** `lat`, `lon`, `start_date`, `end_date`

---

### 3.4 Ocean Endpoints

#### GET `/ocean/sst`
Get sea surface temperature grid.

**Query params:** `lat_min`, `lat_max`, `lon_min`, `lon_max`

**Response `200`:**
```json
{
  "timestamp": "2026-09-08T12:00:00Z",
  "grid_resolution_deg": 0.25,
  "data_points": [
    {
      "lat": 13.0, "lon": 80.0,
      "sst_celsius": 29.4,
      "sst_anomaly_c": 1.8,
      "quality_flag": "GOOD"
    }
  ]
}
```

---

#### GET `/ocean/waves`
Get current wave height and period data.

**Query params:** `lat`, `lon` OR bounding box

---

#### GET `/ocean/currents`
Get ocean current vectors for map rendering.

**Response:** GeoJSON FeatureCollection with current vector arrows

---

### 3.5 Vessel Endpoints

#### GET `/vessels`
List vessels with optional spatial filter.

**Query params:** `lat`, `lon`, `radius_km`, `vessel_type`, `in_risk_zone`

**Response `200`:**
```json
{
  "total": 142,
  "vessels": [
    {
      "mmsi": "419123456",
      "vessel_name": "MV Meenakshi",
      "vessel_type": "FISHING",
      "flag_country": "IND",
      "last_position": { "lat": 13.5, "lon": 81.2 },
      "last_seen": "2026-09-08T14:00:00Z",
      "speed_knots": 4.2,
      "in_risk_zone": true,
      "risk_zone_id": "uuid-alert-..."
    }
  ]
}
```

---

#### GET `/vessels/{mmsi}`
Get full vessel details + last 24h track.

**Response:** Vessel info + `track` array of GeoJSON positions

---

#### GET `/vessels/geojson`
Return all active vessels as GeoJSON FeatureCollection for Leaflet rendering.

---

### 3.6 Satellite Endpoints

#### GET `/satellite/observations`
List recent satellite observations.

**Query params:** `anomaly_type`, `lat`, `lon`, `radius_km`, `since`

---

#### GET `/satellite/observations/{obs_id}`
Get full observation with thumbnail URL.

---

#### POST `/satellite/trigger`
Manually trigger satellite analysis for a region (ndma_admin only).

**Request:**
```json
{
  "lat_min": 13.0, "lat_max": 16.0,
  "lon_min": 80.0, "lon_max": 83.0,
  "analysis_types": ["OIL_SPILL", "ALGAL_BLOOM"]
}
```

**Response `202`:**
```json
{ "task_id": "celery-task-uuid", "status": "QUEUED" }
```

---

### 3.7 Agent Status Endpoints

#### GET `/agents/status`
Get status of all agents.

**Response `200`:**
```json
{
  "agents": [
    {
      "agent_id": "weather_agent",
      "display_name": "Weather Agent",
      "status": "ACTIVE",
      "last_run": "2026-09-08T14:15:00Z",
      "last_run_duration_s": 8.4,
      "last_run_status": "SUCCESS",
      "data_source": "open_meteo",
      "next_scheduled_run": "2026-09-08T14:30:00Z"
    }
  ]
}
```

---

#### GET `/agents/{agent_id}/logs`
Get recent logs for a specific agent (ndma_admin only).

---

### 3.8 Map Endpoints

#### GET `/map/risk-zones`
Get all active risk zones as GeoJSON.

**Response:** GeoJSON FeatureCollection with risk zone polygons + severity properties

---

#### GET `/map/storm-tracks`
Get predicted storm tracks as GeoJSON LineStrings.

---

#### GET `/map/heatmap`
Get risk heatmap data points for Leaflet heatmap layer.

**Response:**
```json
{
  "points": [
    [13.08, 80.27, 0.85],
    [14.20, 81.50, 0.42]
  ]
}
```

---

## 4. WebSocket API Specification

**WebSocket URL:** `wss://orca.api.sih2026.in/ws`

### 4.1 Connection & Authentication

Client connects and immediately sends auth message:
```json
{
  "type": "AUTH",
  "token": "eyJhbGci..."
}
```

Server responds:
```json
{
  "type": "AUTH_SUCCESS",
  "user_id": "uuid-...",
  "subscribed_channels": ["alerts", "vessel_updates", "agent_status"]
}
```

---

### 4.2 Server → Client Events

| Event Type | Trigger | Payload |
|-----------|---------|---------|
| `ALERT_CREATED` | New alert raised | Full alert object |
| `ALERT_UPDATED` | Alert level changed / acknowledged | Partial alert update |
| `VESSEL_POSITION_UPDATE` | Vessel position batch (every 60s) | Array of `{mmsi, lat, lon, speed}` |
| `AGENT_STATUS_UPDATE` | Agent completes a run | `{agent_id, status, last_run}` |
| `RISK_ZONE_UPDATE` | New/updated risk zone | GeoJSON feature |
| `SYSTEM_MESSAGE` | Maintenance / info | `{message, severity}` |

**Example ALERT_CREATED event:**
```json
{
  "type": "ALERT_CREATED",
  "timestamp": "2026-09-08T14:30:00Z",
  "data": {
    "alert_id": "uuid-...",
    "alert_level": "RED",
    "title": "Severe Cyclone Warning",
    "affected_zone": { "type": "Polygon", "coordinates": [...] }
  }
}
```

---

### 4.3 Client → Server Messages

| Message Type | Purpose | Payload |
|-------------|---------|---------|
| `SUBSCRIBE` | Subscribe to a specific zone | `{lat, lon, radius_km}` |
| `UNSUBSCRIBE` | Unsubscribe from a zone | — |
| `PING` | Keepalive | — |

---

## 5. Class Diagrams – Agents

### 5.1 Base Agent

```
┌─────────────────────────────────────────────────────┐
│                   BaseAgent (Abstract)               │
├─────────────────────────────────────────────────────┤
│  - agent_id: str                                     │
│  - display_name: str                                 │
│  - redis_client: RedisClient                         │
│  - config: AgentConfig                               │
│  - logger: Logger                                    │
│  - last_run: datetime                                │
│  - status: AgentStatus  [IDLE, RUNNING, ERROR]       │
├─────────────────────────────────────────────────────┤
│  + run() → OrcaEvent            [abstract]           │
│  + fetch_data() → dict          [abstract]           │
│  + process_data(raw: dict)      [abstract]           │
│  + calculate_risk_score() → float [abstract]         │
│  + publish(event: OrcaEvent)                         │
│  + health_check() → bool                             │
│  + get_status() → AgentStatusDTO                     │
└─────────────────────────────────────────────────────┘
                        ▲
        ┌───────────────┼───────────────┐
        │               │               │
  WeatherAgent    OceanAgent    SatelliteAgent  ...
```

---

### 5.2 Weather Agent

```
┌─────────────────────────────────────────────────────┐
│                   WeatherAgent                       │
│             extends BaseAgent                        │
├─────────────────────────────────────────────────────┤
│  - provider: OpenMeteoProvider                       │
│  - risk_scorer: RiskScorer                           │
│  - CYCLONE_ZONES: list[CoastalZone]                 │
│  - POLL_INTERVAL_MIN: int = 15                       │
├─────────────────────────────────────────────────────┤
│  + run() → WeatherEvent                              │
│  + fetch_data() → dict                               │
│    # Calls Open-Meteo for all coastal zones          │
│  + process_data(raw) → WeatherObservation            │
│    # Normalizes, validates, flags anomalies          │
│  + detect_rapid_pressure_drop(series) → bool         │
│    # Pressure drop > 3 hPa/hr → cyclone precursor    │
│  + classify_storm_intensity(wind_kmph) → str         │
│    # Returns Beaufort scale category                 │
│  + calculate_risk_score() → float                    │
│    # Composite: pressure + wind + humidity           │
│  + generate_forecast(hours: int) → list[Forecast]    │
└─────────────────────────────────────────────────────┘
```

---

### 5.3 Ocean Agent

```
┌─────────────────────────────────────────────────────┐
│                    OceanAgent                        │
│             extends BaseAgent                        │
├─────────────────────────────────────────────────────┤
│  - provider: CopernicusMarineProvider                │
│  - erddap_provider: ERDDAPProvider                   │
│  - sst_threshold_c: float = 28.0                     │
│  - anomaly_baseline: dict  # Monthly climatology     │
├─────────────────────────────────────────────────────┤
│  + run() → OceanEvent                                │
│  + fetch_sst_grid(bbox: BBox) → ndarray              │
│  + fetch_wave_data(location: Point) → WaveData       │
│  + fetch_current_vectors(bbox: BBox) → list[Vector]  │
│  + detect_sst_anomaly(sst, baseline) → float         │
│    # Returns anomaly deviation in °C                 │
│  + detect_upwelling(current_vecs) → bool             │
│  + calculate_risk_score() → float                    │
│    # Composite: SST anomaly + wave height + upwelling│
└─────────────────────────────────────────────────────┘
```

---

### 5.4 Satellite Agent

```
┌─────────────────────────────────────────────────────┐
│                  SatelliteAgent                      │
│             extends BaseAgent                        │
├─────────────────────────────────────────────────────┤
│  - provider: SentinelProvider                        │
│  - image_processor: ImageProcessor                   │
│  - minio_client: MinIOClient                         │
│  - OIL_CLASSIFIER: MLModel                          │
│  - BLOOM_CLASSIFIER: MLModel                        │
├─────────────────────────────────────────────────────┤
│  + run() → SatelliteEvent                            │
│  + download_latest_tile(bbox) → GeoTIFF              │
│  + preprocess_image(tiff) → ndarray                  │
│    # Band selection, cloud masking, normalization    │
│  + detect_oil_spill(image) → OilSpillResult          │
│    # Returns: detected, area_km2, confidence         │
│  + detect_algal_bloom(image) → BloomResult           │
│    # Uses chlorophyll index (Chl-a from Sentinel-3)  │
│  + calculate_indices(image) → dict                   │
│    # NDWI, NDVI, FAI (Floating Algae Index)          │
│  + store_image(image, obs_id) → str                  │
│    # Uploads to MinIO, returns URL                   │
│  + calculate_risk_score() → float                    │
└─────────────────────────────────────────────────────┘
```

---

### 5.5 Vessel Agent

```
┌─────────────────────────────────────────────────────┐
│                   VesselAgent                        │
│             extends BaseAgent                        │
├─────────────────────────────────────────────────────┤
│  - ais_provider: AISProvider                         │
│  - geo_utils: GeoUtils                               │
│  - active_risk_zones: list[Polygon]  # from Redis    │
├─────────────────────────────────────────────────────┤
│  + run() → VesselEvent                               │
│  + fetch_ais_stream() → list[AISMessage]             │
│  + parse_ais_message(msg) → VesselPosition           │
│  + check_vessels_in_risk_zones(positions, zones)     │
│    → list[VesselInRisk]                              │
│  + detect_distress_signals(positions) → list[Vessel] │
│    # Zero-speed + distress flag from AIS             │
│  + detect_unusual_behavior(track) → bool             │
│    # Stationary in storm path, sudden direction change│
│  + calculate_risk_score() → float                    │
│    # Ratio of vessels in high-risk zones             │
└─────────────────────────────────────────────────────┘
```

---

### 5.6 Ecosystem Agent

```
┌─────────────────────────────────────────────────────┐
│                  EcosystemAgent                      │
│             extends BaseAgent                        │
├─────────────────────────────────────────────────────┤
│  - gbif_provider: GBIFProvider                       │
│  - coral_db_provider: CoralWatchProvider             │
│  - BLEACHING_SST_THRESHOLD = 30.0                    │
│  - PROTECTED_ZONES: list[Polygon]                    │
├─────────────────────────────────────────────────────┤
│  + run() → EcosystemEvent                            │
│  + assess_coral_bleaching_risk(sst_c) → float        │
│    # Uses Degree Heating Weeks formula               │
│  + check_protected_area_violations(vessel_positions) │
│    → list[Violation]                                 │
│  + fetch_species_sightings(region) → list[Sighting]  │
│  + calculate_biodiversity_index(sightings) → float   │
│  + calculate_risk_score() → float                    │
└─────────────────────────────────────────────────────┘
```

---

### 5.7 Disaster Reasoning Agent

```
┌─────────────────────────────────────────────────────┐
│             DisasterReasoningAgent                   │
│             extends BaseAgent                        │
├─────────────────────────────────────────────────────┤
│  - risk_scorer: RiskScorer                           │
│  - ml_model: XGBClassifier  # pre-trained           │
│  - DISASTER_THRESHOLDS: dict                         │
│  - domain_events: dict  # keyed by agent_id          │
├─────────────────────────────────────────────────────┤
│  + run(domain_events: dict) → RiskAssessment         │
│  + apply_rule_based_checks(events) → list[RuleFlag]  │
│    # e.g., if wind > 120 AND pressure < 980 → CYCLONE│
│  + apply_ml_scoring(events) → dict[DisasterType, float]│
│  + classify_disaster(flags, scores) → DisasterType   │
│  + assign_severity(probability, impact) → int        │
│    # 1 (minor) to 5 (catastrophic)                   │
│  + identify_affected_zones(event, disaster_type)     │
│    → list[Polygon]                                   │
│  + generate_preliminary_actions(disaster_type)       │
│    → list[str]                                       │
└─────────────────────────────────────────────────────┘
```

---

### 5.8 Coordinator Agent

```
┌─────────────────────────────────────────────────────┐
│                CoordinatorAgent                      │
│             extends BaseAgent                        │
├─────────────────────────────────────────────────────┤
│  - dag: LangGraphDAG                                 │
│  - llm_synthesizer: LLMSynthesizer                   │
│  - alert_service_client: AlertServiceClient          │
│  - domain_agents: list[BaseAgent]                    │
│  - confidence_weights: dict  # per agent             │
├─────────────────────────────────────────────────────┤
│  + orchestrate() → FinalAssessment                   │
│    # Main entry point — runs the full DAG            │
│  + dispatch_domain_agents() → list[Future[OrcaEvent]]│
│    # Runs all 5 domain agents concurrently           │
│  + wait_for_domain_agents(futures) → dict[OrcaEvent] │
│  + resolve_conflicts(events) → dict                  │
│    # When agents disagree, weight by confidence      │
│  + synthesize_with_llm(risk_assessment) → str        │
│    # Calls LLMSynthesizer, returns explanation       │
│  + check_alert_threshold(assessment) → bool          │
│  + dispatch_alert(assessment, explanation)           │
│  + update_risk_zones(assessment)                     │
│    # Updates Redis + notifies WebSocket clients      │
└─────────────────────────────────────────────────────┘
```

---

## 6. Class Diagrams – Services

### 6.1 Alert Service

```
┌─────────────────────────────────────────────────────┐
│                   AlertService                       │
├─────────────────────────────────────────────────────┤
│  - db: AsyncSession                                  │
│  - notification_service: NotificationService         │
│  - ws_manager: WebSocketManager                      │
├─────────────────────────────────────────────────────┤
│  + create_alert(assessment: RiskAssessment) → Alert  │
│  + get_alerts(filters: AlertFilters) → list[Alert]   │
│  + get_alert_by_id(alert_id: UUID) → Alert           │
│  + acknowledge_alert(alert_id, user_id) → Alert      │
│  + resolve_alert(alert_id, note: str) → Alert        │
│  + get_active_zones() → list[GeoJSON]               │
│  - _determine_affected_vessels(zone) → list[str]     │
│  - _estimate_population_at_risk(zone) → int          │
└─────────────────────────────────────────────────────┘
```

---

### 6.2 LLM Synthesizer

```
┌─────────────────────────────────────────────────────┐
│                  LLMSynthesizer                      │
├─────────────────────────────────────────────────────┤
│  - llm: ChatGoogleGenerativeAI | ChatOpenAI          │
│  - rag_engine: RAGEngine                             │
│  - SYSTEM_PROMPT: str                                │
├─────────────────────────────────────────────────────┤
│  + synthesize(risk_assessment: RiskAssessment,       │
│               domain_events: dict) → SynthesisResult │
│  + generate_explanation(context: str) → str          │
│  + generate_recommendations(disaster_type: str,      │
│                              retrieved_docs: list)   │
│    → list[str]                                       │
│  + format_agent_evidence(events: dict) → str         │
│    # Converts agent outputs to LLM-readable string   │
└─────────────────────────────────────────────────────┘
```

---

### 6.3 RAG Engine

```
┌─────────────────────────────────────────────────────┐
│                    RAGEngine                         │
├─────────────────────────────────────────────────────┤
│  - vectorstore: PGVectorStore | ChromaDB             │
│  - embedder: GoogleGenerativeAIEmbeddings            │
│  - retriever: VectorStoreRetriever                   │
│  - TOP_K: int = 5                                    │
├─────────────────────────────────────────────────────┤
│  + retrieve(query: str) → list[Document]             │
│  + add_document(doc: KnowledgeDocument)              │
│  + similarity_search(query, k) → list[Document]      │
│  + get_relevant_sops(disaster_type: str)             │
│    → list[Document]                                  │
└─────────────────────────────────────────────────────┘
```

---

### 6.4 WebSocket Manager

```
┌─────────────────────────────────────────────────────┐
│                 WebSocketManager                     │
├─────────────────────────────────────────────────────┤
│  - connections: dict[str, WebSocket]                 │
│    # user_id → WebSocket                             │
│  - zone_subscriptions: dict[str, list[str]]          │
│    # zone_id → list of user_ids                      │
├─────────────────────────────────────────────────────┤
│  + connect(websocket, user_id: str)                  │
│  + disconnect(user_id: str)                          │
│  + broadcast(event: dict)                            │
│    # Send to all connected clients                   │
│  + broadcast_to_zone(zone_id, event: dict)           │
│    # Send to clients subscribed to a zone            │
│  + send_personal(user_id, event: dict)               │
│  + handle_subscription(user_id, zone: dict)          │
└─────────────────────────────────────────────────────┘
```

---

## 7. LangGraph DAG Specification

### 7.1 Graph State Definition

```python
# agents/reasoning/langgraph_dag.py

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
import operator

class OrcaGraphState(TypedDict):
    # Inputs
    trigger_reason: str          # "SCHEDULED" | "WEBHOOK" | "MANUAL"
    target_regions: list[dict]   # List of {lat_min, lat_max, lon_min, lon_max}

    # Domain agent outputs (accumulated)
    weather_event: dict
    ocean_event: dict
    satellite_event: dict
    vessel_event: dict
    ecosystem_event: dict

    # Reasoning outputs
    risk_assessment: dict        # From DisasterReasoningAgent
    llm_explanation: str         # From LLMSynthesizer
    retrieved_docs: list[dict]   # From RAGEngine

    # Final outputs
    final_alert_level: str       # GREEN/YELLOW/ORANGE/RED
    should_alert: bool
    recommended_actions: list[str]

    # Metadata
    errors: Annotated[list, operator.add]  # Accumulated errors
    run_id: str
    started_at: str
```

---

### 7.2 DAG Node Definitions

```python
# Node names and their handler functions

NODES = {
    "weather_node":     run_weather_agent,        # → weather_event
    "ocean_node":       run_ocean_agent,           # → ocean_event
    "satellite_node":   run_satellite_agent,       # → satellite_event
    "vessel_node":      run_vessel_agent,           # → vessel_event
    "ecosystem_node":   run_ecosystem_agent,        # → ecosystem_event
    "reasoning_node":   run_disaster_reasoning,    # → risk_assessment
    "rag_node":         retrieve_relevant_docs,    # → retrieved_docs
    "synthesis_node":   synthesize_with_llm,       # → llm_explanation
    "threshold_node":   check_alert_threshold,     # → should_alert
    "alert_node":       dispatch_alert,            # → creates DB record
    "end_node":         update_dashboard,          # → notifies WebSocket
}
```

---

### 7.3 DAG Edge Definitions

```python
# Parallel domain agents → reasoning → synthesis → alert decision

graph = StateGraph(OrcaGraphState)

# Add all nodes
for name, fn in NODES.items():
    graph.add_node(name, fn)

# Parallel fan-out from START
graph.set_entry_point("weather_node")   # or use parallel edges
graph.add_edge("weather_node", "reasoning_node")
graph.add_edge("ocean_node", "reasoning_node")
graph.add_edge("satellite_node", "reasoning_node")
graph.add_edge("vessel_node", "reasoning_node")
graph.add_edge("ecosystem_node", "reasoning_node")

# Sequential after reasoning
graph.add_edge("reasoning_node", "rag_node")
graph.add_edge("rag_node", "synthesis_node")
graph.add_edge("synthesis_node", "threshold_node")

# Conditional edge: alert only if threshold met
graph.add_conditional_edges(
    "threshold_node",
    lambda state: "alert_node" if state["should_alert"] else "end_node",
    {"alert_node": "alert_node", "end_node": "end_node"}
)

graph.add_edge("alert_node", "end_node")
graph.add_edge("end_node", END)

orca_graph = graph.compile()
```

---

### 7.4 Coordinator Invocation

```python
async def run_orca_cycle(trigger_reason: str, regions: list):
    initial_state = OrcaGraphState(
        trigger_reason=trigger_reason,
        target_regions=regions,
        run_id=str(uuid4()),
        started_at=datetime.utcnow().isoformat(),
        errors=[]
    )
    result = await orca_graph.ainvoke(initial_state)
    return result
```

---

## 8. Celery Task Design

### 8.1 Celery Application

```python
# backend/app/tasks/celery_app.py

from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "orca",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/1",
    include=["app.tasks.agent_scheduler", "app.tasks.notification_tasks"]
)

celery_app.conf.beat_schedule = {
    # Run full ORCA agent cycle every 15 minutes
    "orca-agent-cycle": {
        "task": "app.tasks.agent_scheduler.run_full_cycle",
        "schedule": crontab(minute="*/15"),
    },
    # Update vessel positions every 2 minutes
    "vessel-position-update": {
        "task": "app.tasks.agent_scheduler.update_vessel_positions",
        "schedule": crontab(minute="*/2"),
    },
    # Satellite analysis once every 6 hours
    "satellite-analysis": {
        "task": "app.tasks.agent_scheduler.run_satellite_analysis",
        "schedule": crontab(hour="*/6", minute=0),
    },
    # Clean old weather/ocean data (> 30 days)
    "data-cleanup": {
        "task": "app.tasks.agent_scheduler.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0),  # 3 AM daily
    }
}
```

---

### 8.2 Key Celery Tasks

```python
# Task 1: Main agent cycle
@celery_app.task(name="run_full_cycle", bind=True,
                 max_retries=3, default_retry_delay=60)
def run_full_cycle(self):
    """Triggers the full LangGraph agent DAG."""
    try:
        result = asyncio.run(run_orca_cycle("SCHEDULED", ALL_REGIONS))
        return {"status": "SUCCESS", "run_id": result["run_id"]}
    except Exception as exc:
        self.retry(exc=exc)

# Task 2: Notification dispatch
@celery_app.task(name="send_alert_notifications", queue="notifications")
def send_alert_notifications(alert_id: str, channels: list[str]):
    """Sends alert via SMS, Email, Push based on channels list."""
    alert = get_alert(alert_id)
    affected_users = get_users_in_zone(alert["affected_zone"])
    for user in affected_users:
        if "sms" in channels and user.phone:
            send_sms.delay(user.phone, format_sms_message(alert))
        if "email" in channels and user.email:
            send_email.delay(user.email, format_email(alert))

# Task 3: Satellite processing
@celery_app.task(name="process_satellite_tile", queue="heavy_compute",
                 time_limit=300)  # 5 min max
def process_satellite_tile(tile_url: str, bbox: dict, obs_id: str):
    """Download and analyze a satellite tile. Heavy task in separate queue."""
    tile = download_tile(tile_url)
    results = image_processor.analyze(tile)
    update_observation(obs_id, results)
    publish_satellite_event(obs_id, results)
```

---

### 8.3 Task Queues

| Queue | Workers | Tasks | Priority |
|-------|---------|-------|----------|
| `default` | 4 | Full agent cycle, scheduling | Normal |
| `notifications` | 2 | SMS, Email, Push sends | High |
| `heavy_compute` | 2 | Satellite image processing | Low |
| `vessel` | 2 | AIS position updates | Normal |

---

## 9. Redis Channel Schema

### 9.1 Agent Pub/Sub Channels

| Channel | Publisher | Subscribers | Message Type |
|---------|-----------|-------------|-------------|
| `orca:weather_data` | WeatherAgent | DisasterReasoningAgent, Coordinator | WeatherEvent |
| `orca:ocean_data` | OceanAgent | DisasterReasoningAgent, EcosystemAgent, Coordinator | OceanEvent |
| `orca:satellite_events` | SatelliteAgent | DisasterReasoningAgent, VesselAgent, Coordinator | SatelliteEvent |
| `orca:vessel_positions` | VesselAgent | DisasterReasoningAgent, Frontend (via WS) | VesselEvent |
| `orca:ecosystem_health` | EcosystemAgent | DisasterReasoningAgent, Coordinator | EcosystemEvent |
| `orca:risk_assessment` | DisasterReasoningAgent | CoordinatorAgent | RiskAssessment |
| `orca:final_alert` | CoordinatorAgent | AlertService, WebSocketManager | FinalAlert |

---

### 9.2 Redis Cache Keys

| Key Pattern | TTL | Value | Purpose |
|-------------|-----|-------|---------|
| `weather:current:{lat}:{lon}` | 15 min | WeatherData JSON | Avoid repeated API calls |
| `ocean:sst:{bbox_hash}` | 30 min | SST grid JSON | Large grid data cache |
| `vessel:positions:all` | 2 min | GeoJSON FeatureCollection | Pre-built for map API |
| `alerts:active:geojson` | 5 min | GeoJSON risk zones | Pre-built for map API |
| `agent:status:{agent_id}` | 30 min | AgentStatus JSON | Agent health display |
| `session:{user_id}` | 7 days | Refresh token | Token validation |
| `rate_limit:{ip}:{endpoint}` | 1 min | Request count | Rate limiting |

---

## 10. Sequence Diagrams

### 10.1 Full Agent Cycle (Core Flow)

```
Celery      Coordinator    WeatherAgent  OceanAgent  DisasterAgent  AlertSvc  WebSocket
Beat        Agent                                    (simplified)
 │              │               │            │            │             │          │
 │ trigger()    │               │            │            │             │          │
 │─────────────►│               │            │            │             │          │
 │              │ dispatch()    │            │            │             │          │
 │              │──────────────►│            │            │             │          │
 │              │──────────────────────────► │            │             │          │
 │              │          (parallel, all agents...)                    │          │
 │              │               │            │            │             │          │
 │              │               │ fetch()    │            │             │          │
 │              │               │──►OpenMeteo│            │             │          │
 │              │               │◄──data─────│            │             │          │
 │              │               │ process()  │            │             │          │
 │              │               │ publish()  │            │             │          │
 │              │               │──►Redis[weather_data]   │             │          │
 │              │               │            │ fetch()    │             │          │
 │              │               │            │──►Copernicus            │          │
 │              │               │            │◄──data──── │            │          │
 │              │               │            │ publish()  │             │          │
 │              │               │            │──►Redis[ocean_data]     │          │
 │              │               │            │            │             │          │
 │              │◄──all_events──────────────────────────── │            │          │
 │              │ run_reasoning()            │            │             │          │
 │              │──────────────────────────────────────►  │            │          │
 │              │               │            │   rule_check()          │          │
 │              │               │            │   ml_score()            │          │
 │              │               │            │◄──RiskAssessment────── │          │
 │              │ llm_synthesize()           │            │             │          │
 │              │──►Gemini API              │            │             │          │
 │              │◄──explanation──           │            │             │          │
 │              │ check_threshold()          │            │             │          │
 │              │ [threshold exceeded]       │            │             │          │
 │              │ create_alert()             │            │             │          │
 │              │────────────────────────────────────────────────────►│          │
 │              │               │            │            │   store()   │          │
 │              │               │            │            │◄──alert_id─ │          │
 │              │ send_notification()        │            │             │          │
 │              │────────────────────────────────────────────────────────────────►│
 │              │               │            │            │             │  broadcast()
 │              │               │            │            │             │◄──────── │
```

---

### 10.2 User Login Flow

```
Browser         FastAPI         AuthService     PostgreSQL     Redis
  │                │                │               │             │
  │ POST /auth/login               │               │             │
  │ {email, password}              │               │             │
  │───────────────►│               │               │             │
  │                │ authenticate()│               │             │
  │                │───────────────►               │             │
  │                │               │ SELECT user   │             │
  │                │               │ WHERE email=? │             │
  │                │               │──────────────►│             │
  │                │               │◄──user_row────│             │
  │                │               │ verify_password()           │
  │                │               │ [bcrypt compare]            │
  │                │               │ generate_jwt()              │
  │                │               │ generate_refresh_token()    │
  │                │               │ store refresh_token         │
  │                │               │──────────────────────────►  │
  │                │               │◄──OK──────────────────────  │
  │                │               │ update last_login           │
  │                │               │──────────────►│             │
  │                │◄──tokens──────│               │             │
  │◄──200 {access_token,          │               │             │
  │        refresh_token}         │               │             │
  │                │               │               │             │
  │ (subsequent requests)          │               │             │
  │ GET /alerts                    │               │             │
  │ Authorization: Bearer <token>  │               │             │
  │───────────────►│               │               │             │
  │                │ verify_jwt()   │               │             │
  │                │ [decode + validate signature]  │             │
  │                │ [check expiry]                 │             │
  │                │ [extract user_id + role]        │             │
  │                │ fetch from Redis cache         │             │
  │                │──────────────────────────────►  │
  │                │◄──cached alerts───────────────  │
  │◄──200 {alerts}─│               │               │             │
```

---

### 10.3 Real-Time Map Update Flow

```
Browser         WebSocket      Redis Pub/Sub    CoordinatorAgent
(Leaflet map)   Manager                         (background)
  │                │                │               │
  │ WS connect     │                │               │
  │───────────────►│                │               │
  │ {type: AUTH, token: "..."}      │               │
  │───────────────►│                │               │
  │                │ verify_jwt()   │               │
  │                │ register(user_id, ws)          │
  │◄──AUTH_SUCCESS─│                │               │
  │                │                │               │
  │ {type: SUBSCRIBE, radius: 200km}│               │
  │───────────────►│                │               │
  │                │ add_zone_subscription()        │
  │◄──ACK──────────│                │               │
  │                │                │               │
  │                │                │ [Coordinator completes cycle]
  │                │                │◄──PUBLISH final_alert──────│
  │                │◄──MESSAGE──────│               │
  │                │ find_subscribed_clients()       │
  │                │ [user is in affected zone]     │
  │◄──ALERT_CREATED│                │               │
  │ {alert_level: "RED",            │               │
  │  title: "Cyclone Warning",      │               │
  │  zone_polygon: {...}}           │               │
  │                │                │               │
  │ [Leaflet renders red zone]      │               │
  │ [Alert card appears in feed]    │               │
```

---

### 10.4 Alert Acknowledgment Flow

```
Officer      Browser        FastAPI       AlertService   PostgreSQL   WebSocket
  │              │              │               │              │          │
  │ Click "Acknowledge"         │               │              │          │
  │─────────────►│              │               │              │          │
  │              │ PATCH /alerts/{id}/acknowledge              │          │
  │              │──────────────►              │              │          │
  │              │              │ get_current_user()           │          │
  │              │              │ [from JWT]    │              │          │
  │              │              │ check_role()  │              │          │
  │              │              │ [coast_guard or ndma_admin]  │          │
  │              │              │ acknowledge_alert()          │          │
  │              │              │──────────────►│              │          │
  │              │              │               │ UPDATE alerts│          │
  │              │              │               │ SET ack_by=? │          │
  │              │              │               │──────────────►          │
  │              │              │               │◄──OK──────── │          │
  │              │              │               │ log_action() │          │
  │              │              │               │─────────────────────────►
  │              │              │◄──alert_obj───│              │          │
  │              │◄──200 {ack}──│               │              │          │
  │ [UI updates: │              │               │              │          │
  │  badge shows │              │               │              │          │
  │  "Acknowledged by Cmdr K"]  │               │              │          │
```

---

### 10.5 Satellite Image Processing Flow

```
Scheduler    Celery Worker   SatelliteAgent  Sentinel API   MinIO    DB
  │               │               │               │           │       │
  │ every 6h      │               │               │           │       │
  │ trigger()     │               │               │           │       │
  │──────────────►│               │               │           │       │
  │               │ run()         │               │           │       │
  │               │──────────────►│               │           │       │
  │               │               │ query_latest_scenes()     │       │
  │               │               │──────────────►│           │       │
  │               │               │◄──scene_urls──│           │       │
  │               │               │               │           │       │
  │               │               │ download_tile(url)        │       │
  │               │               │──────────────►│           │       │
  │               │               │◄──GeoTIFF─────│           │       │
  │               │               │               │           │       │
  │               │               │ preprocess_image()        │       │
  │               │               │ detect_oil_spill()        │       │
  │               │               │ detect_algal_bloom()      │       │
  │               │               │ calculate_indices()       │       │
  │               │               │               │           │       │
  │               │               │ store_image(tiff)         │       │
  │               │               │──────────────────────────►│       │
  │               │               │◄──image_url───────────────│       │
  │               │               │               │           │       │
  │               │               │ save_observation()        │       │
  │               │               │──────────────────────────────────►│
  │               │               │◄──obs_id──────────────────────────│
  │               │               │               │           │       │
  │               │               │ publish(satellite_event)  │       │
  │               │               │──►Redis[satellite_events] │       │
  │               │◄──SUCCESS─────│               │           │       │
```

---

## 11. Environment & Configuration

### 11.1 `.env.example`

```bash
# ─── Application ───────────────────────────────────────────
APP_NAME=ORCA
APP_ENV=development        # development | staging | production
APP_VERSION=1.0.0
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=true

# ─── Database ──────────────────────────────────────────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=orca_db
POSTGRES_USER=orca_user
POSTGRES_PASSWORD=change-in-production
DATABASE_URL=postgresql+asyncpg://orca_user:change@postgres:5432/orca_db

# ─── Redis ─────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# ─── MinIO (Object Storage) ────────────────────────────────
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=orca-satellite-images

# ─── AI / LLM ──────────────────────────────────────────────
GOOGLE_API_KEY=your-google-gemini-api-key
OPENAI_API_KEY=your-openai-api-key-optional
LLM_PROVIDER=google          # google | openai | local
LLM_MODEL=gemini-1.5-pro
FALLBACK_TO_TEMPLATE=true    # If LLM fails, use template responses

# ─── External Data APIs ────────────────────────────────────
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
COPERNICUS_MARINE_USER=your-cmems-username
COPERNICUS_MARINE_PASS=your-cmems-password
SENTINEL_HUB_CLIENT_ID=your-sentinel-hub-client-id
SENTINEL_HUB_CLIENT_SECRET=your-sentinel-hub-secret
AISHUB_USERNAME=your-aishub-username
GBIF_BASE_URL=https://api.gbif.org/v1

# ─── Notifications ─────────────────────────────────────────
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_NUMBER=+1234567890
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=alerts@orca.gov.in
FIREBASE_SERVER_KEY=your-firebase-server-key

# ─── JWT ───────────────────────────────────────────────────
JWT_SECRET_KEY=your-jwt-secret-different-from-app-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ─── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,https://orca.sih2026.in

# ─── Agent Config ──────────────────────────────────────────
AGENT_CYCLE_INTERVAL_MINUTES=15
VESSEL_UPDATE_INTERVAL_MINUTES=2
SATELLITE_ANALYSIS_INTERVAL_HOURS=6
ALERT_THRESHOLD_PROBABILITY=0.65    # Min probability to raise alert
ALERT_THRESHOLD_CONFIDENCE=0.60     # Min confidence to raise alert
```

---

### 11.2 `docker-compose.yml` (Core Services)

```yaml
version: "3.9"

services:
  # ── Nginx Reverse Proxy ──────────────────────────────────
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on: [frontend, backend]
    networks: [orca-net]

  # ── React Frontend ───────────────────────────────────────
  frontend:
    build: ./frontend
    expose: ["3000"]
    environment:
      - VITE_API_BASE_URL=http://nginx/api/v1
      - VITE_WS_URL=ws://nginx/ws
    networks: [orca-net]

  # ── FastAPI Backend ──────────────────────────────────────
  backend:
    build: ./backend
    expose: ["8000"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=${REDIS_HOST}
    env_file: [.env]
    depends_on: [postgres, redis]
    networks: [orca-net]

  # ── AI Agents ────────────────────────────────────────────
  agents:
    build: ./agents
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    env_file: [.env]
    depends_on: [redis, postgres]
    networks: [orca-net]

  # ── Celery Worker ────────────────────────────────────────
  celery-worker:
    build: ./backend
    command: celery -A app.tasks.celery_app worker --loglevel=info -Q default,notifications
    env_file: [.env]
    depends_on: [redis, backend]
    networks: [orca-net]

  # ── Celery Beat (Scheduler) ──────────────────────────────
  celery-beat:
    build: ./backend
    command: celery -A app.tasks.celery_app beat --loglevel=info
    env_file: [.env]
    depends_on: [redis, celery-worker]
    networks: [orca-net]

  # ── PostgreSQL + PostGIS ─────────────────────────────────
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks: [orca-net]

  # ── Redis ────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks: [orca-net]

  # ── MinIO (Object Storage) ───────────────────────────────
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    networks: [orca-net]

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  orca-net:
    driver: bridge
```

---

## 12. Phased Implementation Plan

### Week 1 – Foundation (Days 1–7)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1 | Set up monorepo, Docker Compose, GitHub | DevOps | Repo structure running |
| 1 | Initialize PostgreSQL + PostGIS, run schema | Backend | DB ready |
| 2 | FastAPI skeleton: auth endpoints (register/login/refresh) | Backend | JWT auth working |
| 2 | React skeleton: Login page + protected routing | Frontend | Login flow |
| 3 | Weather Agent + Open-Meteo integration | AI | Agent returns data |
| 3 | Ocean Agent + ERDDAP/Copernicus integration | AI | Agent returns SST |
| 4 | Celery + Redis setup, basic scheduler | Backend | Tasks queue running |
| 4 | Alert Service: create/list/acknowledge | Backend | Alert CRUD |
| 5 | Vessel Agent + AIS integration | AI | Vessel positions |
| 5 | Dashboard page: alert feed, agent status panel | Frontend | Basic dashboard |
| 6 | Satellite Agent: Sentinel tile download + basic analysis | AI | Tile downloaded |
| 6 | Map component: Leaflet + vessel layer + risk zones | Frontend | Map renders |
| 7 | Integration testing: Weather→Coordinator→Alert pipeline | All | End-to-end |

---

### Week 2 – AI Reasoning Core (Days 8–14)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 8 | LangGraph DAG: graph definition, state schema | AI | DAG compiles |
| 8 | Disaster Reasoning Agent: rule-based checks | AI | Risk classification |
| 9 | Coordinator Agent: orchestrate DAG, conflict resolution | AI | Full cycle runs |
| 9 | LLM Synthesizer: Gemini Pro integration | AI | Explanations generated |
| 10 | RAG Engine: load SOP documents, pgvector search | AI | RAG returns docs |
| 10 | WebSocket server: connection manager, broadcast | Backend | WS events sent |
| 11 | Frontend WebSocket hook: real-time alert feed | Frontend | Live updates |
| 11 | Alert notifications: Twilio SMS + SendGrid Email | Backend | SMS/Email sent |
| 12 | Ecosystem Agent + GBIF integration | AI | Agent returns data |
| 12 | Risk heatmap layer on Leaflet map | Frontend | Heatmap renders |
| 13 | ML model integration (XGBoost risk scorer) | AI | Probability scores |
| 13 | Satellite: oil spill + algal bloom classification | AI | Detection working |
| 14 | Full agent cycle end-to-end test with real data | All | Full pipeline |

---

### Week 3 – Polish & Testing (Days 15–19)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 15 | Unit tests: all 7 agents | AI | 80% coverage |
| 15 | API integration tests: all endpoints | Backend | Test suite passes |
| 16 | Error handling, fallback logic (LLM down, API down) | All | Graceful degradation |
| 16 | Dashboard polish: charts, animations, responsive design | Frontend | Premium UI |
| 17 | Security review: input validation, rate limiting, RBAC | Backend | Security hardened |
| 17 | Performance: Redis caching, DB query optimization | Backend | Load tested |
| 18 | Historical data viewer page | Frontend | History works |
| 18 | Mobile-responsive design pass | Frontend | Works on phone |
| 19 | Full system demo run (simulate cyclone scenario) | All | Demo script ready |

---

### Week 4 – SIH Demo Prep (Days 20–21)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 20 | Seed realistic demo data (Bay of Bengal scenario) | All | Demo data loaded |
| 20 | Presentation slides: architecture, demo flow | All | Slides ready |
| 21 | Final deployment, URL live, backup demo video | DevOps | System live |

---

### Development Standards

```
Branch Strategy:
  main          → production-ready code only
  develop       → integration branch
  feature/xxx   → feature branches (PR into develop)

Commit Convention:
  feat: add weather agent SST anomaly detection
  fix: correct cyclone risk score threshold
  docs: update LLD with Celery task design
  test: add ocean agent unit tests

PR Rules:
  - All PRs require 1 reviewer approval
  - All tests must pass before merge
  - No direct commits to main or develop
```

---

*LLD v1.0 | ORCA Team | SIH 2026 | PS ID: SIH26176*
*Phase 3 (Project Setup) begins after LLD approval.*
