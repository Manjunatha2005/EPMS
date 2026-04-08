"""Tests for the EPMS application."""

import pytest
from datetime import datetime, timedelta, timezone

from app import app as flask_app
from extensions import db
from models import Sensor, AirQualityReading, Alert
from aqi import calculate_aqi, aqi_category, severity_for_pollutant, _sub_aqi, PM25_BREAKPOINTS
from prediction import predict_next, check_predictive_alerts


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def app():
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with flask_app.app_context():
        db.create_all()
        _seed_test_data()
        yield flask_app
        db.session.remove()
        db.drop_all()


def _seed_test_data():
    sensor = Sensor(
        name="Test Station",
        location="Test City",
        latitude=12.97,
        longitude=77.59,
    )
    db.session.add(sensor)
    db.session.flush()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for i in range(20):
        reading = AirQualityReading(
            sensor_id=sensor.id,
            timestamp=now - timedelta(hours=20 - i),
            pm25=50.0 + i * 2,
            pm10=80.0 + i * 3,
            no2=40.0 + i,
            co=3.0,
            o3=45.0,
            so2=20.0,
            aqi=calculate_aqi(pm25=50.0 + i * 2, pm10=80.0 + i * 3),
            category="Moderate",
        )
        db.session.add(reading)
    db.session.commit()


@pytest.fixture()
def client(app):
    return flask_app.test_client()


# ---------------------------------------------------------------------------
# AQI calculation tests
# ---------------------------------------------------------------------------

class TestAQICalculation:
    def test_good_aqi(self):
        aqi = calculate_aqi(pm25=5.0, pm10=30.0)
        assert 0 <= aqi <= 50, f"Expected Good AQI, got {aqi}"

    def test_moderate_aqi(self):
        aqi = calculate_aqi(pm25=20.0, pm10=80.0)
        assert 51 <= aqi <= 100, f"Expected Moderate AQI, got {aqi}"

    def test_unhealthy_aqi(self):
        aqi = calculate_aqi(pm25=100.0, pm10=200.0)
        assert aqi >= 101, f"Expected elevated AQI, got {aqi}"

    def test_aqi_uses_worst_pollutant(self):
        # High NO2 should dominate even when PM2.5 is fine
        aqi = calculate_aqi(pm25=5.0, no2=400.0)
        assert aqi >= 151

    def test_aqi_category_good(self):
        label, colour = aqi_category(25)
        assert label == "Good"
        assert colour == "#00e400"

    def test_aqi_category_hazardous(self):
        label, colour = aqi_category(400)
        assert label == "Hazardous"
        assert colour == "#7e0023"

    def test_sub_aqi_in_range(self):
        idx = _sub_aqi(10.0, PM25_BREAKPOINTS)
        assert 0 <= idx <= 50

    def test_sub_aqi_beyond_scale(self):
        idx = _sub_aqi(600.0, PM25_BREAKPOINTS)
        assert idx == 500

    def test_severity_for_pollutant_none(self):
        assert severity_for_pollutant("pm25", 5.0) is None

    def test_severity_for_pollutant_critical(self):
        assert severity_for_pollutant("pm25", 200.0) == "critical"

    def test_severity_for_pollutant_moderate(self):
        assert severity_for_pollutant("pm25", 40.0) == "moderate"


# ---------------------------------------------------------------------------
# Prediction engine tests
# ---------------------------------------------------------------------------

class TestPrediction:
    def _make_readings(self, values):
        """Create minimal AirQualityReading-like objects."""
        objs = []
        for v in values:
            r = AirQualityReading(pm25=v, pm10=v*2, no2=v*0.8, co=2.0, o3=40.0, so2=15.0)
            objs.append(r)
        return objs

    def test_predict_increasing_trend(self):
        readings = self._make_readings([10, 20, 30, 40, 50])
        pred = predict_next(readings)
        assert pred["pm25"] > 50, "Should forecast above last value for rising trend"

    def test_predict_stable_trend(self):
        readings = self._make_readings([50] * 10)
        pred = predict_next(readings)
        assert abs(pred["pm25"] - 50) < 5, "Stable trend should forecast ~50"

    def test_predict_returns_non_negative(self):
        readings = self._make_readings([10, 8, 5, 2, 1])
        pred = predict_next(readings)
        for p, v in pred.items():
            assert v >= 0, f"{p} should not be negative"

    def test_predictive_alerts_generated(self):
        """Rising PM2.5 trend should trigger a predictive alert."""

        class FakeSensor:
            id = 1
            location = "Test Zone"

        # Simulate sharply rising PM2.5 (will exceed 'moderate' threshold of 35.4)
        readings = self._make_readings(list(range(10, 80, 5)))
        alerts = check_predictive_alerts(FakeSensor(), readings, existing_active_pollutants=set())
        pollutants_alerted = {a["pollutant"] for a in alerts}
        assert "pm25" in pollutants_alerted

    def test_no_duplicate_predictive_alerts(self):
        """Should not create alert if pollutant already has an active one."""

        class FakeSensor:
            id = 1
            location = "Test Zone"

        readings = self._make_readings(list(range(10, 80, 5)))
        alerts = check_predictive_alerts(
            FakeSensor(), readings, existing_active_pollutants={"pm25"}
        )
        pollutants_alerted = {a["pollutant"] for a in alerts}
        assert "pm25" not in pollutants_alerted


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TestAPI:
    def test_sensors_endpoint(self, client):
        res = client.get("/api/sensors")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_sensor_latest_has_aqi(self, client):
        res = client.get("/api/sensors")
        sensors = res.get_json()
        sensor = sensors[0]
        assert "latest" in sensor
        if sensor["latest"]:
            assert "aqi" in sensor["latest"]

    def test_readings_endpoint(self, client, app):
        with app.app_context():
            sensor = Sensor.query.first()
        res = client.get(f"/api/sensors/{sensor.id}/readings?hours=24")
        assert res.status_code == 200
        readings = res.get_json()
        assert isinstance(readings, list)
        assert len(readings) > 0

    def test_alerts_endpoint(self, client):
        res = client.get("/api/alerts")
        assert res.status_code == 200
        assert isinstance(res.get_json(), list)

    def test_alerts_active_filter(self, client):
        res = client.get("/api/alerts?active=true")
        assert res.status_code == 200

    def test_summary_endpoint(self, client):
        res = client.get("/api/stats/summary")
        assert res.status_code == 200
        d = res.get_json()
        assert "avg_aqi" in d
        assert "active_alerts" in d
        assert "total_sensors" in d

    def test_trends_endpoint(self, client):
        res = client.get("/api/analytics/trends?hours=24")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)

    def test_hotspots_endpoint(self, client):
        res = client.get("/api/analytics/hotspots")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)
        assert all("avg_aqi_24h" in d for d in data)

    def test_resolve_alert(self, client, app):
        with app.app_context():
            sensor = Sensor.query.first()
            alert = Alert(
                sensor_id=sensor.id,
                alert_type="realtime",
                severity="moderate",
                pollutant="pm25",
                current_value=40.0,
                threshold_value=35.4,
                message="Test alert",
                is_active=True,
            )
            db.session.add(alert)
            db.session.commit()
            alert_id = alert.id

        res = client.post(f"/api/alerts/{alert_id}/resolve")
        assert res.status_code == 200
        assert res.get_json()["status"] == "resolved"

        with app.app_context():
            updated = db.session.get(Alert, alert_id)
            assert not updated.is_active
            assert updated.resolved_at is not None

    def test_404_on_missing_alert(self, client):
        res = client.post("/api/alerts/99999/resolve")
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# HTML route tests
# ---------------------------------------------------------------------------

class TestHTMLRoutes:
    def test_dashboard(self, client):
        res = client.get("/")
        assert res.status_code == 200
        assert b"EPMS" in res.data

    def test_alerts_page(self, client):
        res = client.get("/alerts")
        assert res.status_code == 200

    def test_analytics_page(self, client):
        res = client.get("/analytics")
        assert res.status_code == 200
