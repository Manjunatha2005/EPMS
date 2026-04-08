"""
Alert Service — Dashboard notifications only.
Email and SMS have been removed; all alerts surface in the UI.
"""
import logging
from datetime import datetime

logger = logging.getLogger("ecosentinel.alerter")

ALERT_THRESHOLDS = {
    "pm25": {"warning": 35.5,  "critical": 55.5},
    "pm10": {"warning": 154.0, "critical": 254.0},
    "co2":  {"warning": 1000,  "critical": 1500},
    "no2":  {"warning": 100.0, "critical": 200.0},
    "so2":  {"warning": 75.0,  "critical": 185.0},
    "voc":  {"warning": 100.0, "critical": 200.0},
}


class AlertService:
    """Checks readings against thresholds and returns alert dicts for the UI."""

    def check_thresholds(self, reading: dict) -> list[dict]:
        triggered = []
        for param, levels in ALERT_THRESHOLDS.items():
            val = float(reading.get(param, 0))
            if val >= levels["critical"]:
                triggered.append(self._build("critical", param, val, levels["critical"], reading))
            elif val >= levels["warning"]:
                triggered.append(self._build("warning",  param, val, levels["warning"],  reading))
        return triggered

    def _build(self, level: str, param: str, val: float, threshold: float, reading: dict) -> dict:
        city  = reading.get("city", "Unknown")
        emoji = "🚨" if level == "critical" else "⚠️"
        return {
            "level":     level,
            "parameter": param.upper(),
            "value":     val,
            "threshold": threshold,
            "city":      city,
            "timestamp": reading.get("timestamp", datetime.utcnow().isoformat()),
            "message":   f"{emoji} [{level.upper()}] {param.upper()} = {val} in {city} (threshold: {threshold})",
        }
