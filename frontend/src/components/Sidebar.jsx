/**
 * Sidebar — fully self-contained navigation component.
 * The parent <aside class="app-sidebar"> handles position:fixed + dimensions.
 */
import React from "react";
import { CITIES } from "../services/utils.js";

const NAV = [
  { group: "MONITORING", items: [
    { id: "dashboard",    label: "Dashboard",    icon: "⊞" },
    { id: "realtime",     label: "Real-Time",    icon: "〜" },
    { id: "heatmap",      label: "Heatmap",      icon: "◉" },
  ]},
  { group: "ANALYSIS", items: [
    { id: "predictions",     label: "Predictions",  icon: "↗" },
    { id: "alerts",          label: "Alerts",       icon: "⚠" },
    { id: "recommendations", label: "AI Decisions", icon: "✓" },
  ]},
  { group: "TOOLS", items: [
    { id: "chatbot", label: "AI Chatbot", icon: "💬" },
    { id: "admin",   label: "Admin",      icon: "⚙"  },
  ]},
];

export default function Sidebar({ page, onNavigate, city, onCityChange, alertCount }) {
  return (
    <>
      {/* ── Logo ── */}
      <div style={{
        padding: "20px 18px 16px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: "var(--primary)", borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, flexShrink: 0,
          }}>🌿</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
              EcoSentinel
            </div>
            <div style={{
              fontSize: 9, color: "var(--primary)",
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "0.12em", marginTop: 1,
            }}>AI MONITOR v2.1</div>
          </div>
        </div>
      </div>

      {/* ── Live badge ── */}
      <div style={{
        margin: "12px 14px 4px",
        background: "rgba(16,185,129,0.10)",
        border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: 7, padding: "7px 11px",
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 11, color: "var(--primary)",
        fontFamily: "JetBrains Mono, monospace", flexShrink: 0,
      }}>
        <div className="pulse" style={{
          width: 7, height: 7,
          background: "var(--primary)", borderRadius: "50%", flexShrink: 0,
        }} />
        LIVE MONITORING
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <div style={{
              padding: "16px 18px 5px",
              fontSize: 9, color: "var(--text3)",
              letterSpacing: "0.14em",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 600,
            }}>{group}</div>

            {items.map(({ id, label, icon }) => {
              const active = page === id;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "9px 18px",
                    background: active ? "rgba(16,185,129,0.09)" : "transparent",
                    border: "none",
                    borderLeft: `2px solid ${active ? "var(--primary)" : "transparent"}`,
                    color: active ? "var(--primary)" : "var(--text2)",
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    fontFamily: "Syne, sans-serif",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(241,245,249,0.04)"; e.currentTarget.style.color = "var(--text)"; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}}
                >
                  <span style={{ fontSize: 14, opacity: active ? 1 : 0.6, flexShrink: 0 }}>{icon}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {id === "alerts" && alertCount > 0 && (
                    <span style={{
                      background: "var(--red)", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 10,
                      fontFamily: "JetBrains Mono, monospace",
                    }}>{alertCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── City selector ── */}
      <div style={{
        padding: "14px 16px",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 9, color: "var(--text3)", marginBottom: 7,
          fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.10em", fontWeight: 600,
        }}>MONITORING CITY</div>
        <select
          value={city}
          onChange={e => onCityChange(e.target.value)}
          style={{
            width: "100%",
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--text)",
            fontSize: 12,
            fontFamily: "Syne, sans-serif",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {Object.entries(CITIES).map(([key, c]) => (
            <option key={key} value={key} style={{ background: "var(--surface)" }}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
