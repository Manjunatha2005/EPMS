/**
 * Heatmap Page — Spatial pollution distribution across zones.
 */
import React, { useState, useEffect } from "react";
import { classifyAQI, calcAQI, CITIES } from "../services/utils.js";

const ZONES = ["Industrial","Downtown","Suburbs","Airport","Harbor","Forest Park",
  "University","Market","Residential N","Residential S","Tech Hub","Old City",
  "Commercial","Waterfront","Highway Belt","Green Zone"];

export default function Heatmap({ city, latest }) {
  const [param, setParam] = useState("pm25");

  const cityData = CITIES[city];
  const base     = latest?.[param] ?? cityData?.base?.[param] ?? 60;

  const zoneVals = ZONES.map((z, i) => {
    const mult = 0.4 + Math.sin(i * 1.7) * 0.3 + Math.cos(i * 0.9) * 0.2 + 0.5;
    return { zone: z, val: +(base * mult).toFixed(1), lat: +(cityData.lat + (i * 0.015 - 0.12)).toFixed(3),
      lon: +(cityData.lon + (i * 0.012 - 0.09)).toFixed(3) };
  });

  const minV = Math.min(...zoneVals.map((z) => z.val));
  const maxV = Math.max(...zoneVals.map((z) => z.val));

  const heatColor = (v) => {
    const t = (v - minV) / (maxV - minV || 1);
    const r = Math.round(30  + t * 209);
    const g = Math.round(185 - t * 117);
    const b = Math.round(129 - t * 100);
    return `rgb(${r},${g},${b})`;
  };

  const PARAMS = ["pm25", "pm10", "co2", "no2"];

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Pollution Heatmap</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
            Multi-zone spatial distribution — {cityData?.name}
          </p>
        </div>
        <select value={param} onChange={(e) => setParam(e.target.value)} style={{
          background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8,
          padding: "8px 12px", color: "var(--text)", fontSize: 12, fontFamily: "Syne, sans-serif",
        }}>
          {PARAMS.map((p) => <option key={p} value={p} style={{ background: "var(--surface)" }}>{p.toUpperCase()}</option>)}
        </select>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>
            {param.toUpperCase()} SPATIAL DISTRIBUTION
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace" }}>
            <span>Low</span>
            <div style={{ width: 120, height: 10, borderRadius: 5, background: "linear-gradient(to right,#1e3a2f,#10B981,#F59E0B,#EF4444)" }} />
            <span>High</span>
          </div>
        </div>

        {/* Map grid */}
        <div style={{
          position: "relative", borderRadius: 8, overflow: "hidden", background: "var(--surface2)",
          height: 320, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(16,185,129,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.05) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          {/* Heat cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 3, padding: 16, width: "100%", maxWidth: 640, zIndex: 1 }}>
            {zoneVals.map(({ zone, val }, i) => (
              <div key={i} title={`${zone}: ${val}`} style={{
                aspectRatio: 1, borderRadius: 4, background: heatColor(val),
                cursor: "pointer", transition: "transform 0.2s", display: "flex",
                alignItems: "center", justifyContent: "center",
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Zone table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: 12 }}>
          ZONE-WISE AQI RANKING
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["ZONE","LAT","LON","PM2.5","AQI","STATUS"].map((h) => (
                <th key={h} style={{ padding: "6px 12px", textAlign: "left", color: "var(--text3)",
                  fontFamily: "JetBrains Mono, monospace", fontSize: 10,
                  borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[...zoneVals].sort((a, b) => b.val - a.val).map(({ zone, val, lat, lon }, i) => {
                const aqi = calcAQI(val);
                const s   = classifyAQI(aqi);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--text)", fontWeight: 500 }}>{zone}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{lat}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{lon}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text2)" }}>{val}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text2)" }}>{aqi}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        ● {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
