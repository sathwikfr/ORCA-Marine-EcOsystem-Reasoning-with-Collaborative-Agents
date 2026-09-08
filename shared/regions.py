"""
shared/regions.py
Indian coastal zone definitions.
All agents iterate over these zones when polling data.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CoastalZone:
    name: str
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    center_lat: float
    center_lon: float
    states: list[str]


INDIAN_COASTAL_ZONES: list[CoastalZone] = [
    CoastalZone(
        name="Arabian Sea North",
        lat_min=18.0, lat_max=24.0,
        lon_min=60.0, lon_max=72.0,
        center_lat=21.0, center_lon=66.0,
        states=["Gujarat"],
    ),
    CoastalZone(
        name="Arabian Sea Central",
        lat_min=12.0, lat_max=18.0,
        lon_min=70.0, lon_max=76.0,
        center_lat=15.0, center_lon=73.0,
        states=["Maharashtra", "Goa"],
    ),
    CoastalZone(
        name="Arabian Sea South",
        lat_min=8.0, lat_max=12.0,
        lon_min=74.0, lon_max=78.0,
        center_lat=10.0, center_lon=76.0,
        states=["Kerala"],
    ),
    CoastalZone(
        name="Bay of Bengal South",
        lat_min=8.0, lat_max=14.0,
        lon_min=78.0, lon_max=82.0,
        center_lat=11.0, center_lon=80.0,
        states=["Tamil Nadu"],
    ),
    CoastalZone(
        name="Bay of Bengal Central",
        lat_min=14.0, lat_max=18.0,
        lon_min=80.0, lon_max=84.0,
        center_lat=16.0, center_lon=82.0,
        states=["Andhra Pradesh"],
    ),
    CoastalZone(
        name="Bay of Bengal North",
        lat_min=18.0, lat_max=22.0,
        lon_min=84.0, lon_max=88.0,
        center_lat=20.0, center_lon=86.0,
        states=["Odisha", "West Bengal"],
    ),
    CoastalZone(
        name="Andaman and Nicobar",
        lat_min=6.0, lat_max=14.0,
        lon_min=92.0, lon_max=94.0,
        center_lat=10.0, center_lon=93.0,
        states=["Andaman and Nicobar Islands"],
    ),
    CoastalZone(
        name="Lakshadweep Sea",
        lat_min=8.0, lat_max=12.0,
        lon_min=71.0, lon_max=74.0,
        center_lat=10.0, center_lon=72.5,
        states=["Lakshadweep"],
    ),
]

# Convenience: lookup by name
ZONES_BY_NAME: dict[str, CoastalZone] = {z.name: z for z in INDIAN_COASTAL_ZONES}
