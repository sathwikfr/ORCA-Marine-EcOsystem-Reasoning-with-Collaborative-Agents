import asyncio, httpx, json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ZONES = [
    ('Bay of Bengal Central', 16.0, 82.0),
    ('Arabian Sea Central',   15.0, 73.0),
    ('Kerala Coast',          10.0, 76.0),
    ('Bay of Bengal South',   11.0, 80.0),
    ('Andaman Islands',       11.7, 92.7),
    ('Gulf of Mannar',        9.0,  79.0),
]

BEAUFORT = [
    (0,1,'Calm'),(1,6,'Light Air'),(6,12,'Light Breeze'),
    (12,20,'Gentle Breeze'),(20,29,'Moderate Breeze'),
    (29,39,'Fresh Breeze'),(39,50,'Strong Breeze'),
    (50,62,'Near Gale'),(62,75,'Gale'),
    (75,89,'Strong Gale'),(89,103,'Storm'),
    (103,118,'Violent Storm'),(118,9999,'Hurricane Force'),
]

def beaufort(kmph):
    for lo,hi,label in BEAUFORT:
        if lo <= kmph < hi:
            return label
    return 'Unknown'

async def fetch_zone(zone_name, lat, lon):
    params = {
        'latitude': lat, 'longitude': lon,
        'current': ','.join([
            'temperature_2m','relative_humidity_2m',
            'wind_speed_10m','wind_gusts_10m',
            'surface_pressure','precipitation',
            'weather_code',
        ]),
        'timezone': 'Asia/Kolkata',
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get('https://api.open-meteo.com/v1/forecast', params=params)
            r.raise_for_status()
            d = r.json()['current']
            wind = round(d['wind_speed_10m'], 1)
            return {
                'zone':         zone_name,
                'lat':          lat, 'lon': lon,
                'temp_c':       d['temperature_2m'],
                'humidity_pct': d['relative_humidity_2m'],
                'wind_kmph':    wind,
                'gusts_kmph':   round(d['wind_gusts_10m'], 1),
                'pressure_hpa': round(d['surface_pressure'], 1),
                'rain_mm':      d['precipitation'],
                'beaufort':     beaufort(wind),
                'as_of':        d['time'],
                'status':       'ok',
            }
    except Exception as e:
        return {'zone': zone_name, 'status': 'error', 'error': str(e)}

async def main():
    results = await asyncio.gather(*[fetch_zone(z, lat, lon) for z, lat, lon in ZONES])
    print("\n🌊 ORCA — Real-Time Weather · Indian Coastal Zones")
    print("=" * 62)
    for r in results:
        if r['status'] == 'error':
            print(f"  ❌ {r['zone']}: {r['error']}")
            continue
        pressure_flag = " ⚠️ LOW PRESSURE" if r['pressure_hpa'] < 1000 else ""
        wind_flag     = " 🚨 DANGER" if r['wind_kmph'] >= 50 else ""
        print(f"\n  📍 {r['zone']}")
        print(f"     Temp:     {r['temp_c']}°C   Humidity: {r['humidity_pct']}%")
        print(f"     Wind:     {r['wind_kmph']} km/h ({r['beaufort']}){wind_flag}")
        print(f"     Gusts:    {r['gusts_kmph']} km/h")
        print(f"     Pressure: {r['pressure_hpa']} hPa{pressure_flag}")
        print(f"     Rainfall: {r['rain_mm']} mm")
        print(f"     As of:    {r['as_of']} IST")

    # Risk summary
    ok = [r for r in results if r['status'] == 'ok']
    if ok:
        max_wind  = max(ok, key=lambda x: x['wind_kmph'])
        min_press = min(ok, key=lambda x: x['pressure_hpa'])
        print("\n" + "=" * 62)
        print(f"  🔴 Max wind:    {max_wind['wind_kmph']} km/h → {max_wind['zone']}")
        print(f"  🔵 Min pressure:{min_press['pressure_hpa']} hPa → {min_press['zone']}")
        risk = min(max_wind['wind_kmph'] / 120.0 * 0.5 + max(0, (1013 - min_press['pressure_hpa']) / 63) * 0.5, 1.0)
        level = "🟢 GREEN" if risk < 0.2 else "🟡 YELLOW" if risk < 0.4 else "🟠 ORANGE" if risk < 0.7 else "🔴 RED"
        print(f"  📊 ORCA Risk Score: {risk:.2f} → Alert Level: {level}")

asyncio.run(main())
