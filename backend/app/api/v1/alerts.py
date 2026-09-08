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
