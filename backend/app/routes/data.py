"""
/data routes — ingest, retrieve, and stream pollution readings.
"""
import csv, io
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from datetime import datetime, timedelta
from ..db.mongodb import get_db
from ..services.analyzer import analyze_reading
from ..models.reading import PollutionReading

router = APIRouter()


@router.get("/")
async def get_readings(
    city:  str = Query("delhi"),
    limit: int = Query(100, le=1000),
    hours: int = Query(24, le=720),
):
    """Fetch recent readings for a city from MongoDB."""
    db = await get_db()
    since = datetime.utcnow() - timedelta(hours=hours)
    cursor = db.readings.find(
        {"city": city, "timestamp": {"$gte": since}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    docs = await cursor.to_list(limit)
    return {"status": "ok", "count": len(docs), "data": docs}


@router.get("/latest")
async def get_latest(city: str = Query("delhi")):
    """Get the single most recent reading for a city."""
    db = await get_db()
    doc = await db.readings.find_one({"city": city}, {"_id": 0}, sort=[("timestamp", -1)])
    if not doc:
        raise HTTPException(status_code=404, detail="No data found for this city")
    return doc


@router.post("/ingest")
async def ingest_reading(reading: PollutionReading):
    """Insert a single reading (from API/sensor)."""
    db = await get_db()
    enriched = analyze_reading(reading.model_dump())
    result = await db.readings.insert_one(enriched)
    return {"status": "ok", "id": str(result.inserted_id)}


@router.post("/ingest/csv")
async def ingest_csv(file: UploadFile = File(...)):
    """Batch ingest readings from uploaded CSV file."""
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    docs = []
    errors = []
    for i, row in enumerate(reader):
        try:
            doc = {
                "timestamp": datetime.fromisoformat(row["timestamp"]),
                "city": row.get("city", "unknown"),
                "lat":  float(row.get("lat", 0)),
                "lon":  float(row.get("lon", 0)),
                "pm25": float(row["pm25"]),
                "pm10": float(row["pm10"]),
                "co2":  float(row["co2"]),
                "no2":  float(row["no2"]),
                "so2":  float(row["so2"]),
                "voc":  float(row["voc"]),
            }
            docs.append(analyze_reading(doc))
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    if docs:
        db = await get_db()
        result = await db.readings.insert_many(docs)
        return {"status": "ok", "inserted": len(result.inserted_ids), "errors": errors}

    return {"status": "error", "inserted": 0, "errors": errors}


@router.get("/cities")
async def get_cities():
    """List all cities with data in the database."""
    db = await get_db()
    cities = await db.readings.distinct("city")
    return {"cities": cities}
