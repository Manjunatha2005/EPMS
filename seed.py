"""
Seed data: create demo sensors and populate historical readings so that
the dashboard has meaningful data on first launch.
"""

import random
import math
from datetime import datetime, timedelta

from extensions import db
from models import Sensor, AirQualityReading
from aqi import calculate_aqi, aqi_category

DEMO_SENSORS = [
    {"name": "City Centre Station", "location": "MG Road, Bengaluru",         "latitude": 12.9716, "longitude": 77.5946},
    {"name": "Industrial Zone",     "location": "Peenya Industrial Area",     "latitude": 13.0298, "longitude": 77.5190},
    {"name": "Residential North",   "location": "Yelahanka, Bengaluru",       "latitude": 13.1007, "longitude": 77.5963},
    {"name": "Traffic Corridor",    "location": "Outer Ring Road, Bengaluru", "latitude": 12.9352, "longitude": 77.6245},
    {"name": "Green Zone",          "location": "Cubbon Park, Bengaluru",     "latitude": 12.9763, "longitude": 77.5929},
]

# Base pollution levels per sensor (realistic urban India values)
BASE_LEVELS = {
    "City Centre Station": {"pm25": 55, "pm10": 90,  "no2": 60,  "co": 3.5, "o3": 45, "so2": 25},
    "Industrial Zone":     {"pm25": 80, "pm10": 140, "no2": 90,  "co": 6.0, "o3": 35, "so2": 60},
    "Residential North":   {"pm25": 38, "pm10": 65,  "no2": 40,  "co": 2.0, "o3": 50, "so2": 15},
    "Traffic Corridor":    {"pm25": 70, "pm10": 120, "no2": 80,  "co": 5.0, "o3": 40, "so2": 40},
    "Green Zone":          {"pm25": 20, "pm10": 35,  "no2": 25,  "co": 1.0, "o3": 55, "so2": 8},
}


def _noisy(value, pct=0.20):
    """Add ±pct random noise to a value (min 0)."""
    return max(0, value * (1 + random.uniform(-pct, pct)))


def _diurnal_factor(hour):
    """Rush-hour peaks at 8 AM and 6 PM; lowest at 3 AM."""
    base = 1.0 + 0.35 * math.sin(math.pi * (hour - 3) / 12)
    return base


def seed_database(app):
    """Create sensors and 48 h of readings if the DB is empty."""
    with app.app_context():
        if Sensor.query.count() > 0:
            return  # already seeded

        sensors = []
        for s in DEMO_SENSORS:
            sensor = Sensor(**s)
            db.session.add(sensor)
            sensors.append(sensor)
        db.session.flush()

        now = datetime.utcnow()
        for sensor in sensors:
            base = BASE_LEVELS[sensor.name]
            for hours_ago in range(48, 0, -1):
                ts = now - timedelta(hours=hours_ago)
                factor = _diurnal_factor(ts.hour)
                pm25 = _noisy(base["pm25"] * factor)
                pm10 = _noisy(base["pm10"] * factor)
                no2  = _noisy(base["no2"]  * factor)
                co   = _noisy(base["co"]   * factor)
                o3   = _noisy(base["o3"]   * factor)
                so2  = _noisy(base["so2"]  * factor)
                aqi_val  = calculate_aqi(pm25=pm25, pm10=pm10, no2=no2, co=co, o3=o3, so2=so2)
                cat, _   = aqi_category(aqi_val)
                reading = AirQualityReading(
                    sensor_id=sensor.id,
                    timestamp=ts,
                    pm25=round(pm25, 2),
                    pm10=round(pm10, 2),
                    no2=round(no2, 2),
                    co=round(co, 2),
                    o3=round(o3, 2),
                    so2=round(so2, 2),
                    aqi=round(aqi_val, 1),
                    category=cat,
                )
                db.session.add(reading)

        db.session.commit()
