"""Database models for the EPMS application."""

from datetime import datetime, timezone
from extensions import db


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Sensor(db.Model):
    """Represents an air quality monitoring sensor at a location."""

    __tablename__ = "sensors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    readings = db.relationship("AirQualityReading", backref="sensor", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "is_active": self.is_active,
        }


class AirQualityReading(db.Model):
    """Stores a single air quality measurement from a sensor."""

    __tablename__ = "air_quality_readings"

    id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey("sensors.id"), nullable=False)
    timestamp = db.Column(db.DateTime, default=_utcnow, index=True)

    # Pollutant concentrations (µg/m³ unless noted)
    pm25 = db.Column(db.Float)   # PM2.5
    pm10 = db.Column(db.Float)   # PM10
    no2 = db.Column(db.Float)    # Nitrogen Dioxide
    co = db.Column(db.Float)     # Carbon Monoxide (mg/m³)
    o3 = db.Column(db.Float)     # Ozone
    so2 = db.Column(db.Float)    # Sulfur Dioxide

    aqi = db.Column(db.Float)    # Computed Air Quality Index
    category = db.Column(db.String(50))  # Good / Moderate / Unhealthy / etc.

    def to_dict(self):
        return {
            "id": self.id,
            "sensor_id": self.sensor_id,
            "timestamp": self.timestamp.isoformat(),
            "pm25": self.pm25,
            "pm10": self.pm10,
            "no2": self.no2,
            "co": self.co,
            "o3": self.o3,
            "so2": self.so2,
            "aqi": self.aqi,
            "category": self.category,
        }


class Alert(db.Model):
    """Represents a pollution alert issued for a sensor location."""

    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey("sensors.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow, index=True)
    resolved_at = db.Column(db.DateTime, nullable=True)

    alert_type = db.Column(db.String(50))   # realtime | predictive
    severity = db.Column(db.String(50))     # low | moderate | high | critical
    pollutant = db.Column(db.String(50))    # which pollutant triggered the alert
    current_value = db.Column(db.Float)
    threshold_value = db.Column(db.Float)
    predicted_value = db.Column(db.Float, nullable=True)
    message = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)

    sensor = db.relationship("Sensor", backref="alerts")

    def to_dict(self):
        return {
            "id": self.id,
            "sensor_id": self.sensor_id,
            "sensor_name": self.sensor.name if self.sensor else None,
            "location": self.sensor.location if self.sensor else None,
            "created_at": self.created_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "pollutant": self.pollutant,
            "current_value": self.current_value,
            "threshold_value": self.threshold_value,
            "predicted_value": self.predicted_value,
            "message": self.message,
            "is_active": self.is_active,
        }
