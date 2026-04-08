"""
Alert evaluation module.

Checks current readings against thresholds (real-time alerts)
and calls the prediction engine for predictive alerts.
"""

from datetime import datetime, timedelta, timezone

from extensions import db
from models import Alert, AirQualityReading
from aqi import ALERT_THRESHOLDS, severity_for_pollutant
from prediction import check_predictive_alerts, POLLUTANTS


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def evaluate_realtime_alerts(sensor, reading):
    """
    Compare each pollutant in *reading* against thresholds.
    Creates an Alert record if threshold is breached and no active
    alert already exists for that pollutant on this sensor.
    """
    # Collect pollutants that already have an active real-time alert
    existing = {
        a.pollutant
        for a in Alert.query.filter_by(
            sensor_id=sensor.id, alert_type="realtime", is_active=True
        ).all()
    }

    for pollutant in POLLUTANTS:
        value = getattr(reading, pollutant, None)
        if value is None or pollutant in existing:
            continue
        severity = severity_for_pollutant(pollutant, value)
        if severity:
            threshold = ALERT_THRESHOLDS[pollutant][severity]
            alert = Alert(
                sensor_id=sensor.id,
                alert_type="realtime",
                severity=severity,
                pollutant=pollutant,
                current_value=value,
                threshold_value=threshold,
                message=(
                    f"🚨 Real-Time Alert: {pollutant.upper()} at {sensor.location} "
                    f"has reached {value:.1f} µg/m³, exceeding the "
                    f"{severity} threshold of {threshold} µg/m³."
                ),
            )
            db.session.add(alert)

    db.session.commit()


def evaluate_predictive_alerts(sensor):
    """
    Run the predictive model for the sensor and persist any new alerts.
    """
    readings = (
        AirQualityReading.query.filter_by(sensor_id=sensor.id)
        .order_by(AirQualityReading.timestamp.asc())
        .limit(24)
        .all()
    )

    existing = {
        a.pollutant
        for a in Alert.query.filter_by(
            sensor_id=sensor.id, alert_type="predictive", is_active=True
        ).all()
    }

    new_alerts = check_predictive_alerts(sensor, readings, existing)
    for data in new_alerts:
        alert = Alert(**data)
        db.session.add(alert)

    if new_alerts:
        db.session.commit()


def resolve_alerts(sensor, reading):
    """
    Resolve active alerts whose pollutant has now dropped below threshold.
    """
    active_alerts = Alert.query.filter_by(
        sensor_id=sensor.id, is_active=True
    ).all()

    for alert in active_alerts:
        value = getattr(reading, alert.pollutant, None)
        if value is None:
            continue
        # Resolve if the current value is in the "Good" band for that pollutant
        good_threshold = ALERT_THRESHOLDS[alert.pollutant]["low"]
        if value < good_threshold:
            alert.is_active = False
            alert.resolved_at = _utcnow()

    db.session.commit()
