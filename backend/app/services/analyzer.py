"""
Pollution Analysis Engine.
Classifies pollution levels using threshold-based rules.
"""

# WHO / EPA standard thresholds
THRESHOLDS = {
    "pm25": {"safe": 12.0,  "moderate": 35.5,  "unhealthy": 55.5,  "hazardous": 150.5},
    "pm10": {"safe": 54.0,  "moderate": 154.0, "unhealthy": 254.0, "hazardous": 354.0},
    "co2":  {"safe": 600.0, "moderate": 1000.0,"unhealthy": 1500.0,"hazardous": 2000.0},
    "no2":  {"safe": 53.0,  "moderate": 100.0, "unhealthy": 200.0, "hazardous": 360.0},
    "so2":  {"safe": 35.0,  "moderate": 75.0,  "unhealthy": 185.0, "hazardous": 304.0},
    "voc":  {"safe": 50.0,  "moderate": 100.0, "unhealthy": 200.0, "hazardous": 400.0},
}

AQI_BREAKPOINTS = [
    # (aqi_low, aqi_high, pm25_low, pm25_high)
    (0,   50,  0.0,   12.0),
    (51,  100, 12.1,  35.4),
    (101, 150, 35.5,  55.4),
    (151, 200, 55.5,  150.4),
    (201, 300, 150.5, 250.4),
    (301, 500, 250.5, 500.4),
]


def calc_aqi(pm25: float) -> int:
    """Calculate AQI from PM2.5 concentration (EPA formula)."""
    for aqi_lo, aqi_hi, c_lo, c_hi in AQI_BREAKPOINTS:
        if c_lo <= pm25 <= c_hi:
            aqi = ((aqi_hi - aqi_lo) / (c_hi - c_lo)) * (pm25 - c_lo) + aqi_lo
            return round(aqi)
    return 500  # Beyond scale


def classify_aqi(aqi: int) -> str:
    if aqi <= 50:  return "safe"
    if aqi <= 100: return "moderate"
    if aqi <= 150: return "unhealthy"
    return "hazardous"


def classify_pollutant(key: str, value: float) -> str:
    t = THRESHOLDS.get(key, {})
    if not t:              return "safe"
    if value <= t["safe"]: return "safe"
    if value <= t["moderate"]: return "moderate"
    if value <= t["unhealthy"]: return "unhealthy"
    return "hazardous"


def analyze_reading(reading: dict) -> dict:
    """Enrich a raw reading with AQI + status fields."""
    aqi    = calc_aqi(reading.get("pm25", 0))
    status = classify_aqi(aqi)
    return {
        **reading,
        "aqi":    aqi,
        "status": status,
        "pollutant_status": {
            k: classify_pollutant(k, reading.get(k, 0))
            for k in THRESHOLDS
        },
    }


def detect_spike(current: dict, previous: dict, pct_threshold: float = 0.5) -> list[str]:
    """Return list of pollutants with sudden spike > pct_threshold."""
    spikes = []
    for key in ["pm25", "pm10", "no2", "so2", "voc"]:
        prev = previous.get(key, 0)
        curr = current.get(key, 0)
        if prev > 0 and (curr - prev) / prev > pct_threshold:
            spikes.append(key)
    return spikes
