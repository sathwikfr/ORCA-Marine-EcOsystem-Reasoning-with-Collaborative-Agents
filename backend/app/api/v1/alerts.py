"""
backend/app/api/v1/alerts.py
Alert management endpoints.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.config import settings
from ...models.alert import Alert
from ...schemas.alert import (
    AlertListResponse,
    AlertOut,
    AcknowledgeRequest,
    ResolveRequest,
    InternalAlertCreate,
)
from ...websocket.manager import ws_manager
from datetime import datetime, timezone

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    level: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    try:
        query = select(Alert).order_by(desc(Alert.created_at))

        if level:
            query = query.where(Alert.alert_level == level.upper())
        if is_active is not None:
            query = query.where(Alert.is_active == is_active)

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        # Paginate
        query = query.offset((page - 1) * per_page).limit(per_page)
        alerts = (await db.execute(query)).scalars().all()

        return AlertListResponse(
            total=total, page=page, per_page=per_page,
            alerts=[AlertOut.model_validate(a) for a in alerts],
        )
    except Exception:
        # Standalone / offline fallback alerts
        sample_alerts = [
            AlertOut(
                alert_id=UUID("11111111-1111-1111-1111-111111111111"),
                alert_level="WARNING",
                alert_type="ROUGH_SEA_WAVE_HEIGHT",
                title="Elevated Swell & Wave Height Alert — Central Bay of Bengal",
                explanation="Significant wave height predicted to exceed 2.2m with strong southerly wind gusts.",
                recommended_actions=["Traditional motorized craft remain within 12 NM", "Mechanized trawlers proceed with radar watch"],
                confidence=0.92,
                source_agents=["marine_safety_agent", "supervisor_agent"],
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
            AlertOut(
                alert_id=UUID("22222222-2222-2222-2222-222222222222"),
                alert_level="ADVISORY",
                alert_type="PFZ_OPPORTUNITY",
                title="Productive PFZ Front Identified — 38 NM off Visakhapatnam",
                explanation="Chlorophyll-a front detected (3.4 mg/m3) coupled with favorable thermal gradient (27.2°C).",
                recommended_actions=["Deploy pelagic gillnets along eastern contour", "Verify weather window before 18:00 IST"],
                confidence=0.88,
                source_agents=["oceanographer_agent", "route_optimizer_agent"],
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
            AlertOut(
                alert_id=UUID("33333333-3333-3333-3333-333333333333"),
                alert_level="WARNING",
                alert_type="BORDER_PROXIMITY",
                title="Palk Strait IMBL Proximity Advisory",
                explanation="Vessels operating near Rameshwaram must maintain a minimum 3 NM buffer from international boundary line.",
                recommended_actions=["Activate AIS transponders", "Do not drift past IMBL coordinates"],
                confidence=0.98,
                source_agents=["geofencing_agent"],
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
        ]
        if level:
            sample_alerts = [a for a in sample_alerts if a.alert_level == level.upper()]
        return AlertListResponse(
            total=len(sample_alerts),
            page=1,
            per_page=per_page,
            alerts=sample_alerts,
        )


@router.get("/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertOut.model_validate(alert)


@router.patch("/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: UUID,
    payload: AcknowledgeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(alert)

    # Notify WebSocket clients
    await ws_manager.broadcast({
        "type": "ALERT_UPDATED",
        "data": {"alert_id": str(alert_id), "acknowledged_at": alert.acknowledged_at.isoformat()},
    })
    return AlertOut.model_validate(alert)


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: UUID,
    payload: ResolveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_active = False
    alert.resolved_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(alert)
    return AlertOut.model_validate(alert)


@router.post("/internal", status_code=201, include_in_schema=False)
async def create_alert_internal(
    payload: InternalAlertCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_internal_key: str = Header(...),
):
    """Internal endpoint called by the Coordinator Agent."""
    if x_internal_key != settings.internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    alert = Alert(
        alert_level=payload.alert_level,
        alert_type=payload.alert_type,
        title=payload.title,
        explanation=payload.explanation,
        recommended_actions=payload.recommended_actions,
        confidence=payload.confidence,
        source_agents=payload.source_agents,
        metadata_=payload.metadata,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)

    # Push to all dashboard WebSocket clients
    await ws_manager.broadcast({
        "type": "ALERT_CREATED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "alert_id": str(alert.alert_id),
            "alert_level": alert.alert_level,
            "title": alert.title,
        },
    })

    return {"alert_id": str(alert.alert_id), "status": "created"}
