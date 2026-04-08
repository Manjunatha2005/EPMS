"""
/alerts routes — manage and retrieve pollution alerts.
"""
from fastapi import APIRouter, Query, Body
from datetime import datetime, timedelta
from ..db.mongodb import get_db

router = APIRouter()

# Thresholds for alert generation
THRESHOLDS = {
    "pm25": {"warning": 35.5, "critical": 55.5},
    "pm10": {"warning": 154, "critical": 254},
    "co2": {"warning": 1000, "critical": 1500},
    "no2": {"warning": 100, "critical": 200},
    "so2": {"warning": 75, "critical": 185},
    "voc": {"warning": 100, "critical": 200},
}


def generate_alert_from_reading(reading: dict, city: str) -> dict | None:
    """Generate an alert if reading exceeds thresholds."""
    pollutants = ["pm25", "pm10", "co2", "no2", "so2", "voc"]
    
    for pollutant in pollutants:
        value = reading.get(pollutant, 0)
        thresholds = THRESHOLDS[pollutant]
        
        if value >= thresholds["critical"]:
            return {
                "city": city,
                "pollutant": pollutant,
                "value": value,
                "level": "critical",
                "message": f"🚨 CRITICAL: {pollutant.upper()} at {value} — exceeds critical threshold",
                "timestamp": reading.get("timestamp", datetime.utcnow()),
                "resolved": False,
                "resolved_at": None,
            }
        elif value >= thresholds["warning"]:
            return {
                "city": city,
                "pollutant": pollutant,
                "value": value,
                "level": "warning",
                "message": f"⚠️ WARNING: {pollutant.upper()} at {value} — exceeds warning threshold",
                "timestamp": reading.get("timestamp", datetime.utcnow()),
                "resolved": False,
                "resolved_at": None,
            }
    
    return None


@router.get("/")
async def get_alerts(
    city:   str = Query(None),
    level:  str = Query(None),
    limit:  int = Query(50, le=200),
    hours:  int = Query(24),
):
    """Retrieve recent alerts, optionally filtered by city/level."""
    db = await get_db()
    query = {"timestamp": {"$gte": datetime.utcnow() - timedelta(hours=hours)}, "resolved": False}
    if city:  query["city"]  = city
    if level: query["level"] = level

    cursor = db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
    docs = await cursor.to_list(limit)
    return {"status": "ok", "count": len(docs), "alerts": docs}


@router.delete("/clear")
async def clear_alerts(city: str = Query(None)):
    """Clear alerts (admin only in production — add auth middleware)."""
    db = await get_db()
    query = {"city": city} if city else {}
    result = await db.alerts.delete_many(query)
    return {"deleted": result.deleted_count}


@router.post("/generate-from-csv")
async def generate_alerts_from_csv(readings: list = Body(...)):
    """Generate alerts from CSV readings and store in database."""
    db = await get_db()
    alerts_generated = []
    
    for reading in readings:
        city = reading.get("city", "unknown")
        alert = generate_alert_from_reading(reading, city)
        
        if alert:
            # Insert alert into database
            result = await db.alerts.insert_one(alert)
            alert["_id"] = str(result.inserted_id)
            alerts_generated.append(alert)
    
    return {
        "status": "ok",
        "alerts_generated": len(alerts_generated),
        "alerts": alerts_generated
    }


@router.get("/resolved")
async def get_resolved_alerts(
    city:   str = Query(None),
    limit:  int = Query(50, le=200),
    hours:  int = Query(24),
):
    """Retrieve resolved alerts from the last N hours."""
    db = await get_db()
    query = {"timestamp": {"$gte": datetime.utcnow() - timedelta(hours=hours)}, "resolved": True}
    if city:
        query["city"] = city

    cursor = db.alerts.find(query, {"_id": 0}).sort("resolved_at", -1).limit(limit)
    docs = await cursor.to_list(limit)
    return {"status": "ok", "count": len(docs), "alerts": docs}


@router.put("/mark-resolved")
async def mark_alert_resolved(alert_id: str = Query(...)):
    """Mark an alert as resolved."""
    db = await get_db()
    from bson.objectid import ObjectId
    
    try:
        result = await db.alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"resolved": True, "resolved_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            return {"status": "error", "message": "Alert not found"}
        
        return {"status": "ok", "message": "Alert marked as resolved"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/stats")
async def alert_stats():
    """Summary counts of active and resolved alerts for the last 24 hours."""
    db = await get_db()
    since = datetime.utcnow() - timedelta(hours=24)
    
    # Active alerts
    pipeline_active = [
        {"$match": {"timestamp": {"$gte": since}, "resolved": False}},
        {"$group": {"_id": "$level", "count": {"$sum": 1}}},
    ]
    cursor = db.alerts.aggregate(pipeline_active)
    active_results = await cursor.to_list(100)
    active_stats = {r["_id"]: r["count"] for r in active_results}
    
    # Resolved alerts
    resolved_count = await db.alerts.count_documents({
        "timestamp": {"$gte": since},
        "resolved": True
    })
    
    return {
        "active": {
            "critical": active_stats.get("critical", 0),
            "warning":  active_stats.get("warning", 0),
            "total":    sum(active_stats.values()),
        },
        "resolved": resolved_count,
        "total": sum(active_stats.values()) + resolved_count,
    }
