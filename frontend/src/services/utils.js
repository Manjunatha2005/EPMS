/**
 * Shared utility functions for EcoSentinel frontend.
 */

// ── AQI Classification ─────────────────────────────────────────────────────────
export function classifyAQI(aqi) {
  if (aqi <= 50)  return { label: "Safe",      cls: "safe",      color: "#10B981", bg: "rgba(16,185,129,0.12)"  };
  if (aqi <= 100) return { label: "Moderate",  cls: "moderate",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)"  };
  if (aqi <= 200) return { label: "Unhealthy", cls: "unhealthy", color: "#EF4444", bg: "rgba(239,68,68,0.12)"   };
  return           { label: "Hazardous", cls: "hazardous", color: "#EF4444", bg: "rgba(239,68,68,0.20)"  };
}

// ── Pollutant thresholds (WHO/EPA) ─────────────────────────────────────────────
export const THRESHOLDS = {
  pm25: { safe: 12,   moderate: 35.5, unhealthy: 55.5,  hazardous: 150.5 },
  pm10: { safe: 54,   moderate: 154,  unhealthy: 254,   hazardous: 354   },
  co2:  { safe: 600,  moderate: 1000, unhealthy: 1500,  hazardous: 2000  },
  no2:  { safe: 53,   moderate: 100,  unhealthy: 200,   hazardous: 360   },
  so2:  { safe: 35,   moderate: 75,   unhealthy: 185,   hazardous: 304   },
  voc:  { safe: 50,   moderate: 100,  unhealthy: 200,   hazardous: 400   },
};

export function classifyPollutant(key, value) {
  const t = THRESHOLDS[key];
  if (!t)              return { label: "—",         cls: "safe"      };
  if (value <= t.safe) return { label: "Safe",      cls: "safe"      };
  if (value <= t.moderate)  return { label: "Moderate",  cls: "moderate"  };
  if (value <= t.unhealthy) return { label: "Unhealthy", cls: "unhealthy" };
  return                    { label: "Hazardous",   cls: "hazardous" };
}

// ── Number formatters ──────────────────────────────────────────────────────────
export const fmt1 = (v) => Number(v).toFixed(1);
export const fmt0 = (v) => Math.round(Number(v)).toString();

// ── AQI calculation (simplified EPA PM2.5) ────────────────────────────────────
export function calcAQI(pm25) {
  const bp = [
    [0,    12.0,   0,   50],
    [12.1, 35.4,  51,  100],
    [35.5, 55.4, 101,  150],
    [55.5,150.4, 151,  200],
    [150.5,250.4,201,  300],
    [250.5,500.4,301,  500],
  ];
  for (const [cl, ch, il, ih] of bp) {
    if (pm25 >= cl && pm25 <= ch)
      return Math.round(((ih - il) / (ch - cl)) * (pm25 - cl) + il);
  }
  return 500;
}

// ── City metadata ──────────────────────────────────────────────────────────────
export const CITIES = {
  delhi:       { name: "New Delhi, India",   lat: 28.61, lon:  77.20, base: { pm25: 85,  pm10: 140, co2: 520, no2: 65,  so2: 28, voc: 45 } },
  mumbai:      { name: "Mumbai, India",      lat: 19.07, lon:  72.87, base: { pm25: 55,  pm10: 95,  co2: 490, no2: 48,  so2: 18, voc: 32 } },
  bangalore:   { name: "Bengaluru, India",   lat: 12.97, lon:  77.59, base: { pm25: 38,  pm10: 68,  co2: 440, no2: 32,  so2: 12, voc: 24 } },
  beijing:     { name: "Beijing, China",     lat: 39.90, lon: 116.40, base: { pm25: 110, pm10: 175, co2: 580, no2: 88,  so2: 45, voc: 62 } },
  los_angeles: { name: "Los Angeles, US",    lat: 34.05, lon:-118.24, base: { pm25: 18,  pm10: 38,  co2: 420, no2: 28,  so2: 8,  voc: 18 } },
  london:      { name: "London, UK",         lat: 51.50, lon:  -0.12, base: { pm25: 22,  pm10: 45,  co2: 430, no2: 35,  so2: 10, voc: 20 } },
};

// ── Simulate reading (frontend fallback) ───────────────────────────────────────
export function simulateReading(cityKey = "delhi") {
  const city = CITIES[cityKey];
  const b    = city.base;
  const now  = new Date();
  const hr   = now.getHours();
  const rush = (hr >= 7 && hr <= 9) || (hr >= 17 && hr <= 20) ? 1.35 : 1.0;
  const night = hr < 5 ? 0.70 : 1.0;
  const m = rush * night;

  const jitter = (v, pct = 0.28) => Math.max(0, v * (1 + (Math.random() - 0.5) * pct));

  const pm25 = +jitter(b.pm25 * m).toFixed(1);
  const pm10 = +jitter(b.pm10 * m).toFixed(1);
  const co2  = +jitter(b.co2).toFixed(0);
  const no2  = +jitter(b.no2 * m).toFixed(1);
  const so2  = +jitter(b.so2).toFixed(1);
  const voc  = +jitter(b.voc).toFixed(1);
  const aqi  = calcAQI(pm25);

  return {
    timestamp: now.toISOString(),
    city: cityKey,
    lat: city.lat, lon: city.lon,
    pm25, pm10, co2, no2, so2, voc,
    aqi,
    status: classifyAQI(aqi).label,
  };
}

// ── CSV export helper ──────────────────────────────────────────────────────────
export function downloadCSV(rows, filename = "ecosentinel_data.csv") {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(","), ...rows.map((r) => keys.map((k) => r[k]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
