"""
Pydantic schemas for pollution readings and alerts.
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class PollutionStatus(str, Enum):
    SAFE      = "safe"
    MODERATE  = "moderate"
    UNHEALTHY = "unhealthy"
    HAZARDOUS = "hazardous"


class PollutionReading(BaseModel):
    """Single pollution sensor reading."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    city:      str
    lat:       float
    lon:       float
    pm25:      float = Field(..., ge=0, description="PM2.5 in µg/m³")
    pm10:      float = Field(..., ge=0, description="PM10 in µg/m³")
    co2:       float = Field(..., ge=0, description="CO2 in ppm")
    no2:       float = Field(..., ge=0, description="NO2 in ppb")
    so2:       float = Field(..., ge=0, description="SO2 in ppb")
    voc:       float = Field(..., ge=0, description="VOC in ppb")
    aqi:       Optional[int] = None
    status:    Optional[PollutionStatus] = None


class Alert(BaseModel):
    """Alert generated when thresholds are exceeded."""
    id:        Optional[str] = None
    level:     str           # critical | warning | info
    parameter: str
    value:     float
    threshold: float
    city:      str
    message:   str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sent_email: bool = False
    sent_sms:   bool = False


class PredictionRequest(BaseModel):
    city:       str = "delhi"
    hours_ahead: int = Field(48, ge=1, le=168)


class PredictionResponse(BaseModel):
    city:        str
    generated_at: datetime
    predictions: list[float]
    hours_ahead:  int
    trend:       str   # "increasing" | "decreasing" | "stable"
    peak_value:  float
    peak_hour:   int
    confidence:  float
