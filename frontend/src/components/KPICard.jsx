/**
 * KPI Card — single pollutant metric tile.
 * Uses CSS Grid / flexbox so content never overflows or clips.
 */
import React from "react";

const STATUS_COLORS = {
  safe:      { bar: "#10B981", badge: "rgba(16,185,129,0.14)",  text: "#10B981" },
  moderate:  { bar: "#F59E0B", badge: "rgba(245,158,11,0.14)",  text: "#F59E0B" },
  unhealthy: { bar: "#EF4444", badge: "rgba(239,68,68,0.14)",   text: "#EF4444" },
  hazardous: { bar: "#EF4444", badge: "rgba(239,68,68,0.22)",   text: "#EF4444" },
};

export default function KPICard({ label, value, unit, status, trendVal }) {
  const c      = STATUS_COLORS[status?.cls] || STATUS_COLORS.safe;
  const delta  = parseFloat(trendVal);
  const trendUp = !isNaN(delta) && delta > 0;

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderTop: `2.5px solid ${c.bar}`,
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 0,         /* allow flex/grid to shrink it */
      overflow: "hidden",  /* clip nothing — just safety */
    }}>
      {/* Label */}
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: "var(--text3)",
        fontFamily: "JetBrains Mono, monospace",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{label}</div>

      {/* Value + unit */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
          {value ?? "—"}
        </span>
        <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace" }}>
          {unit}
        </span>
      </div>

      {/* Status badge */}
      {status && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: c.badge, color: c.text,
          padding: "3px 9px", borderRadius: 5,
          fontSize: 11, fontWeight: 700,
          alignSelf: "flex-start",
        }}>
          <span style={{ fontSize: 7 }}>●</span>
          {status.label}
        </div>
      )}

      {/* Trend */}
      {trendVal !== undefined && !isNaN(delta) && (
        <div style={{
          fontSize: 11,
          color: trendUp ? "var(--red)" : "var(--primary)",
          fontFamily: "JetBrains Mono, monospace",
        }}>
          {trendUp ? "▲" : "▼"} {Math.abs(delta)} from last
        </div>
      )}
    </div>
  );
}
