/**
 * Ticker — sticky live-data bar at the top of every page.
 */
import React from "react";

const STATUS_COLOR = {
  "Safe":      "#10B981",
  "Moderate":  "#F59E0B",
  "Unhealthy": "#EF4444",
  "Hazardous": "#EF4444",
};

export default function Ticker({ latest }) {
  if (!latest) return (
    <div style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "7px 24px",
      fontSize: 11, color: "var(--text3)",
      fontFamily: "JetBrains Mono, monospace",
    }}>Initialising sensors...</div>
  );

  const sc = STATUS_COLOR[latest.status] || "#10B981";
  const items = [
    ["PM2.5", `${latest.pm25} µg`],
    ["PM10",  `${latest.pm10} µg`],
    ["CO2",   `${latest.co2} ppm`],
    ["NO2",   `${latest.no2} ppb`],
    ["SO2",   `${latest.so2} ppb`],
    ["VOC",   `${latest.voc} ppb`],
    ["AQI",   latest.aqi],
  ];

  return (
    <div style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "0 24px",
      height: 36,
      display: "flex", alignItems: "center",
      gap: 0,
      fontSize: 11,
      fontFamily: "JetBrains Mono, monospace",
      overflow: "hidden",
    }}>
      {/* Live dot */}
      <div className="pulse" style={{
        width: 6, height: 6, background: "var(--primary)",
        borderRadius: "50%", marginRight: 12, flexShrink: 0,
      }} />

      {/* Data items */}
      <div style={{ display: "flex", gap: 20, flex: 1, overflow: "hidden" }}>
        {items.map(([lbl, val]) => (
          <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
            <span style={{ color: "var(--text3)" }}>{lbl}</span>
            <span style={{ color: "var(--text)", fontWeight: 500 }}>{val}</span>
          </span>
        ))}
      </div>

      {/* Status + time */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
        <span style={{
          background: `${sc}20`, color: sc,
          padding: "2px 9px", borderRadius: 4,
          fontSize: 10, fontWeight: 700,
        }}>● {latest.status}</span>
        <span style={{ color: "var(--text3)", fontSize: 10 }}>
          {new Date(latest.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
