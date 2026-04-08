/**
 * Real-Time — Live streaming data page with 4 charts and a log table.
 */
import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { classifyAQI } from "../services/utils.js";

Chart.register(...registerables);

const STREAM_LEN = 30;
const OPTS = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: "rgba(241,245,249,0.04)" }, ticks: { color: "#64748B", font: { size: 9, family: "JetBrains Mono" }, maxTicksLimit: 6 } },
    y: { grid: { color: "rgba(241,245,249,0.04)" }, ticks: { color: "#64748B", font: { size: 9, family: "JetBrains Mono" } } },
  },
};

function makeChart(ref, label, color) {
  return new Chart(ref, {
    type: "line",
    data: {
      labels: [],
      datasets: [{ label, data: [], borderColor: color, tension: 0.3,
        pointRadius: 0, borderWidth: 1.5,
        backgroundColor: color.replace(")", ", 0.08)").replace("rgb", "rgba"), fill: true }],
    },
    options: OPTS,
  });
}

export default function RealTime({ readings, latest, paused, onPause }) {
  const refs   = { pm25: useRef(), pm10: useRef(), co2: useRef(), gas2: useRef() };
  const charts = useRef({});

  const seedFromReadings = () => {
    const tail = readings.slice(-STREAM_LEN);
    if (!tail.length) return;

    const labels = tail.map((r) =>
      new Date(r.timestamp).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );

    if (charts.current.pm25) {
      charts.current.pm25.data.labels = [...labels];
      charts.current.pm25.data.datasets[0].data = tail.map((r) => r.pm25);
      charts.current.pm25.update("none");
    }
    if (charts.current.pm10) {
      charts.current.pm10.data.labels = [...labels];
      charts.current.pm10.data.datasets[0].data = tail.map((r) => r.pm10);
      charts.current.pm10.update("none");
    }
    if (charts.current.co2) {
      charts.current.co2.data.labels = [...labels];
      charts.current.co2.data.datasets[0].data = tail.map((r) => r.co2);
      charts.current.co2.update("none");
    }
    if (charts.current.gas2) {
      charts.current.gas2.data.labels = [...labels];
      charts.current.gas2.data.datasets[0].data = tail.map((r) => r.no2);
      charts.current.gas2.data.datasets[1].data = tail.map((r) => r.so2);
      charts.current.gas2.update("none");
    }
  };

  useEffect(() => {
    charts.current.pm25 = makeChart(refs.pm25.current, "PM2.5", "#10B981");
    charts.current.pm10 = makeChart(refs.pm10.current, "PM10",  "#3B82F6");
    charts.current.co2  = makeChart(refs.co2.current,  "CO2",   "#F59E0B");
    charts.current.gas2 = new Chart(refs.gas2.current, {
      type: "line",
      data: { labels: [], datasets: [
        { label: "NO2", data: [], borderColor: "#8B5CF6", tension: 0.3, pointRadius: 0, borderWidth: 1.5, fill: false },
        { label: "SO2", data: [], borderColor: "#EF4444", tension: 0.3, pointRadius: 0, borderWidth: 1.5, fill: false },
      ]},
      options: { ...OPTS, plugins: { ...OPTS.plugins, legend: { display: true,
        labels: { color: "#94A3B8", boxWidth: 10, font: { size: 10 } } } } },
    });

    // Fill charts immediately from existing readings (CSV/live history)
    seedFromReadings();

    return () => Object.values(charts.current).forEach((c) => c?.destroy());
  }, []);

  useEffect(() => {
    // Keep charts in sync when readings are loaded in bulk (for example CSV upload)
    seedFromReadings();
  }, [readings]);

  useEffect(() => {
    if (!latest || paused) return;
    const lbl = new Date(latest.timestamp).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const push = (chart, vals) => {
      chart.data.labels.push(lbl);
      vals.forEach((v, i) => chart.data.datasets[i].data.push(v));
      if (chart.data.labels.length > STREAM_LEN) {
        chart.data.labels.shift();
        chart.data.datasets.forEach((d) => d.data.shift());
      }
      chart.update("none");
    };
    if (charts.current.pm25) push(charts.current.pm25, [latest.pm25]);
    if (charts.current.pm10) push(charts.current.pm10, [latest.pm10]);
    if (charts.current.co2)  push(charts.current.co2,  [latest.co2]);
    if (charts.current.gas2) push(charts.current.gas2, [latest.no2, latest.so2]);
  }, [latest, paused]);

  const Card = ({ label, canvasRef }) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace",
        letterSpacing: "0.08em", marginBottom: 12 }}>{label}</div>
      <div style={{ position: "relative", height: 200 }}><canvas ref={canvasRef} /></div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Real-Time Data Stream</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
                      </p>
        </div>
        <button onClick={onPause} style={{
          padding: "7px 16px", background: "var(--surface2)", border: "1px solid var(--border2)",
          borderRadius: 8, color: "var(--text2)", fontSize: 12, cursor: "pointer",
          fontFamily: "Syne, sans-serif", fontWeight: 600,
        }}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card label="PM2.5 LIVE STREAM"  canvasRef={refs.pm25} />
        <Card label="PM10 LIVE STREAM"   canvasRef={refs.pm10} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card label="CO2 LIVE STREAM"    canvasRef={refs.co2}  />
        <Card label="NO2 & SO2 LIVE"     canvasRef={refs.gas2} />
      </div>

      {/* Stream log */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.08em", marginBottom: 12 }}>FULL DATA STREAM LOG</div>
        <div style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse",
            fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
            <thead>
              <tr>{["TIMESTAMP","PM2.5","PM10","CO2","NO2","SO2","VOC","AQI","STATUS"].map((h) => (
                <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "var(--text3)",
                  borderBottom: "1px solid var(--border)", fontWeight: 500, fontSize: 10 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {readings.slice(-50).reverse().map((r, i) => {
                const s = classifyAQI(r.aqi);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "7px 10px", color: "var(--text3)" }}>{new Date(r.timestamp).toISOString().slice(11, 19)}</td>
                    <td style={{ padding: "7px 10px", color: "var(--text2)" }}>{r.pm25}</td>
                    <td style={{ padding: "7px 10px", color: "var(--text2)" }}>{r.pm10}</td>
                    <td style={{ padding: "7px 10px", color: "var(--text2)" }}>{r.co2}</td>
                    <td style={{ padding: "7px 10px", color: "var(--text2)" }}>{r.no2}</td>
                    <td style={{ padding: "7px 10px", color: "var(--text2)" }}>{r.so2}</td>
                    <td style={{ padding: "7px 10px", color: "var(--text2)" }}>{r.voc}</td>
                    <td style={{ padding: "7px 10px", color: "var(--text2)" }}>{r.aqi}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{ background: s.bg, color: s.color, padding: "1px 7px", borderRadius: 8, fontWeight: 600 }}>
                        {s.label}
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
