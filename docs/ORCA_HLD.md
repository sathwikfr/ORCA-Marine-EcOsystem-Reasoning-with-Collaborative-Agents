# ORCA – Marine EcOsystem Reasoning with Collaborative Agents
## High-Level Design Document (HLD)
### Smart India Hackathon 2026 | PS ID: SIH26176
**Version:** 1.0 | **Status:** Draft for Review | **Date:** September 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Layered Architecture](#3-layered-architecture)
4. [AI Agent Design](#4-ai-agent-design)
5. [System Modules](#5-system-modules)
6. [Data Flow](#6-data-flow)
7. [Reasoning Architecture](#7-reasoning-architecture)
8. [Data Sources](#8-data-sources)
9. [Database Design](#9-database-design)
10. [Technology Stack](#10-technology-stack)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Architecture Diagrams](#13-architecture-diagrams)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Future Enhancements](#15-future-enhancements)
16. [Trade-offs](#16-trade-offs)

---

## 1. Executive Summary

### 1.1 Problem Context

India's coastline spans **7,516 km**, supporting millions of fishing communities, ports, and marine ecosystems. Threats such as cyclones, oil spills, tsunamis, algal blooms, and ocean temperature anomalies cause devastating economic and ecological losses. Current disaster management systems operate in silos — weather data is separate from ocean data, satellite imagery is analyzed independently, and vessel tracking has no link to ecosystem health.

**ORCA** bridges these gaps.

### 1.2 What ORCA Does

ORCA is a **multi-agent AI decision support system** that:
- **Monitors** marine ecosystems continuously using real-time heterogeneous data
- **Predicts** disasters (cyclones, tsunamis, harmful algal blooms, oil spills) using collaborative AI reasoning
- **Explains** its recommendations in plain language to disaster management authorities
- **Alerts** stakeholders (coast guard, fishermen, port authorities) in time to act

### 1.3 Design Philosophy

> "One brain, many specialists."

Just like a hospital has specialists (cardiologist, neurologist) who collaborate to diagnose a patient, ORCA has specialized AI agents that each understand one domain deeply. A **Coordinator Agent** orchestrates them and synthesizes a final risk assessment.

### 1.4 Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Modularity** | Every agent and module is independently replaceable |
| **Explainability** | Every alert carries a reason chain, not just a score |
| **Scalability** | Designed to scale from prototype to ISRO/INCOIS production |
| **Openness** | Prototype uses free public APIs; production integrates official ISRO/IMD feeds |
| **Simplicity** | No unnecessary complexity — every component has one clear job |

---

## 2. Architecture Overview

### 2.1 High-Level Mental Model

Think of ORCA as a **command center with specialist analysts**:

```
 WORLD                    ORCA COMMAND CENTER                   AUTHORITIES
 ─────                    ──────────────────                    ───────────
 Satellite images  ──►   Satellite Agent   ──►  Coordinator   ──►  Dashboard
 Ocean buoys       ──►   Ocean Agent       ──►  Agent         ──►  SMS/Email
 Weather stations  ──►   Weather Agent     ──►  (Reasoning)   ──►  App Push
 AIS ship signals  ──►   Vessel Agent      ──►               ──►  WhatsApp
 Ecosystem sensors ──►   Ecosystem Agent   ──►
                         Disaster Agent    ──►
```

### 2.2 System Layers at a Glance

```
┌────────────────────────────────────────────────────────────┐
│                     1. USER LAYER                          │
│         (Fishermen, Coast Guard, NDMA, Port Auth)          │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                   2. FRONTEND LAYER                        │
│         (React Dashboard, Interactive Map, Alerts UI)      │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                   3. BACKEND LAYER                         │
│       (FastAPI Gateway, REST APIs, WebSocket Server)       │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                4. AI AGENT LAYER                           │
│   (Weather, Ocean, Satellite, Vessel, Ecosystem, Disaster, │
│                    Coordinator Agents)                     │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                 5. REASONING LAYER                         │
│      (LangGraph Orchestration, LLM Explainer, RAG)         │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│               6. DATA PROVIDER LAYER                       │
│   (Open-Meteo, Sentinel Hub, AIS, ERDDAP, GBIF, INCOIS)    │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                  7. STORAGE LAYER                          │
│      (PostgreSQL + PostGIS, Redis, MinIO, Vector DB)       │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│               8. NOTIFICATION LAYER                        │
│         (SMS, Email, Push, WhatsApp, WebSocket)            │
└────────────────────────────────────────────────────────────┘

 ─── Cross-cutting: SECURITY LAYER (JWT, OAuth2, TLS, RBAC)
 ─── Cross-cutting: DEPLOYMENT LAYER (Docker, Kubernetes-ready)
```

---

## 3. Layered Architecture

Each layer has exactly **one job**. Layers only communicate downward (or through defined interfaces).

### 3.1 Layer 1 – User Layer

**Who:** Disaster management authorities, NDMA officials, coast guard officers, port administrators, fishermen (via mobile).

**What they need:** Simple, fast, actionable information. They are NOT data scientists.

**Design principle:** ORCA hides complexity. Users see risk scores, maps, and plain-language recommendations — never raw model outputs.

**User types and permissions:**

| User Type | Access Level | Key Capability |
|-----------|-------------|----------------|
| NDMA Admin | Full | Manage alerts, view all zones |
| Coast Guard Officer | Regional | View risk maps, dispatch teams |
| Port Authority | Port-specific | Vessel tracking, dock safety |
| Fisherman (Mobile) | Public | Safe fishing zone, weather alert |
| Researcher | Read-only | Data export, historical analysis |

---

### 3.2 Layer 2 – Frontend Layer

**Technology:** React.js + Leaflet.js (maps) + Chart.js (charts)

**Responsibility:** Render real-time data visually. Handle user authentication. Display alerts. Show AI explanations.

**Key components:**
- **Interactive Ocean Map** — color-coded risk zones, vessel positions, storm tracks
- **Alert Dashboard** — real-time alert feed with severity levels (Green / Yellow / Orange / Red)
- **Agent Status Panel** — shows which agents are active, last update time
- **Recommendation Panel** — plain-language AI explanation ("Cyclone risk is HIGH because sea surface temperature is 29°C and wind speed is increasing rapidly")
- **Historical Viewer** — timeline of past events for analysis

---

### 3.3 Layer 3 – Backend Layer

**Technology:** FastAPI (Python)

**Responsibility:** Handle HTTP requests, authenticate users, route requests to the correct AI agents, serve data from the database, send WebSocket updates to the frontend.

**Key responsibilities:**
- REST API for CRUD operations (users, alerts, reports)
- WebSocket server for real-time map updates
- Task queue manager (Celery + Redis) for scheduling agent runs
- API Gateway that protects AI agents from direct external access

---

### 3.4 Layer 4 – AI Agent Layer

Seven specialized agents (detailed in Section 4).

**Communication pattern:** Agents do NOT call each other directly. They publish their output to a shared **Message Bus** (Redis Pub/Sub). The Coordinator Agent subscribes to all agent outputs and synthesizes reasoning.

---

### 3.5 Layer 5 – Reasoning Layer

**Technology:** LangGraph + LLM (Gemini Pro / GPT-4 / local Ollama)

**What is LangGraph?** LangGraph is a framework for building AI agents that can plan, reason in steps, and use tools. Think of it like a programmable decision flowchart where each step can call an AI model.

**Responsibility:**
- Orchestrate multi-step agent reasoning
- Run the Coordinator Agent's synthesis logic
- Generate human-readable explanations (RAG-based)
- Produce structured risk assessments with confidence scores

---

### 3.6 Layer 6 – Data Provider Layer

**Responsibility:** Fetch, normalize, and validate data from external sources.

**Key design decision:** All external data passes through a **Data Normalization Service** before entering the system. This means changing a data source (e.g., from Open-Meteo to IMD) requires changing only this adapter — not the agents.

---

### 3.7 Layer 7 – Storage Layer

**Multiple databases for different needs:**

| Store | Technology | What it stores |
|-------|-----------|----------------|
| Primary DB | PostgreSQL + PostGIS | All structured data, spatial queries |
| Cache | Redis | Real-time agent outputs, session data |
| Object Storage | MinIO | Satellite images, raster files |
| Vector Store | ChromaDB / pgvector | Embeddings for RAG knowledge base |
| Time-Series | TimescaleDB (extension) | Ocean sensor readings over time |

---

### 3.8 Layer 8 – Notification Layer

**Technology:** Celery workers + Twilio (SMS) + SendGrid (Email) + Firebase (Push)

**Responsibility:** Deliver alerts to the right person at the right time via the right channel.

**Alert routing logic:**
- Severity RED → SMS + Push + WhatsApp (immediate)
- Severity ORANGE → Email + Dashboard notification
- Severity YELLOW → Dashboard only
- Severity GREEN → No notification (status update only)

---

### 3.9 Layer 9 – Security Layer

**Cuts across all layers — not a separate service.**

| Security Control | Implementation |
|-----------------|----------------|
| Authentication | JWT tokens (short-lived, 15 min) |
| Authorization | Role-Based Access Control (RBAC) |
| Transport Security | TLS 1.3 on all connections |
| API Security | Rate limiting, API key for external clients |
| Data Security | Encrypted at rest (AES-256) |
| Audit Logging | All user actions logged to immutable store |

---

### 3.10 Layer 10 – Deployment Layer

**Technology:** Docker (prototype), Kubernetes (production)

**Principle:** Every service runs in its own container. No shared state between containers.

---

## 4. AI Agent Design

### 4.1 Overview

Agents are designed using the **Single Responsibility Principle** — each agent is an expert in exactly one domain. No agent tries to know everything.

**Why multiple agents instead of one big AI?**
- A specialist makes fewer mistakes in its domain
- Agents can be updated independently
- Different agents can run in parallel (faster)
- Failure in one agent doesn't crash the whole system

---

### 4.2 Agent 1 – Weather Agent

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Monitor and forecast atmospheric conditions over marine regions |
| **Input** | Wind speed/direction, air pressure, humidity, rainfall, temperature from Open-Meteo API |
| **Output** | Structured JSON: `{ wind_kmph, pressure_hPa, storm_probability, cyclone_risk_score }` |
| **Responsibilities** | Fetch hourly weather data for Indian coastal zones, detect rapid pressure drops (cyclone precursor), classify storm intensity (Beaufort scale), generate 24/48/72-hour forecasts |
| **Why it exists** | Weather is the #1 input to 80% of marine disasters. Isolating this logic makes the system more accurate and testable |
| **Communicates with** | Publishes to `weather_data` channel → Coordinator, Disaster Reasoning Agent consume it |

**Internal Logic Flow:**
```
Fetch API → Parse → Validate → Detect Anomalies → Score → Publish
```

---

### 4.3 Agent 2 – Ocean Agent

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Monitor ocean conditions: temperature, salinity, currents, wave height |
| **Input** | ERDDAP/Copernicus Marine APIs: Sea Surface Temperature (SST), wave height, ocean current vectors |
| **Output** | `{ sst_celsius, wave_height_m, current_speed, upwelling_detected, anomaly_score }` |
| **Responsibilities** | Detect SST anomalies (El Niño precursors), identify dangerous wave heights for fishing vessels, track ocean current patterns, flag upwelling events |
| **Why it exists** | Ocean warming drives cyclone intensification and ecosystem collapse. This agent provides the "ocean brain" |
| **Communicates with** | Coordinator Agent, Ecosystem Agent (SST affects coral bleaching) |

---

### 4.4 Agent 3 – Satellite Agent

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Analyze satellite imagery for visual anomalies: oil spills, algal blooms, coastline changes |
| **Input** | Sentinel-2/Sentinel-3 imagery (via Copernicus Open Access Hub), NDWI/NDVI indices |
| **Output** | `{ oil_spill_detected, bloom_area_km2, bloom_type, affected_coordinates, confidence }` |
| **Responsibilities** | Download and pre-process satellite tiles, run image classification models (oil spill, HAB detection), calculate bloom area, tag geographic coordinates of anomalies |
| **Why it exists** | Oil spills and algal blooms cannot be detected from weather or ocean sensors alone — they require visual analysis |
| **Communicates with** | Publishes to `satellite_events` → Coordinator, Vessel Agent (oil spill affects safe navigation) |

---

### 4.5 Agent 4 – Vessel Agent

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Track marine vessel positions, detect distress signals, identify vessels in danger zones |
| **Input** | AIS (Automatic Identification System) data: vessel ID, position, speed, course, vessel type |
| **Output** | `{ vessels_in_risk_zone: [], distress_signals: [], collision_risk_pairs: [] }` |
| **Responsibilities** | Continuously parse AIS data stream, cross-reference vessel positions against active risk zones, detect unusual vessel behavior (stationary in storm path, distress signal), count fishing boats in dangerous areas |
| **Why it exists** | Knowing WHICH vessels are at risk enables targeted, life-saving alerts |
| **Communicates with** | Receives risk zone updates from Coordinator, sends vessel-in-danger events to Notification Layer |

---

### 4.6 Agent 5 – Ecosystem Agent

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Monitor marine biodiversity health: coral reefs, fish populations, protected species |
| **Input** | GBIF biodiversity data, coral bleaching databases, IUCN Red List APIs, SST from Ocean Agent |
| **Output** | `{ coral_bleaching_risk, biodiversity_index, protected_species_alert, ecosystem_health_score }` |
| **Responsibilities** | Correlate SST with coral bleaching thresholds, flag illegal fishing in protected zones, track biodiversity anomalies |
| **Why it exists** | Ecosystem collapse is both a symptom and a cause of marine disasters. This agent adds the ecological dimension |
| **Communicates with** | Receives SST data from Ocean Agent, sends ecosystem stress reports to Coordinator |

---

### 4.7 Agent 6 – Disaster Reasoning Agent

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Synthesize signals from multiple agents and classify disaster probability |
| **Input** | Outputs from Weather, Ocean, Satellite, Vessel, Ecosystem Agents |
| **Output** | `{ disaster_type, severity_level, probability_pct, affected_zones: [], recommended_actions: [] }` |
| **Responsibilities** | Run multi-factor risk models (rule-based + ML hybrid), classify disaster type (cyclone, tsunami, oil spill, HAB, heatwave), assign severity (1-5 scale), generate preliminary recommendations |
| **Why it exists** | No single agent has enough information to declare a disaster. This agent connects the dots |
| **Communicates with** | Receives from all domain agents, sends risk classification to Coordinator |

---

### 4.8 Agent 7 – Coordinator Agent

| Attribute | Detail |
|-----------|--------|
| **Purpose** | The "brain" — orchestrates all agents, synthesizes final decisions, generates explanations |
| **Input** | Outputs from all 6 domain agents + Disaster Reasoning Agent |
| **Output** | Final alert: `{ alert_id, alert_level, plain_language_explanation, confidence, recommended_actions, affected_population_estimate }` |
| **Responsibilities** | Schedule agent runs (polling intervals), resolve conflicts between agents, synthesize final risk assessment using LLM, generate human-readable explanation with reasoning chain, trigger notification dispatch |
| **Why it exists** | Without a coordinator, agents would produce isolated reports. The Coordinator creates **one coherent view** |
| **Orchestration pattern** | Uses LangGraph to create a DAG (Directed Acyclic Graph) of agent dependencies |

**Coordinator Decision Flow:**
```
Trigger (scheduled or event)
       │
       ▼
  Run all domain agents (parallel)
       │
       ▼
  Disaster Reasoning Agent (waits for all)
       │
       ▼
  LLM Synthesis (explain + recommend)
       │
       ▼
  Risk Score → Threshold Check
       │
    ┌──┴──┐
  ALERT  UPDATE
    │      │
  Notify  Dashboard
```

---

## 5. System Modules

### 5.1 Authentication Module
Handles user registration, login, JWT token issuance, and token refresh. Implements OAuth2 for third-party login (Google). Manages user roles and permissions. All other modules call this module to verify who is making a request before processing it.

### 5.2 Dashboard Module
The main user interface that aggregates information from all system modules. Displays real-time maps, active alerts, agent statuses, and risk trends. Designed for quick situational awareness — a duty officer should understand the current threat level within 10 seconds of looking at the screen.

### 5.3 Map Service Module
Built on Leaflet.js with GeoJSON data layers. Renders risk zones as heatmaps, vessel positions as moving icons, storm tracks as animated paths, and oil spills as polygon overlays. All coordinates are stored in PostGIS and served as GeoJSON through the backend API.

### 5.4 Weather Service Module
Backend service that wraps the Weather Agent. Exposes REST endpoints for current weather, forecasts, and historical weather data. Also exposes WebSocket endpoint for live weather updates every 15 minutes. Caches API responses in Redis to avoid hitting rate limits.

### 5.5 Marine Service Module
Backend service wrapping the Ocean Agent. Provides APIs for sea surface temperature grids, wave forecasts, and ocean current maps. Handles conversion of NetCDF/HDF5 oceanographic data formats into standard JSON for frontend consumption.

### 5.6 Satellite Service Module
Manages the download, storage, and analysis pipeline for satellite imagery. Handles large file operations asynchronously using Celery workers. Stores processed images in MinIO and serves pre-computed analysis results (not raw images) to the frontend for fast loading.

### 5.7 Alert Service Module
The central hub for alert creation, management, and lifecycle tracking. Receives risk assessments from the Coordinator Agent, applies business rules (thresholds, affected zones, population estimates), creates alert records in the database, and hands off to the Notification Module. Also manages alert acknowledgment and resolution.

### 5.8 Recommendation Engine Module
Uses Retrieval-Augmented Generation (RAG) to generate context-aware recommendations. Maintains a knowledge base of disaster response protocols (NDMA guidelines, IMO regulations, coast guard SOPs). When an alert is raised, this module retrieves the most relevant protocols and feeds them to the LLM to generate actionable recommendations in simple language.

### 5.9 Knowledge Base Module
Stores and manages structured and unstructured knowledge: past disaster case studies, SOP documents, scientific papers on marine disasters, IMO regulations. Uses vector embeddings (stored in ChromaDB/pgvector) to enable semantic search. The Recommendation Engine queries this module at runtime.

### 5.10 Logging Module
Centralized structured logging using Python's logging library with JSON output. Every agent action, API call, user action, and system event is logged with timestamp, severity, component name, and correlation ID (to trace a request through the entire system). Logs are stored in a separate append-only table.

### 5.11 Monitoring Module
System health dashboard for operators. Tracks: API response times, agent success/failure rates, data freshness (last successful fetch time for each data source), database query performance, and queue depth (how many tasks are pending). Uses simple open-source tools: Prometheus (metrics collection) + Grafana (visualization).

---

## 6. Data Flow

### 6.1 Complete System Data Flow (ASCII)

```
 DATA SOURCES                     ORCA SYSTEM                       USERS
 ────────────                     ───────────                       ─────

 Open-Meteo ──────────►  Weather Agent  ──────────────────►
 IMD (future) ─────────►                                  │
                                                           │
 ERDDAP/Copernicus ───►  Ocean Agent    ──────────────────►│
 INCOIS (future) ──────►                                  │
                                                           │
 Sentinel-2/3 ────────►  Satellite Agent ─────────────────►│
 ISRO (future) ────────►                                  │
                                                           ▼
 AIS Stream ──────────►  Vessel Agent   ──────►  Coordinator Agent
 VTS (future) ─────────►                         │  (LangGraph)     ──► Dashboard
                                                  │                  ──► Map View
 GBIF/Coral DB ───────►  Ecosystem Agent ─────►  │                  ──► Alerts
 IUCN ─────────────────►                         │
                                                  ▼
                         Disaster Reasoning Agent
                         (synthesizes all inputs)
                                  │
                                  ▼
                         Risk Assessment + Explanation
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                    ALERT CREATED      DATABASE STORED
                         │
                         ▼
                  Notification Module
                  ┌──────┬──────┬──────┐
                  ▼      ▼      ▼      ▼
                 SMS   Email  Push  WhatsApp
                  │      │      │      │
                  ▼      ▼      ▼      ▼
              Fishermen Coast  NDMA  Port
                        Guard       Auth
```

### 6.2 Step-by-Step Data Flow (Numbered)

1. **Scheduler triggers** — every 15 minutes (or on event webhook), Celery triggers the Coordinator Agent
2. **Coordinator dispatches** — Coordinator tells all 5 domain agents to start data collection (in parallel)
3. **Domain agents fetch** — each agent calls its respective external APIs and processes the data
4. **Data normalization** — each agent converts raw API data into a standard JSON schema
5. **Results published** — agents publish normalized results to Redis channels
6. **Disaster Reasoning Agent activates** — once all domain agents complete, it reads all outputs and runs risk classification
7. **Coordinator synthesizes** — Coordinator takes risk classification and generates explanation via LLM
8. **Risk stored** — full assessment saved to PostgreSQL with timestamp, location, severity
9. **Threshold check** — if severity ≥ threshold (configurable), trigger alert creation
10. **Alert created** — Alert Service creates alert record, assigns affected zones and vessels
11. **Notifications dispatched** — Notification Module sends alerts via configured channels
12. **Dashboard updates** — WebSocket pushes new data to all connected frontend clients
13. **Users receive updates** — duty officers see new alerts on dashboard; fishermen receive SMS/push

---

## 7. Reasoning Architecture

### 7.1 The Core Problem: How Do Agents Collaborate?

Individual agents produce data like:
- Weather Agent: `"Storm probability: 72%, Pressure dropping at 4 hPa/hour"`
- Ocean Agent: `"SST is 30°C, 2°C above normal"`
- Satellite Agent: `"Algal bloom detected, 340 km² area"`

None of these alone is actionable. ORCA needs to **combine them and reason about their interactions**.

### 7.2 Information Exchange Format

All agents communicate using a **standard ORCA Event Schema** (JSON):

```json
{
  "agent_id": "weather_agent",
  "timestamp": "2026-09-08T14:30:00Z",
  "region": {
    "lat_min": 8.0, "lat_max": 22.0,
    "lon_min": 68.0, "lon_max": 89.0
  },
  "observations": {
    "wind_speed_kmph": 85,
    "pressure_hPa": 998,
    "pressure_trend": "falling"
  },
  "anomalies": [
    { "type": "RAPID_PRESSURE_DROP", "severity": "HIGH", "confidence": 0.88 }
  ],
  "risk_score": 0.72,
  "metadata": {
    "data_source": "open_meteo",
    "quality_flag": "GOOD",
    "version": "1.0"
  }
}
```

This standard schema means: **any agent can read any other agent's output without custom code**.

### 7.3 LangGraph Orchestration

**What is a DAG?** A Directed Acyclic Graph is a map of tasks where each task depends on certain others, and there are no circular dependencies. Think of it as a recipe: "first gather ingredients (parallel), then cook (sequential), then plate."

ORCA's LangGraph DAG:

```
START
  │
  ├──► Weather Agent (async)
  ├──► Ocean Agent (async)
  ├──► Satellite Agent (async)
  ├──► Vessel Agent (async)
  └──► Ecosystem Agent (async)
          │
          ▼ (all complete)
     Disaster Reasoning Agent
          │
          ▼
     LLM Synthesis Node
     (Gemini Pro / GPT-4)
          │
          ▼
     Risk Threshold Node
          │
      ┌───┴───┐
      ▼       ▼
   ALERT   NO_ALERT
      │
      ▼
   END
```

### 7.4 How the Final Decision is Made

The Coordinator Agent uses a **hybrid scoring approach**:

1. **Rule-based checks first** (fast, deterministic):
   - If wind > 120 km/h AND pressure < 980 hPa → Cyclone flag = TRUE
   - If SST > 30°C AND chlorophyll spike detected → HAB risk = HIGH

2. **ML model scoring** (if available):
   - Pre-trained classification model produces probability scores for each disaster type

3. **LLM synthesis** (explanation + edge cases):
   - LLM reads all agent outputs and the rule/ML scores
   - Generates: final risk level, explanation, recommended actions
   - LLM acts as a "second opinion" that can catch patterns rules miss

4. **Confidence weighting**:
   - Each agent reports confidence (0–1) with its output
   - Lower-confidence inputs are weighted less in the final synthesis

### 7.5 RAG-Based Explanation Generation

**What is RAG?** Retrieval-Augmented Generation means the AI first *retrieves* relevant documents from a knowledge base, then *generates* a response using those documents as context. This prevents the AI from hallucinating (making things up).

```
Alert triggered
     │
     ▼
Query Knowledge Base:
"cyclone warning Bay of Bengal fishing vessels"
     │
     ▼
Retrieved Docs:
- NDMA Cyclone SOP (2023)
- IMO Circular on vessel safety in cyclones
- Case study: Cyclone Amphan 2020
     │
     ▼
LLM generates recommendation using retrieved docs as context
     │
     ▼
Output: "Based on NDMA protocol SOP-CY-2023, fishing vessels
within 200km should return to port immediately. Coast guard
should activate rescue protocol RC-7..."
```

---

## 8. Data Sources

### 8.1 Prototype Sources (Free, Public APIs)

These are used during hackathon and development phase. All are free to access with no approval required.

| Source | Type | Data Provided | Agent | URL |
|--------|------|---------------|-------|-----|
| **Open-Meteo** | Weather API | Wind, pressure, temperature, rain, humidity | Weather Agent | open-meteo.com |
| **Copernicus Marine (CMEMS)** | Ocean API | SST, salinity, currents, wave height | Ocean Agent | marine.copernicus.eu |
| **Copernicus Open Access Hub** | Satellite | Sentinel-2/3 imagery | Satellite Agent | scihub.copernicus.eu |
| **AISHub / OpenAIS** | AIS Stream | Vessel positions, speed, heading | Vessel Agent | aishub.net |
| **GBIF** | Biodiversity | Marine species occurrence data | Ecosystem Agent | gbif.org |
| **ERDDAP (NOAA)** | Ocean science | Oceanographic datasets | Ocean Agent | coastwatch.pfeg.noaa.gov |
| **NASA Earthdata** | Satellite | SST, chlorophyll, ocean color | Ocean + Satellite | earthdata.nasa.gov |
| **Coral Watch** | Ecosystem | Coral bleaching reports | Ecosystem Agent | coralwatch.org |

**Why prototype uses public APIs:**
Public APIs are immediately accessible, well-documented, and free. They allow the team to build and demonstrate the full system architecture without needing institutional approval or expensive subscriptions. The architecture is designed so these can be swapped with official sources by changing only the adapter layer.

### 8.2 Production Sources (Official, Institutional)

For production deployment with NDMA/INCOIS/ISRO integration:

| Source | Organization | Data Provided | Status |
|--------|-------------|---------------|--------|
| **INCOIS** | MOES India | Wave forecasts, SST, tsunami alerts | Requires API agreement |
| **IMD** | India Met Dept | Cyclone tracks, rainfall, wind | Requires registration |
| **ISRO Bhuvan** | ISRO | Indian satellite imagery, coastal data | Requires API key |
| **NAVIC** | ISRO | Indian navigation system data | Specialized hardware |
| **VTS** | Port authorities | Vessel traffic in Indian ports | Requires MoU |
| **NDMA Database** | NDMA | Historical disaster records | Requires access |
| **Fisheries Dept** | State govts | Fisher community data | State-level access |

**Why production needs official sources:**
Official Indian government sources provide higher-resolution data for Indian waters, are updated more frequently, and carry legal authority for disaster declarations. The transition from public to official sources is a deliberate Phase 2 design decision.

---

## 9. Database Design

### 9.1 Core Entities and Relationships

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  Users   │─────────│    Alerts    │─────────│ Disaster     │
│          │  1   M  │              │  M   1  │ Events       │
│ user_id  │         │ alert_id     │         │              │
│ role     │         │ severity     │         │ event_type   │
│ region   │         │ alert_type   │         │ start_time   │
│ contact  │         │ location*    │         │ end_time     │
└──────────┘         │ explanation  │         │ affected_km2 │
                     │ created_at   │         └──────────────┘
                     └──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │ WeatherData  │ │  OceanData   │ │  Satellite   │
     │              │ │              │ │  Observations│
     │ timestamp    │ │ timestamp    │ │              │
     │ location*    │ │ location*    │ │ image_id     │
     │ wind_speed   │ │ sst          │ │ capture_time │
     │ pressure     │ │ wave_height  │ │ location*    │
     │ temperature  │ │ salinity     │ │ anomaly_type │
     │ source       │ │ current_vec  │ │ confidence   │
     └──────────────┘ └──────────────┘ │ image_url    │
                                        └──────────────┘

     ┌──────────────┐         ┌──────────────┐
     │    Vessels   │─────────│ VesselTracks │
     │              │  1   M  │              │
     │ mmsi (PK)    │         │ mmsi         │
     │ vessel_name  │         │ timestamp    │
     │ vessel_type  │         │ location*    │
     │ flag_country │         │ speed        │
     │ owner_contact│         │ course       │
     └──────────────┘         └──────────────┘

     ┌──────────────┐         ┌──────────────┐
     │  Predictions │         │ Historical   │
     │              │         │ Records      │
     │ prediction_id│         │              │
     │ model_version│         │ event_type   │
     │ disaster_type│         │ year         │
     │ probability  │         │ location*    │
     │ valid_until  │         │ impact_score │
     │ explanation  │         │ lessons      │
     └──────────────┘         └──────────────┘

     * = geometry field (PostGIS Point/Polygon)
```

### 9.2 Key Relationships

- **User → Alerts** (1:M): One user can acknowledge many alerts; each alert is assigned to a user
- **Alert → DisasterEvent** (M:1): Multiple alerts may belong to one disaster event (e.g., multiple cyclone alerts during Cyclone X)
- **Alert → WeatherData/OceanData/SatelliteObservations** (M:M via junction): An alert is supported by evidence from multiple data sources
- **Vessel → VesselTracks** (1:M): One vessel has many position records over time
- **Predictions → DisasterEvent** (1:1): Each prediction may become a confirmed disaster event

### 9.3 Spatial Data Strategy

All geographic entities use **PostGIS geometry types**:
- Point coordinates → `GEOMETRY(POINT, 4326)`
- Risk zones → `GEOMETRY(POLYGON, 4326)`
- Storm tracks → `GEOMETRY(LINESTRING, 4326)`
- Satellite coverage → `GEOMETRY(MULTIPOLYGON, 4326)`

This enables spatial queries like: `"Find all vessels within 200km of storm center"` — a single PostGIS query.

---

## 10. Technology Stack

### 10.1 Frontend

| Technology | Why Selected |
|-----------|-------------|
| **React.js** | Component-based architecture allows reusable UI pieces. Large ecosystem, excellent for real-time dashboards. Team familiarity and abundance of SIH-relevant libraries. |
| **Leaflet.js** | Open-source, lightweight map library. Perfect for GeoJSON overlays, vessel tracking, and risk zone visualization without expensive licensing. |
| **Chart.js / Recharts** | Simple, beautiful time-series charts for SST trends, pressure graphs, and risk score history. |
| **Socket.IO (client)** | Real-time WebSocket communication for live map updates without polling. |

### 10.2 Backend

| Technology | Why Selected |
|-----------|-------------|
| **FastAPI (Python)** | High-performance Python web framework. Automatic API documentation (Swagger). Native async support for non-blocking I/O when calling external APIs. Python is ideal for AI/ML integration. |
| **Celery** | Task queue for background jobs: scheduling agent runs, processing satellite images, sending notifications. Prevents heavy work from blocking API responses. |
| **Redis** | Acts as both the Celery message broker and the real-time data cache. Pub/Sub feature enables agent-to-agent communication without tight coupling. |

### 10.3 AI & Reasoning

| Technology | Why Selected |
|-----------|-------------|
| **LangGraph** | Framework specifically designed for multi-agent AI systems with complex workflows. Provides graph-based execution, state management, and retry logic. Ideal for orchestrating ORCA's agent DAG. |
| **LangChain** | Tooling for LLM integration, RAG pipelines, and tool use. Standardizes how agents interact with LLMs and external tools. |
| **Google Gemini Pro / OpenAI GPT-4** | LLM for natural language synthesis and explanation generation. Gemini Pro has strong multimodal capabilities useful for future satellite image analysis. |
| **scikit-learn / XGBoost** | Classical ML for rule-based risk scoring. Interpretable models are preferred for disaster management where explainability is critical. |
| **GeoPandas** | Python library for geospatial data manipulation. Essential for processing ocean grid data, satellite coverage polygons, and vessel zone checks. |
| **Rasterio** | Read/write geospatial raster files (satellite imagery, ocean grid data in NetCDF/GeoTIFF). Required for Satellite Agent's image processing pipeline. |
| **ChromaDB / pgvector** | Vector database for storing document embeddings used in RAG. Enables semantic similarity search over the knowledge base. |

### 10.4 Storage

| Technology | Why Selected |
|-----------|-------------|
| **PostgreSQL** | Battle-tested, open-source relational database. Excellent support for JSON (for flexible agent outputs) and extensible with PostGIS. |
| **PostGIS** | PostgreSQL extension for spatial data. Enables geographic queries ("all vessels within storm radius") that would require complex application code otherwise. |
| **TimescaleDB** | PostgreSQL extension for time-series data. Automatically partitions ocean sensor data by time for fast queries on historical trends. |
| **MinIO** | Open-source object storage compatible with AWS S3 API. Stores large satellite imagery files. Can be swapped with AWS S3/Google Cloud Storage in production. |

### 10.5 DevOps & Infrastructure

| Technology | Why Selected |
|-----------|-------------|
| **Docker** | Containerizes each service for consistent environments. "Works on my machine" problems eliminated. Essential for reproducible SIH demo. |
| **Docker Compose** | Orchestrates multiple Docker containers locally. One command (`docker-compose up`) starts the entire ORCA system. |
| **Kubernetes** | Future production orchestration for auto-scaling, health checks, and rolling deployments. Architecture is designed to be Kubernetes-ready from day one. |
| **Nginx** | Reverse proxy and static file server. Routes requests to correct backend services, handles SSL termination. |
| **GitHub Actions** | CI/CD pipeline for automated testing and deployment. Every code push triggers tests automatically. |

---

## 11. Deployment Architecture

### 11.1 Prototype Deployment (Docker Compose)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Docker Compose Network                      │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Frontend  │    │   Backend   │    │    AI Services      │  │
│  │  Container  │    │  Container  │    │    Container        │  │
│  │             │    │             │    │                     │  │
│  │  React App  │◄──►│  FastAPI    │◄──►│  LangGraph          │  │
│  │  Port: 3000 │    │  Port: 8000 │    │  + All Agents       │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────────┘  │
│                            │                                     │
│              ┌─────────────┼──────────────────┐                 │
│              ▼             ▼                  ▼                 │
│  ┌─────────────┐ ┌─────────────────┐ ┌────────────────┐        │
│  │  PostgreSQL │ │     Redis       │ │    MinIO       │        │
│  │  + PostGIS  │ │   Container     │ │  Container     │        │
│  │  Container  │ │   Port: 6379   │ │  Port: 9000    │        │
│  │  Port: 5432 │ │  (Cache+Queue) │ │ (Object Store) │        │
│  └─────────────┘ └─────────────────┘ └────────────────┘        │
│                                                                  │
│  ┌─────────────┐   ┌─────────────┐                             │
│  │   Celery    │   │   Nginx     │                             │
│  │   Worker    │   │  (Reverse   │                             │
│  │  Container  │   │   Proxy)    │                             │
│  └─────────────┘   └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Production Deployment (Kubernetes - Future)

```
                        Internet
                           │
                    ┌──────▼──────┐
                    │  CloudFlare │  (DDoS protection, CDN)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Nginx     │  (Ingress Controller)
                    │  Ingress    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
 │  Frontend   │   │   Backend   │   │  AI Service │
 │   Pods (3x) │   │  Pods (5x)  │   │  Pods (3x)  │
 │  HPA auto-  │   │  HPA auto-  │   │  HPA auto-  │
 │   scaling   │   │   scaling   │   │   scaling   │
 └─────────────┘   └─────────────┘   └─────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
 │ PostgreSQL  │   │  Redis      │   │    MinIO    │
 │  Primary +  │   │  Cluster    │   │   Cluster   │
 │  2 Replicas │   │             │   │             │
 └─────────────┘   └─────────────┘   └─────────────┘
```

### 11.3 Container Responsibilities

| Container | Image Base | Purpose |
|-----------|-----------|---------|
| `orca-frontend` | Node + Nginx | Serve React build |
| `orca-backend` | Python 3.11 + FastAPI | API server |
| `orca-agents` | Python 3.11 + LangGraph | All AI agents |
| `orca-celery` | Python 3.11 + Celery | Background task workers |
| `orca-postgres` | PostgreSQL 15 + PostGIS | Primary database |
| `orca-redis` | Redis 7 | Cache + Message broker |
| `orca-minio` | MinIO | Object storage |
| `orca-nginx` | Nginx | Reverse proxy |

---

## 12. Non-Functional Requirements

### 12.1 Scalability

**Target:** Handle 1,000 concurrent dashboard users; process 10,000 AIS vessel positions per minute.

**How architecture supports it:**
- Backend is stateless (no session stored in server memory) → can scale horizontally by adding more FastAPI containers
- Celery workers are separate containers → can scale agent processing independently
- Redis handles high-throughput pub/sub without bottleneck
- PostGIS spatial indexing ensures geographic queries remain fast as data grows

---

### 12.2 Availability

**Target:** 99.5% uptime (≤ 43 hours downtime/year) for production.

**How architecture supports it:**
- Each service runs in multiple containers (replicas) — if one fails, others continue
- Health checks on all containers; Kubernetes automatically restarts failed containers
- Database has primary + replica setup; if primary fails, replica promotes
- Redis cluster mode prevents single point of failure in caching layer

---

### 12.3 Reliability

**Target:** Alerts generated within 5 minutes of a disaster signal; no missed alerts.

**How architecture supports it:**
- Celery task queue with retry logic (if an agent fails, task is retried up to 3 times)
- Dead-letter queue captures permanently failed tasks for manual review
- Data quality flags on every agent output — low-quality data triggers a warning, not a system failure
- Multi-source validation: an alert is only downgraded, never suppressed, if one data source is unavailable

---

### 12.4 Maintainability

**How architecture supports it:**
- Microservice design — each agent and module can be updated independently
- Standard ORCA Event Schema means changing one agent doesn't break others
- Centralized structured logging with correlation IDs makes debugging easy
- Infrastructure as Code (Docker Compose / Kubernetes YAML) means environment setup is reproducible
- Comprehensive README and architecture documentation (this document)

---

### 12.5 Extensibility

**How architecture supports it:**
- Adding a new agent requires: create new Python class, publish to Redis, register in Coordinator DAG — no changes to other agents
- Adding a new data source requires: create new data adapter in the Data Provider Layer — no changes to agents
- Adding a new notification channel (e.g., Telegram) requires: add new Celery task — no changes to core system
- Frontend components are modular — adding a new map layer is a self-contained change

---

### 12.6 Security

**How architecture supports it:**
- JWT tokens expire in 15 minutes; refresh tokens expire in 7 days
- All inter-service communication uses private Docker network (not exposed to internet)
- Input validation on all API endpoints prevents injection attacks
- Secrets (API keys, DB passwords) stored in environment variables, never in code
- RBAC ensures fishermen can only see public data; NDMA admins see everything
- All external communications encrypted with TLS 1.3

---

### 12.7 Performance

**Targets:**
- Dashboard initial load: < 3 seconds
- Alert notification delivery: < 30 seconds from event detection to SMS
- Map tile rendering: < 1 second
- Agent cycle time (all agents complete): < 10 minutes

**How architecture supports it:**
- Redis caches frequent queries (current weather, vessel positions) — cache hit avoids DB query
- Pre-computed risk zone polygons stored as GeoJSON — frontend doesn't compute geometry
- Celery runs agents in parallel — total agent time ≈ slowest single agent, not sum of all
- Database indexes on timestamp, location, and severity fields

---

### 12.8 Fault Tolerance

**Failure scenarios and responses:**

| Failure | ORCA Response |
|---------|--------------|
| Open-Meteo API down | Use cached data (up to 1 hour old), flag data as stale |
| One AI agent crashes | Coordinator uses available agents; flags missing input |
| Database connection lost | Backend returns cached data; Celery tasks queue until restored |
| LLM API unavailable | Fall back to template-based explanation (rule-based text) |
| Notification provider down | Try next channel (SMS → Email → Dashboard) |

---

## 13. Architecture Diagrams

### 13.1 Overall System Architecture

```
╔══════════════════════════════════════════════════════════════════════╗
║                         ORCA SYSTEM ARCHITECTURE                    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌───────────────────────────────────────────────────────────────┐  ║
║  │                        USER LAYER                            │  ║
║  │   [NDMA]  [Coast Guard]  [Port Auth]  [Fishermen (Mobile)]   │  ║
║  └────────────────────────┬──────────────────────────────────────┘  ║
║                           │ HTTPS / WSS                             ║
║  ┌────────────────────────▼──────────────────────────────────────┐  ║
║  │                     FRONTEND LAYER                           │  ║
║  │     React Dashboard    Leaflet Maps     Alert Feed           │  ║
║  └────────────────────────┬──────────────────────────────────────┘  ║
║                           │ REST API + WebSocket                    ║
║  ┌────────────────────────▼──────────────────────────────────────┐  ║
║  │   BACKEND LAYER (FastAPI + Celery + Redis)                   │  ║
║  │  [Auth] [Weather Svc] [Marine Svc] [Alert Svc] [Map Svc]     │  ║
║  └──────┬────────────────────────────────────────────┬──────────┘  ║
║         │ Agent Calls                                │ Notifications║
║  ┌──────▼──────────────────────────────┐   ┌────────▼────────────┐  ║
║  │         AI AGENT LAYER             │   │  NOTIFICATION LAYER │  ║
║  │  ┌─────────┐  ┌─────────┐          │   │  SMS  Email  Push   │  ║
║  │  │ Weather │  │  Ocean  │          │   └────────────────────┘  ║
║  │  │  Agent  │  │  Agent  │          │                           ║
║  │  └─────────┘  └─────────┘          │                           ║
║  │  ┌─────────┐  ┌─────────┐          │                           ║
║  │  │Satellite│  │ Vessel  │          │                           ║
║  │  │  Agent  │  │  Agent  │          │                           ║
║  │  └─────────┘  └─────────┘          │                           ║
║  │  ┌─────────┐  ┌────────────────┐   │                           ║
║  │  │Ecosystem│  │   Disaster     │   │                           ║
║  │  │  Agent  │  │ Reasoning Agt  │   │                           ║
║  │  └─────────┘  └────────────────┘   │                           ║
║  │         ▼ Coordinator Agent ▼       │                           ║
║  └──────────────────┬──────────────────┘                           ║
║                     │ LangGraph                                    ║
║  ┌──────────────────▼──────────────────────────────────────────┐   ║
║  │              REASONING LAYER                                │   ║
║  │    LangGraph DAG    LLM (Gemini)    RAG + Knowledge Base    │   ║
║  └──────────────────┬──────────────────────────────────────────┘   ║
║                     │ Fetch                                        ║
║  ┌──────────────────▼──────────────────────────────────────────┐   ║
║  │            DATA PROVIDER LAYER                              │   ║
║  │  Open-Meteo  Copernicus  AIS  ERDDAP  GBIF  INCOIS(future)  │   ║
║  └──────────────────┬──────────────────────────────────────────┘   ║
║                     │ Store                                        ║
║  ┌──────────────────▼──────────────────────────────────────────┐   ║
║  │              STORAGE LAYER                                  │   ║
║  │   PostgreSQL+PostGIS    Redis    MinIO    ChromaDB           │   ║
║  └─────────────────────────────────────────────────────────────┘   ║
║                                                                     ║
║  ════ SECURITY (JWT, RBAC, TLS) ════ MONITORING (Prometheus) ════   ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 13.2 AI Agent Communication Diagram

```
                    ┌─────────────────────────┐
                    │    REDIS MESSAGE BUS     │
                    │  (Pub/Sub Channels)      │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │           ┌────────────┘         │              │
        │           │                      │              │
        ▼           ▼                      ▼              ▼
  ┌──────────┐ ┌──────────┐          ┌──────────┐  ┌──────────┐
  │ Weather  │ │  Ocean   │          │Satellite │  │ Vessel   │
  │  Agent   │ │  Agent   │          │  Agent   │  │  Agent   │
  │          │ │          │          │          │  │          │
  │PUBLISHES:│ │PUBLISHES:│          │PUBLISHES:│  │PUBLISHES:│
  │weather_  │ │ocean_    │          │satellite_│  │vessel_   │
  │data      │ │data      │          │events    │  │positions │
  └────┬─────┘ └────┬─────┘          └────┬─────┘  └────┬─────┘
       │             │                     │              │
       └─────────────┴─────────────────────┴──────────────┘
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │   Ecosystem Agent    │
                      │  (SUBSCRIBES to      │
                      │   ocean_data for SST)│
                      │  PUBLISHES:          │
                      │  ecosystem_health    │
                      └──────────┬───────────┘
                                 │
              ┌──────────────────┴─────────────────────┐
              │    ALL CHANNELS                        │
              ▼                                        │
  ┌───────────────────────┐                            │
  │  Disaster Reasoning   │◄───────────────────────────┘
  │      Agent            │
  │  (SUBSCRIBES to all   │
  │   domain channels)    │
  │  PUBLISHES:           │
  │  risk_assessment      │
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐
  │   Coordinator Agent   │
  │  (SUBSCRIBES to all)  │
  │                       │
  │  1. Synthesize        │
  │  2. LLM Explanation   │
  │  3. Threshold Check   │
  │  4. Alert Dispatch    │
  └───────────────────────┘
```

### 13.3 Request-Response Flow Diagram

```
  USER BROWSER                   BACKEND                      AI AGENTS
  ────────────                   ───────                      ─────────

  Open Dashboard
       │
       ├──GET /api/dashboard──►  FastAPI
       │                         │
       │                         ├── Check Redis cache
       │                         │   (HIT: return cached)
       │                         │   (MISS: query DB)
       │                         │
       │◄──Dashboard Data ────────┤
       │                         │
       │                         │
  View Map / Alerts              │
       │                         │
       ├──WebSocket connect──────►│ WebSocket Server
       │                         │    │
       │                         │    │ Background: Celery scheduler
       │                         │    │    triggers every 15min:
       │                         │    │         │
       │                         │    │    ┌────▼──────────────┐
       │                         │    │    │  Coordinator Agent│
       │                         │    │    │  dispatches all   │
       │                         │    │    │  domain agents    │
       │                         │    │    └────┬──────────────┘
       │                         │    │         │ (async)
       │                         │    │    ┌────▼──────────────┐
       │                         │    │    │ All Agents run    │
       │                         │    │    │ (parallel, ~5min) │
       │                         │    │    └────┬──────────────┘
       │                         │    │         │
       │                         │    │    ┌────▼──────────────┐
       │                         │    │    │ Disaster Reasoning│
       │                         │    │    │ + Coordinator     │
       │                         │    │    │ synthesize result │
       │                         │    │    └────┬──────────────┘
       │                         │    │         │
       │◄──WebSocket Push ────────┤◄───┘    Alert created
       │   (new alert/update)     │
       │
  Dashboard updates
  in real-time
```

### 13.4 Deployment Diagram

```
  DEVELOPER MACHINE                      STAGING/PROD SERVER
  ─────────────────                      ──────────────────

  git push ──► GitHub
                │
                ├──► GitHub Actions CI/CD
                │         │
                │         ├── Run tests
                │         ├── Build Docker images
                │         └── Push to Docker Registry
                │                      │
                │                      ▼
                │               Docker Registry
                │                      │
                │                      ▼
                │            ┌─────────────────────┐
                │            │    Server (VPS or   │
                │            │    Cloud Instance)  │
                │            │                     │
                │            │  docker-compose up  │
                │            │                     │
                │            │  ┌───┐ ┌───┐ ┌───┐ │
                │            │  │FE │ │BE │ │AI │ │
                │            │  └───┘ └───┘ └───┘ │
                │            │  ┌───┐ ┌───┐ ┌───┐ │
                │            │  │DB │ │RDS│ │MNO│ │
                │            │  └───┘ └───┘ └───┘ │
                │            │       Nginx         │
                │            └─────────────────────┘
                │                      │
                └──────────────────────┘
                           Accessible at:
                     https://orca.demo.sih2026.in
```

---

## 14. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| External API rate limits | High | Medium | Cache aggressively (Redis); implement exponential backoff; have backup APIs |
| LLM API downtime | Medium | Medium | Fallback to template-based explanations; implement circuit breaker |
| Large satellite file processing time | High | Low | Pre-process asynchronously; store results, not raw files; use smaller image tiles |
| Inaccurate risk predictions | Medium | High | Clearly show confidence scores; require human confirmation for RED alerts; explain reasoning |
| Database performance with geospatial queries | Low | Medium | PostGIS spatial indexes; query optimization; Redis cache for frequent queries |
| Network latency to external APIs | Medium | Low | Cache responses; set reasonable timeouts; degrade gracefully |
| Single point of failure (Coordinator) | Low | High | Coordinator is stateless; Kubernetes auto-restarts; Celery retry logic |
| AIS data gaps (vessels go offline) | High | Medium | Mark last known position; flag data age; use dead reckoning estimation |

---

## 15. Future Enhancements

### Phase 2 (Post-SIH, 6 months)
- **INCOIS/IMD Integration:** Replace Open-Meteo and ERDDAP with official Indian government sources
- **Mobile App (React Native):** Native app for fishermen with offline capability
- **Multilingual Support:** Alerts in Tamil, Telugu, Kannada, Malayalam for coastal communities
- **Fishermen Network:** Community reporting — fishermen can report observations via SMS

### Phase 3 (Production, 12–18 months)
- **Custom ML Models:** Train models on Indian Ocean historical data (not global models)
- **Digital Twin:** Real-time simulation of the Indian Ocean ecosystem
- **ISRO Satellite Integration:** Direct feed from Resourcesat, Oceansat-3
- **IoT Buoy Network:** Real-time data from IoT sensors deployed in Indian coastal waters
- **Drone Integration:** Autonomous drones for oil spill verification and mapping

### Phase 4 (Advanced)
- **Predictive Ecosystem Modeling:** 7-day ecosystem health forecasts using deep learning
- **Carbon Credit Monitoring:** Track blue carbon (mangrove, seagrass) for climate markets
- **International Sharing:** Data sharing agreements with SAARC nations

---

## 16. Trade-offs

| Decision | Alternative Considered | Why We Chose Our Approach |
|----------|----------------------|--------------------------|
| **Agents communicate via Redis pub/sub** | Direct HTTP calls between agents | Redis decouples agents — one agent failing doesn't cascade. HTTP coupling would make the system brittle. |
| **Hybrid rule-based + ML reasoning** | Pure LLM reasoning | Rules are fast, transparent, and don't hallucinate. LLM adds nuance for edge cases. Pure LLM is too slow and unpredictable for real-time alerts. |
| **FastAPI over Django** | Django REST Framework | FastAPI is faster, has native async, and auto-generates OpenAPI docs. Django is better for content-heavy apps, not real-time APIs. |
| **Multiple specialized agents over one agent** | Single "do everything" agent | Specialists are more accurate in their domain. The system is more maintainable — replace Ocean Agent without touching Weather Agent. |
| **PostgreSQL + PostGIS over MongoDB** | MongoDB (geospatial support) | PostGIS is the gold standard for geospatial queries in production GIS systems (ISRO, NDMA all use it). Relational data model fits our structured data better. |
| **Docker Compose for prototype** | Full Kubernetes setup | Kubernetes adds operational complexity not needed at hackathon stage. Compose is faster to set up and demo. Architecture is Kubernetes-compatible when needed. |
| **RAG over fine-tuning for recommendations** | Fine-tune LLM on disaster SOPs | RAG knowledge base can be updated without retraining. Fine-tuning is expensive and rigid. RAG lets us add new protocols without touching the AI model. |

---

## Appendix A: Glossary

| Term | Meaning |
|------|---------|
| **AIS** | Automatic Identification System — radio-based system ships use to broadcast position, speed, and identity |
| **SST** | Sea Surface Temperature — critical indicator for cyclone intensity and coral bleaching |
| **HAB** | Harmful Algal Bloom — rapid algae growth that depletes oxygen and kills marine life |
| **RAG** | Retrieval-Augmented Generation — AI technique that retrieves relevant documents before generating a response |
| **DAG** | Directed Acyclic Graph — a flowchart where tasks have defined dependencies and no loops |
| **INCOIS** | Indian National Centre for Ocean Information Services — premier Indian ocean data authority |
| **PostGIS** | PostgreSQL extension that adds support for geographic objects and spatial queries |
| **NDMA** | National Disaster Management Authority — India's apex body for disaster management |
| **LangGraph** | Framework for building stateful, multi-agent AI applications with complex workflows |
| **MMSI** | Maritime Mobile Service Identity — unique 9-digit number identifying each vessel in AIS |
| **RBAC** | Role-Based Access Control — restricts system access based on a user's role |

---

## Appendix B: Phase 2 (LLD) Preview

The following components are to be detailed in the Low-Level Design document:

1. **API Specification** — All REST endpoints with request/response schemas
2. **Agent Class Diagrams** — Class structure, methods, and interfaces for each agent
3. **Database Schema** — Full SQL schema with constraints and indexes
4. **Sequence Diagrams** — Step-by-step interaction diagrams for key user flows
5. **Folder Structure** — Complete project directory layout for each service
6. **Configuration Management** — Environment variables, secrets management
7. **Testing Strategy** — Unit, integration, and end-to-end test plan

---

*Document prepared by Team ORCA | Smart India Hackathon 2026 | PS ID: SIH26176*
*This is a living document — updated as design decisions evolve.*
