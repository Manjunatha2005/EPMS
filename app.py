"""
EPMS – AI-Powered Environmental Pollution Monitoring System
Main Flask application.
"""

import random
import math
from datetime import datetime, timedelta, timezone

from flask import Flask, render_template, jsonify, request
from apscheduler.schedulers.background import BackgroundScheduler

from extensions import db
from models import Sensor, AirQualityReading, Alert
from aqi import calculate_aqi, aqi_category, ALERT_THRESHOLDS
from alerts import evaluate_realtime_alerts, evaluate_predictive_alerts, resolve_alerts
from seed import seed_database, BASE_LEVELS, _noisy, _diurnal_factor

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///epms.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "epms-secret-key"

db.init_app(app)


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

# ---------------------------------------------------------------------------
# Simulated sensor polling (runs every 5 minutes)
# ---------------------------------------------------------------------------

def _poll_sensors():
    """Simulate fetching new readings from all active sensors."""
    with app.app_context():
        sensors = Sensor.query.filter_by(is_active=True).all()
        now = _utcnow()
        for sensor in sensors:
            base = BASE_LEVELS.get(sensor.name, {
                "pm25": 50, "pm10": 80, "no2": 50, "co": 3.0, "o3": 40, "so2": 20
            })
            factor = _diurnal_factor(now.hour)
            pm25 = _noisy(base["pm25"] * factor)
            pm10 = _noisy(base["pm10"] * factor)
            no2  = _noisy(base["no2"]  * factor)
            co   = _noisy(base["co"]   * factor)
            o3   = _noisy(base["o3"]   * factor)
            so2  = _noisy(base["so2"]  * factor)
            aqi_val = calculate_aqi(pm25=pm25, pm10=pm10, no2=no2, co=co, o3=o3, so2=so2)
            cat, _  = aqi_category(aqi_val)

            reading = AirQualityReading(
                sensor_id=sensor.id,
                timestamp=now,
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
            db.session.flush()

            evaluate_realtime_alerts(sensor, reading)
            evaluate_predictive_alerts(sensor)
            resolve_alerts(sensor, reading)

        db.session.commit()


# ---------------------------------------------------------------------------
# HTML routes
# ---------------------------------------------------------------------------

@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/alerts")
def alerts_page():
    return render_template("alerts.html")


@app.route("/analytics")
def analytics_page():
    return render_template("analytics.html")


# ---------------------------------------------------------------------------
# REST API
# ---------------------------------------------------------------------------

@app.route("/api/sensors")
def api_sensors():
    """Return all sensors with their latest AQI reading."""
    sensors = Sensor.query.filter_by(is_active=True).all()
    result = []
    for s in sensors:
        latest = (
            AirQualityReading.query.filter_by(sensor_id=s.id)
            .order_by(AirQualityReading.timestamp.desc())
            .first()
        )
        data = s.to_dict()
        if latest:
            data["latest"] = latest.to_dict()
            _, colour = aqi_category(latest.aqi or 0)
            data["aqi_colour"] = colour
        else:
            data["latest"] = None
            data["aqi_colour"] = "#cccccc"
        result.append(data)
    return jsonify(result)


@app.route("/api/sensors/<int:sensor_id>/readings")
def api_sensor_readings(sensor_id):
    """Return up to the last 48 hourly readings for a sensor."""
    hours = request.args.get("hours", 24, type=int)
    since = _utcnow() - timedelta(hours=hours)
    readings = (
        AirQualityReading.query.filter(
            AirQualityReading.sensor_id == sensor_id,
            AirQualityReading.timestamp >= since,
        )
        .order_by(AirQualityReading.timestamp.asc())
        .all()
    )
    return jsonify([r.to_dict() for r in readings])


@app.route("/api/alerts")
def api_alerts():
    """Return alerts, optionally filtered by status."""
    active_only = request.args.get("active", "false").lower() == "true"
    query = Alert.query.order_by(Alert.created_at.desc())
    if active_only:
        query = query.filter_by(is_active=True)
    alerts = query.limit(100).all()
    return jsonify([a.to_dict() for a in alerts])


@app.route("/api/alerts/<int:alert_id>/resolve", methods=["POST"])
def api_resolve_alert(alert_id):
    """Manually resolve an alert."""
    alert = db.get_or_404(Alert, alert_id)
    alert.is_active = False
    alert.resolved_at = _utcnow()
    db.session.commit()
    return jsonify({"status": "resolved", "id": alert_id})


@app.route("/api/stats/summary")
def api_summary():
    """City-wide summary statistics."""
    sensors = Sensor.query.filter_by(is_active=True).all()
    aqi_values = []
    for s in sensors:
        latest = (
            AirQualityReading.query.filter_by(sensor_id=s.id)
            .order_by(AirQualityReading.timestamp.desc())
            .first()
        )
        if latest and latest.aqi:
            aqi_values.append(latest.aqi)

    avg_aqi = round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else 0
    max_aqi = max(aqi_values) if aqi_values else 0
    cat, colour = aqi_category(avg_aqi)
    active_alerts = Alert.query.filter_by(is_active=True).count()

    return jsonify({
        "avg_aqi": avg_aqi,
        "max_aqi": max_aqi,
        "category": cat,
        "colour": colour,
        "active_alerts": active_alerts,
        "total_sensors": len(sensors),
    })


@app.route("/api/analytics/trends")
def api_trends():
    """24-hour citywide AQI trend (hourly averages)."""
    hours = request.args.get("hours", 24, type=int)
    since = _utcnow() - timedelta(hours=hours)
    readings = (
        AirQualityReading.query.filter(AirQualityReading.timestamp >= since)
        .order_by(AirQualityReading.timestamp.asc())
        .all()
    )

    # Group by hour bucket
    buckets = {}
    for r in readings:
        key = r.timestamp.strftime("%Y-%m-%dT%H:00")
        if key not in buckets:
            buckets[key] = []
        buckets[key].append(r.aqi or 0)

    trend = [
        {"time": k, "avg_aqi": round(sum(v) / len(v), 1)}
        for k, v in sorted(buckets.items())
    ]
    return jsonify(trend)


@app.route("/api/analytics/hotspots")
def api_hotspots():
    """Return sensors ranked by average AQI over the last 24 h."""
    since = _utcnow() - timedelta(hours=24)
    sensors = Sensor.query.filter_by(is_active=True).all()
    result = []
    for s in sensors:
        readings = AirQualityReading.query.filter(
            AirQualityReading.sensor_id == s.id,
            AirQualityReading.timestamp >= since,
        ).all()
        if readings:
            avg = sum(r.aqi for r in readings if r.aqi) / len(readings)
            result.append({**s.to_dict(), "avg_aqi_24h": round(avg, 1)})

    result.sort(key=lambda x: x["avg_aqi_24h"], reverse=True)
    return jsonify(result)


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

def create_app():
    with app.app_context():
        db.create_all()
        seed_database(app)

    scheduler = BackgroundScheduler()
    scheduler.add_job(_poll_sensors, "interval", minutes=5, id="poll_sensors")
    scheduler.start()

    return app


if __name__ == "__main__":
    create_app()
    app.run(debug=False, port=5000, use_reloader=False)
