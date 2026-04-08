# EPMS – AI-Powered Environmental Pollution Monitoring System

A full-stack web application that addresses rapidly increasing urban air pollution through **real-time monitoring**, **predictive alerts**, **early citizen warnings**, and **proactive government analytics**.

## Features

| Problem | Solution |
|---|---|
| Air pollution increasing in urban areas | 5 sensor stations with realistic urban pollution data |
| Lack of real-time monitoring | Live AQI dashboard with per-pollutant breakdown, auto-refreshed every 5 min |
| No predictive alerts | Linear-regression forecast engine raises alerts 1 hour ahead of threshold breaches |
| Citizens don't get early warnings | Severity-coded alert banner (Critical / High / Moderate / Low) + predictive vs real-time badge |
| Government decisions are reactive | Analytics page: 24 h / 48 h trends, hotspot ranking, pollutant distribution charts |

## Pages

- **`/`** – Dashboard: KPI cards (Avg AQI, Active Alerts, Sensor Count, Peak AQI), per-sensor station cards with pollutant mini-bars, 24 h citywide AQI trend chart, per-sensor pollutant bar chart.
- **`/alerts`** – Alert Management: filterable list of real-time and predictive alerts with severity, location, pollutant details, and manual-resolve button.
- **`/analytics`** – Analytics & Insights: pollution hotspot ranking (24 h avg AQI), AQI trend comparison (12 / 24 / 48 h), per-sensor pollutant doughnut chart + trend lines, AQI category reference guide.

## Tech Stack

- **Backend:** Python / Flask 3, SQLAlchemy, SQLite, APScheduler
- **Prediction:** NumPy least-squares linear regression (1-step forecast)
- **Frontend:** Bootstrap 5, Chart.js 4, Bootstrap Icons
- **AQI Standard:** US EPA breakpoints across PM2.5, PM10, NO₂, CO, O₃, SO₂

## Quick Start

```bash
pip install -r requirements.txt
python app.py          # starts on http://localhost:5000
```

## Running Tests

```bash
pip install pytest
python -m pytest tests/ -v
```

All **29 tests** cover AQI calculation, the prediction engine, all REST API endpoints, and HTML route rendering.

## Project Structure

```
.
├── app.py            # Flask app, API routes, scheduler
├── models.py         # SQLAlchemy models (Sensor, AirQualityReading, Alert)
├── aqi.py            # EPA AQI calculation + severity thresholds
├── prediction.py     # Linear-regression predictive alert engine
├── alerts.py         # Real-time + predictive alert evaluation
├── seed.py           # Demo sensor data seeding (48 h historical readings)
├── extensions.py     # Shared Flask extensions
├── requirements.txt
├── templates/        # Jinja2 HTML templates
│   ├── base.html
│   ├── dashboard.html
│   ├── alerts.html
│   └── analytics.html
├── static/
│   ├── css/style.css
│   └── js/
│       ├── main.js
│       ├── dashboard.js
│       ├── alerts.js
│       └── analytics.js
└── tests/
    └── test_epms.py  # 29 pytest tests
```

