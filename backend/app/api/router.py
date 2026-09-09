"""
backend/app/api/router.py
Master API router — registers all v1 sub-routers.
"""

from fastapi import APIRouter
from .v1 import auth, alerts, weather, kernel

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(alerts.router)
api_router.include_router(weather.router)
api_router.include_router(kernel.router)
