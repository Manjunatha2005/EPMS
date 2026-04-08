/**
 * EcoSentinel — Root Application
 * Layout: fixed sidebar (220px) + scrollable main body
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar       from "./components/Sidebar.jsx";
import Ticker        from "./components/Ticker.jsx";
import Dashboard     from "./pages/Dashboard.jsx";
import RealTime      from "./pages/RealTime.jsx";
import Heatmap       from "./pages/Heatmap.jsx";
import Predictions   from "./pages/Predictions.jsx";
import { Alerts, Recommendations, Chatbot, Admin } from "./pages/OtherPages.jsx";
import { simulateReading, CITIES } from "./services/utils.js";

export default function App() {
  const [page,     setPage]     = useState("dashboard");
  const [city,     setCity]     = useState("delhi");
  const [readings, setReadings] = useState([]);
  const [csvRows,  setCsvRows]  = useState([]);
  const [latest,   setLatest]   = useState(null);
  const [alerts,   setAlerts]   = useState([]);
  const [paused,   setPaused]   = useState(false);
  const [csvMode,  setCSVMode]  = useState(false);
  const pausedRef = useRef(false);

  // ── Simulation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    // Stop live data when CSV is loaded
    if (csvMode) return;
    
    const tick = () => {
      if (pausedRef.current) return;
      const r = simulateReading(city);
      setLatest(r);
      setReadings(prev => [...prev, r].slice(-300));
      if (r.pm25 > 55.5)
        pushAlert({ level:"critical", parameter:"PM2.5", value:r.pm25, city,
          message:`PM2.5 CRITICAL: ${r.pm25} µg/m³ in ${CITIES[city]?.name}`,
          timestamp: r.timestamp });
      else if (r.pm25 > 35.5)
        pushAlert({ level:"warning",  parameter:"PM2.5", value:r.pm25, city,
          message:`PM2.5 elevated: ${r.pm25} µg/m³ in ${CITIES[city]?.name}`,
          timestamp: r.timestamp });
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => clearInterval(iv);
  }, [city, csvMode]);

  const pushAlert = useCallback((alert) => {
    setAlerts(prev => {
      const now = Date.now();
      if (prev.find(a => a.message === alert.message &&
          now - new Date(a.timestamp).getTime() < 30_000)) return prev;
      return [{ ...alert, _id: Math.random().toString(36).slice(2) }, ...prev].slice(0, 50);
    });
  }, []);

  const handlePause = () => {
    const n = !paused; setPaused(n); pausedRef.current = n;
  };

  const handleCityChange = c => {
    setCity(c); 
    setReadings([]); 
    setLatest(null); 
    setCsvRows([]);
    setCSVMode(false);  // Reset CSV mode when changing city
  };

  const handleCSVLoad = (rows) => {
    setCsvRows(rows);
    setReadings(prev => [...prev, ...rows].slice(-300));
    if (rows.length) setLatest(rows[rows.length - 1]);
    setCSVMode(true);  // Enable CSV mode — stop live data
    rows.forEach(r => {
      if (r.pm25 > 55.5)
        pushAlert({ level:"critical", parameter:"PM2.5", value:r.pm25,
          city: r.city, message:`CSV — PM2.5 CRITICAL: ${r.pm25} µg/m³ (${r.timestamp})`,
          timestamp: r.timestamp });
    });
  };

  const handleClearCSV = () => {
    setCsvRows([]);
    setCSVMode(false);  // Disable CSV mode — resume live data
  };

  const simulateSpike = () => {
    const r = simulateReading(city);
    r.pm25 = 185; r.pm10 = 290; r.no2 = 185; r.aqi = 325; r.status = "Hazardous";
    setLatest(r);
    setReadings(prev => [...prev, r].slice(-300));
    pushAlert({ level:"critical", parameter:"PM2.5", value:185, city,
      message:`⚡ SPIKE — PM2.5: 185 µg/m³ in ${CITIES[city]?.name}`,
      timestamp: r.timestamp });
  };

  const shared = {
    city, latest, readings, csvRows, alerts, paused,
    onPause: handlePause,
    onCityChange: handleCityChange,
    onSpike: simulateSpike,
    onAlert: pushAlert,
    onClearAlerts: () => setAlerts([]),
    onCSVLoad: handleCSVLoad,
    onCsvClear: handleClearCSV,
  };

  return (
    <div className="app-shell">
      {/* Fixed 220px sidebar */}
      <aside className="app-sidebar">
        <Sidebar
          page={page}
          onNavigate={setPage}
          city={city}
          onCityChange={handleCityChange}
          alertCount={alerts.filter(a => a.level === "critical").length}
        />
      </aside>

      {/* Main — pushed right by sidebar width via CSS margin-left */}
      <div className="app-body">
        <div className="app-ticker">
          <Ticker latest={latest} />
        </div>
        <main className="app-content">
          {page === "dashboard"       && <Dashboard       {...shared} />}
          {page === "realtime"        && <RealTime        {...shared} />}
          {page === "heatmap"         && <Heatmap         {...shared} />}
          {page === "predictions"     && <Predictions     {...shared} />}
          {page === "alerts"          && <Alerts          {...shared} />}
          {page === "recommendations" && <Recommendations {...shared} />}
          {page === "chatbot"         && <Chatbot         {...shared} />}
          {page === "admin"           && <Admin           {...shared} />}
        </main>
      </div>
    </div>
  );
}
