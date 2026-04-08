"""
EcoSentinel – FastAPI Backend (No-Docker Edition)
Real-time pollution monitoring with WebSocket streaming + CSV ingestion
Run: uvicorn app.main:app --reload --port 8000
"""
import asyncio
import csv
import io
import os
import random
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db.mongodb import connect_db, close_db
from .routes import data, alerts, predict
from .services.analyzer import classify_aqi, calc_aqi

app = FastAPI(
    title="EcoSentinel API",
    version="2.1.0",
    description="AI-powered Environmental Pollution Monitoring",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router,    prefix="/data",    tags=["Data"])
app.include_router(alerts.router,  prefix="/alerts",  tags=["Alerts"])
app.include_router(predict.router, prefix="/predict", tags=["Predictions"])


@app.on_event("startup")
async def startup():
    try:
        await connect_db()
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️  MongoDB unavailable ({e}) — running without DB persistence")


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# ── WebSocket Manager ─────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, payload: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()

CITY_BASES = {
    "delhi":       {"lat": 28.61, "lon":  77.20, "pm25": 85,  "pm10": 140, "co2": 520, "no2": 65, "so2": 28, "voc": 45},
    "mumbai":      {"lat": 19.07, "lon":  72.87, "pm25": 55,  "pm10": 95,  "co2": 490, "no2": 48, "so2": 18, "voc": 32},
    "bangalore":   {"lat": 12.97, "lon":  77.59, "pm25": 38,  "pm10": 68,  "co2": 440, "no2": 32, "so2": 12, "voc": 24},
    "beijing":     {"lat": 39.90, "lon": 116.40, "pm25": 110, "pm10": 175, "co2": 580, "no2": 88, "so2": 45, "voc": 62},
    "los_angeles": {"lat": 34.05, "lon":-118.24, "pm25": 18,  "pm10": 38,  "co2": 420, "no2": 28, "so2": 8,  "voc": 18},
    "london":      {"lat": 51.50, "lon":  -0.12, "pm25": 22,  "pm10": 45,  "co2": 430, "no2": 35, "so2": 10, "voc": 20},
}


def _jitter(base: float, pct: float = 0.28) -> float:
    return max(0.0, base * (1 + (random.random() - 0.5) * pct))


def generate_reading(city: str = "delhi") -> dict:
    b   = CITY_BASES.get(city, CITY_BASES["delhi"])
    now = datetime.utcnow()
    hr  = now.hour
    m   = (1.35 if (7 <= hr <= 9) or (17 <= hr <= 20) else 1.0) * (0.70 if hr < 5 else 1.0)

    pm25 = round(_jitter(b["pm25"] * m), 1)
    pm10 = round(_jitter(b["pm10"] * m), 1)
    co2  = round(_jitter(b["co2"]))
    no2  = round(_jitter(b["no2"] * m), 1)
    so2  = round(_jitter(b["so2"]), 1)
    voc  = round(_jitter(b["voc"]), 1)
    aqi  = calc_aqi(pm25, pm10, no2, so2)

    return {
        "timestamp": now.isoformat(),
        "city": city, "lat": b["lat"], "lon": b["lon"],
        "pm25": pm25, "pm10": pm10, "co2": co2,
        "no2": no2, "so2": so2, "voc": voc,
        "aqi": aqi, "status": classify_aqi(aqi),
    }


@app.websocket("/ws/{city}")
async def websocket_endpoint(websocket: WebSocket, city: str = "delhi"):
    await manager.connect(websocket)
    try:
        while True:
            reading = generate_reading(city)
            await websocket.send_json({"reading": reading, "alerts": []})
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload a .csv file with pollution data.
    Returns all parsed rows so the frontend can display them immediately.
    Supports flexible column names (case-insensitive, strips whitespace).
    """
    if not file.filename.lower().endswith(".csv"):
        return JSONResponse(status_code=400, content={"error": "Only .csv files are accepted"})

    content = await file.read()
    text    = content.decode("utf-8-sig", errors="ignore")  # handle BOM

    rows     = []
    row_errs = []
    reader   = csv.DictReader(io.StringIO(text))

    for i, raw in enumerate(reader):
        # Normalise keys
        row = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in raw.items() if k}
        try:
            pm25 = float(row.get("pm2.5", row.get("pm25", 0)))
            pm10 = float(row.get("pm10",  0))
            no2  = float(row.get("no2",   0))
            so2  = float(row.get("so2",   0))
            co2  = float(row.get("co2",   400))
            voc  = float(row.get("voc",   0))
            aqi_raw = row.get("aqi", "")
            aqi  = int(float(aqi_raw)) if aqi_raw else calc_aqi(pm25, pm10, no2, so2)
            ts   = row.get("timestamp", row.get("date_time", row.get("datetime", datetime.utcnow().isoformat())))

            rows.append({
                "timestamp": ts,
                "city":   row.get("city",     row.get("location", "unknown")),
                "lat":    float(row.get("lat", row.get("latitude",  0))),
                "lon":    float(row.get("lon", row.get("longitude", 0))),
                "pm25":  pm25, "pm10": pm10,
                "co2":   co2,  "no2":  no2,
                "so2":   so2,  "voc":  voc,
                "aqi":   aqi,
                "status": row.get("status", classify_aqi(aqi)),
            })
        except (ValueError, KeyError) as exc:
            row_errs.append({"row": i + 2, "error": str(exc)})

    # Persist to MongoDB if available (best-effort)
    try:
        from .db.mongodb import get_db
        db = await get_db()
        if rows:
            await db.readings.insert_many(rows)
    except Exception:
        pass   # DB not available — frontend already has the data

    return {
        "filename": file.filename,
        "parsed":   len(rows),
        "errors":   len(row_errs),
        "row_errors": row_errs[:10],
        "rows":     rows,
        "summary": {
            "avg_pm25": round(sum(r["pm25"] for r in rows) / len(rows), 1) if rows else 0,
            "max_pm25": max((r["pm25"] for r in rows), default=0),
            "avg_aqi":  round(sum(r["aqi"]  for r in rows) / len(rows))    if rows else 0,
            "max_aqi":  max((r["aqi"]  for r in rows), default=0),
            "cities":   list({r["city"] for r in rows}),
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "version": "2.1.0"}


@app.get("/cities")
async def list_cities():
    return {"cities": list(CITY_BASES.keys())}


@app.get("/simulate/{city}")
async def simulate(city: str = "delhi"):
    return generate_reading(city)
