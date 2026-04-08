"""
Predictive alert engine using a simple linear-regression forecast.

For each sensor it uses the last N readings to project values
one hour ahead and raises a predictive alert when the projected
value is expected to cross a threshold.
"""

import numpy as np
from datetime import datetime, timedelta

from aqi import ALERT_THRESHOLDS, severity_for_pollutant

POLLUTANTS = ["pm25", "pm10", "no2", "co", "o3", "so2"]
FORECAST_MINUTES = 60   # predict 1 hour ahead
LOOKBACK = 12           # use last 12 readings for trend


def _linear_forecast(values, steps_ahead=1):
    """
    Fit a least-squares line through `values` and extrapolate
    `steps_ahead` data-points into the future.
    """
    n = len(values)
    if n < 2:
        return values[-1] if values else 0
    x = np.arange(n, dtype=float)
    slope_intercept = np.polyfit(x, values, 1)  # [slope, intercept]
    return float(np.polyval(slope_intercept, n - 1 + steps_ahead))


def predict_next(readings):
    """
    Given a list of AirQualityReading ORM objects (newest last),
    return a dict of {pollutant: predicted_value} for one period ahead.
    """
    result = {}
    for p in POLLUTANTS:
        series = [getattr(r, p) for r in readings if getattr(r, p) is not None]
        if series:
            predicted = max(0, _linear_forecast(series[-LOOKBACK:]))
            result[p] = round(predicted, 2)
    return result


def check_predictive_alerts(sensor, readings, existing_active_pollutants):
    """
    Analyse a sensor's recent readings and return a list of new Alert dicts
    for pollutants projected to exceed thresholds within FORECAST_MINUTES.

    `existing_active_pollutants` is a set of pollutant names that already
    have an active predictive alert for this sensor (to avoid duplicates).
    """
    if len(readings) < 2:
        return []

    predictions = predict_next(readings)
    new_alerts = []

    for pollutant, predicted_value in predictions.items():
        if pollutant in existing_active_pollutants:
            continue
        severity = severity_for_pollutant(pollutant, predicted_value)
        if severity and severity in ("moderate", "high", "critical"):
            threshold = ALERT_THRESHOLDS[pollutant][severity]
            current = getattr(readings[-1], pollutant, None)
            new_alerts.append({
                "sensor_id": sensor.id,
                "alert_type": "predictive",
                "severity": severity,
                "pollutant": pollutant,
                "current_value": current,
                "threshold_value": threshold,
                "predicted_value": predicted_value,
                "message": (
                    f"⚠ Predictive Alert: {pollutant.upper()} at {sensor.location} "
                    f"is forecast to reach {predicted_value:.1f} µg/m³ "
                    f"(threshold: {threshold} µg/m³) within {FORECAST_MINUTES} minutes. "
                    f"Immediate preventive action recommended."
                ),
            })
    return new_alerts
