"""AQI calculation and pollutant threshold utilities."""

# US EPA AQI breakpoints
# Format: (C_low, C_high, I_low, I_high)
PM25_BREAKPOINTS = [
    (0.0, 12.0,   0,  50),
    (12.1, 35.4,  51, 100),
    (35.5, 55.4, 101, 150),
    (55.5, 150.4, 151, 200),
    (150.5, 250.4, 201, 300),
    (250.5, 350.4, 301, 400),
    (350.5, 500.4, 401, 500),
]

PM10_BREAKPOINTS = [
    (0, 54,    0,  50),
    (55, 154,  51, 100),
    (155, 254, 101, 150),
    (255, 354, 151, 200),
    (355, 424, 201, 300),
    (425, 504, 301, 400),
    (505, 604, 401, 500),
]

NO2_BREAKPOINTS = [
    (0, 53,    0,  50),
    (54, 100,  51, 100),
    (101, 360, 101, 150),
    (361, 649, 151, 200),
    (650, 1249, 201, 300),
    (1250, 1649, 301, 400),
    (1650, 2049, 401, 500),
]

O3_BREAKPOINTS = [
    (0, 54,    0,  50),
    (55, 70,   51, 100),
    (71, 85,  101, 150),
    (86, 105, 151, 200),
    (106, 200, 201, 300),
]

CO_BREAKPOINTS = [  # ppm values * 10 here mapped to mg/m3 approx
    (0.0, 4.4,    0,  50),
    (4.5, 9.4,   51, 100),
    (9.5, 12.4, 101, 150),
    (12.5, 15.4, 151, 200),
    (15.5, 30.4, 201, 300),
    (30.5, 40.4, 301, 400),
    (40.5, 50.4, 401, 500),
]

SO2_BREAKPOINTS = [
    (0, 35,    0,  50),
    (36, 75,   51, 100),
    (76, 185, 101, 150),
    (186, 304, 151, 200),
    (305, 604, 201, 300),
    (605, 804, 301, 400),
    (805, 1004, 401, 500),
]

AQI_CATEGORIES = [
    (0,   50,  "Good",                  "#00e400"),
    (51,  100, "Moderate",              "#ffff00"),
    (101, 150, "Unhealthy for Sensitive Groups", "#ff7e00"),
    (151, 200, "Unhealthy",             "#ff0000"),
    (201, 300, "Very Unhealthy",        "#8f3f97"),
    (301, 500, "Hazardous",             "#7e0023"),
]

# Thresholds that trigger real-time alerts (WHO / EPA limits)
ALERT_THRESHOLDS = {
    "pm25": {"low": 12.0,  "moderate": 35.4,  "high": 55.4,  "critical": 150.4},
    "pm10": {"low": 54.0,  "moderate": 154.0, "high": 254.0, "critical": 354.0},
    "no2":  {"low": 53.0,  "moderate": 100.0, "high": 360.0, "critical": 649.0},
    "co":   {"low": 4.4,   "moderate": 9.4,   "high": 12.4,  "critical": 15.4},
    "o3":   {"low": 54.0,  "moderate": 70.0,  "high": 85.0,  "critical": 105.0},
    "so2":  {"low": 35.0,  "moderate": 75.0,  "high": 185.0, "critical": 304.0},
}


def _sub_aqi(concentration, breakpoints):
    """Calculate sub-AQI for a single pollutant using EPA formula."""
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= concentration <= c_high:
            return round(
                (i_high - i_low) / (c_high - c_low) * (concentration - c_low) + i_low
            )
    return 500  # beyond scale


def calculate_aqi(pm25=None, pm10=None, no2=None, co=None, o3=None, so2=None):
    """Return the overall AQI (maximum sub-index across all provided pollutants)."""
    sub_indices = []
    if pm25 is not None:
        sub_indices.append(_sub_aqi(pm25, PM25_BREAKPOINTS))
    if pm10 is not None:
        sub_indices.append(_sub_aqi(pm10, PM10_BREAKPOINTS))
    if no2 is not None:
        sub_indices.append(_sub_aqi(no2, NO2_BREAKPOINTS))
    if co is not None:
        sub_indices.append(_sub_aqi(co, CO_BREAKPOINTS))
    if o3 is not None:
        sub_indices.append(_sub_aqi(o3, O3_BREAKPOINTS))
    if so2 is not None:
        sub_indices.append(_sub_aqi(so2, SO2_BREAKPOINTS))
    return max(sub_indices) if sub_indices else 0


def aqi_category(aqi_value):
    """Return (category label, hex colour) for a given AQI value."""
    for low, high, label, colour in AQI_CATEGORIES:
        if low <= aqi_value <= high:
            return label, colour
    return "Hazardous", "#7e0023"


def severity_for_pollutant(pollutant, value):
    """Return severity string for a pollutant concentration."""
    thresholds = ALERT_THRESHOLDS.get(pollutant, {})
    if value >= thresholds.get("critical", float("inf")):
        return "critical"
    if value >= thresholds.get("high", float("inf")):
        return "high"
    if value >= thresholds.get("moderate", float("inf")):
        return "moderate"
    if value >= thresholds.get("low", float("inf")):
        return "low"
    return None
