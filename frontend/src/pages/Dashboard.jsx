/**
 * Dashboard — Main overview with properly constrained grids.
 * Fixes: card clipping, overlapping layout, cramped KPIs.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import KPICard from "../components/KPICard.jsx";
import { classifyAQI, classifyPollutant, CITIES, downloadCSV } from "../services/utils.js";
import { uploadCSV } from "../services/api.js";

Chart.register(...registerables);

/* ── Shared Chart.js options ────────────────────────────────── */
const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1E293B",
      titleColor: "#94A3B8",
      bodyColor: "#F1F5F9",
      borderColor: "rgba(241,245,249,0.08)",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(241,245,249,0.04)" },
      ticks: { color: "#64748B", font: { size: 10, family: "JetBrains Mono" }, maxTicksLimit: 8 },
    },
    y: {
      grid: { color: "rgba(241,245,249,0.04)" },
      ticks: { color: "#64748B", font: { size: 10, family: "JetBrains Mono" } },
    },
  },
};

/* ── Card wrapper ───────────────────────────────────────────── */
const Card = ({ title, children, style }) => (
  <div style={{
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 20,
    minWidth: 0,
    ...style,
  }}>
    {title && (
      <div style={{
        fontSize: 10, fontWeight: 600, color: "var(--text3)",
        fontFamily: "JetBrains Mono, monospace",
        letterSpacing: "0.09em", textTransform: "uppercase",
        marginBottom: 14,
      }}>{title}</div>
    )}
    {children}
  </div>
);

/* ── Section divider ────────────────────────────────────────── */
const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "28px 0 20px" }}>
    <div style={{ flex: 1, height: 1, background: "var(--border2)" }} />
    <div style={{
      fontSize: 11, color: "var(--text3)", fontWeight: 600,
      fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em",
      whiteSpace: "nowrap",
    }}>{label}</div>
    <div style={{ flex: 1, height: 1, background: "var(--border2)" }} />
  </div>
);

/* ── CSV Summary ────────────────────────────────────────────── */
function CSVSummaryCard({ summary, filename, rowCount, onClear }) {
  const worstCls = classifyAQI(summary.max_aqi);
  const stats = [
    ["Rows",       rowCount],
    ["Avg PM2.5",  `${summary.avg_pm25} µg/m³`],
    ["Max PM2.5",  `${summary.max_pm25} µg/m³`],
    ["Avg AQI",    summary.avg_aqi],
    ["Max AQI",    summary.max_aqi],
    ["Cities",     (summary.cities || []).join(", ") || "—"],
  ];
  return (
    <div style={{
      background: "rgba(16,185,129,0.06)",
      border: "1px solid rgba(16,185,129,0.22)",
      borderRadius: 10, padding: 16, marginBottom: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{filename}</div>
            <div style={{ fontSize: 10, color: "var(--primary)", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
              CSV LOADED — {rowCount} rows parsed
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            background: worstCls.bg, color: worstCls.color,
            padding: "3px 11px", borderRadius: 5, fontSize: 11, fontWeight: 700,
          }}>Worst: {worstCls.label}</span>
          <button onClick={onClear} style={{
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)",
            color: "#EF4444", padding: "4px 11px", borderRadius: 6,
            fontSize: 11, cursor: "pointer", fontFamily: "Syne, sans-serif", fontWeight: 600,
          }}>✕ Clear</button>
        </div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 10,
      }}>
        {stats.map(([l, v]) => (
          <div key={l} style={{
            background: "var(--surface)", borderRadius: 8, padding: "10px 12px",
            border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: 5 }}>
              {l.toUpperCase()}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", wordBreak: "break-word" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── CSV Upload zone ─────────────────────────────────────────── */
function UploadZone({ onLoad, loading, setLoading }) {
  const inputRef      = useRef(null);
  const [drag, setDrag]   = useState(false);
  const [error, setError] = useState(null);

  const process = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a .csv file"); return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await uploadCSV(file);
      onLoad(result);
    } catch {
      const text   = await file.text();
      const result = parseBrowser(text, file.name);
      onLoad(result);
    } finally {
      setLoading(false);
    }
  }, [onLoad, setLoading]);

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? "var(--primary)" : "var(--border2)"}`,
          borderRadius: 12, padding: "30px 20px",
          textAlign: "center", cursor: "pointer",
          background: drag ? "rgba(16,185,129,0.05)" : "var(--surface2)",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        {loading
          ? <div style={{ color: "var(--primary)", fontSize: 14 }}>⏳ Parsing...</div>
          : <>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>
                Drop your CSV here or click to browse
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                Columns: timestamp · city · pm25 · pm10 · co2 · no2 · so2 · voc · aqi
              </div>
            </>
        }
        <input ref={inputRef} type="file" accept=".csv"
          onChange={e => process(e.target.files[0])} style={{ display: "none" }} />
      </div>
      {error && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>⚠ {error}</div>}
    </div>
  );
}

/* ── Browser CSV parser ──────────────────────────────────────── */
function parseBrowser(text, filename) {
  const lines = text.trim().split("\n");
  const ALIAS = { "pm2.5":"pm25", latitude:"lat", longitude:"lon",
                  datetime:"timestamp", date_time:"timestamp", location:"city" };
  const hdrs  = lines[0].split(",")
    .map(h => { const k = h.trim().replace(/^["']|["']$/g,"").toLowerCase().replace(/\s+/g,"_"); return ALIAS[k]||k; });
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].trim().split(",").map(v => v.trim().replace(/^["']|["']$/g,""));
    if (vals.length < 2) continue;
    const r = Object.fromEntries(hdrs.map((h,j)=>[h,vals[j]||""]));
    try {
      const pm25 = parseFloat(r.pm25||0), pm10 = parseFloat(r.pm10||0);
      const no2  = parseFloat(r.no2||0),  so2  = parseFloat(r.so2||0);
      const co2  = parseFloat(r.co2||400),voc  = parseFloat(r.voc||0);
      const aqi  = r.aqi ? parseInt(r.aqi) : Math.round(Math.min(500,Math.max(0,pm25*2.1)));
      const cls  = aqi<=50?"Safe":aqi<=100?"Moderate":aqi<=200?"Unhealthy":"Hazardous";
      rows.push({
        timestamp: r.timestamp||r.date||new Date().toISOString(),
        city: r.city||"unknown", lat: parseFloat(r.lat||0), lon: parseFloat(r.lon||0),
        pm25, pm10, co2, no2, so2, voc, aqi, status: r.status||cls,
      });
    } catch {}
  }
  const avg = (k) => rows.length ? +(rows.reduce((s,r)=>s+r[k],0)/rows.length).toFixed(1) : 0;
  return {
    filename, parsed: rows.length, errors: 0, rows,
    summary: {
      avg_pm25: avg("pm25"), max_pm25: rows.length?Math.max(...rows.map(r=>r.pm25)):0,
      avg_aqi:  Math.round(avg("aqi")), max_aqi: rows.length?Math.max(...rows.map(r=>r.aqi)):0,
      cities: [...new Set(rows.map(r=>r.city))],
    },
  };
}

/* ── CSV Charts ──────────────────────────────────────────────── */
function CSVCharts({ rows }) {
  const refs  = { pm: useRef(), aqi: useRef(), dist: useRef() };
  const charts = useRef({});

  useEffect(() => {
    Object.values(charts.current).forEach(c => c?.destroy());
    charts.current = {};
    if (!rows.length) return;

    const labels = rows.map(r => String(r.timestamp).slice(11,16)||String(r.timestamp).slice(0,10));
    const pm25   = rows.map(r => r.pm25);
    const pm10   = rows.map(r => r.pm10);
    const aqiVals = rows.map(r => r.aqi);

    if (refs.pm.current) {
      charts.current.pm = new Chart(refs.pm.current, {
        type: "line",
        data: { labels, datasets: [
          { label:"PM2.5", data:pm25, borderColor:"#10B981", tension:0.4, pointRadius:2, borderWidth:2, backgroundColor:"rgba(16,185,129,0.08)", fill:true },
          { label:"PM10",  data:pm10, borderColor:"#3B82F6", tension:0.4, pointRadius:2, borderWidth:2, backgroundColor:"rgba(59,130,246,0.04)", fill:true },
        ]},
        options: { ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display:true, labels:{ color:"#94A3B8", boxWidth:12, font:{size:11} } } } },
      });
    }
    if (refs.aqi.current) {
      charts.current.aqi = new Chart(refs.aqi.current, {
        type: "bar",
        data: { labels, datasets: [{ label:"AQI", data:aqiVals,
          backgroundColor: aqiVals.map(v=>v<=50?"#10B981":v<=100?"#F59E0B":v<=200?"#EF4444":"#7F1D1D"),
          borderRadius:3, borderSkipped:false }] },
        options: CHART_OPTS,
      });
    }
    if (refs.dist.current) {
      const counts = { Safe:0, Moderate:0, Unhealthy:0, Hazardous:0 };
      aqiVals.forEach(v => {
        if (v<=50) counts.Safe++; else if (v<=100) counts.Moderate++; else if (v<=200) counts.Unhealthy++; else counts.Hazardous++;
      });
      charts.current.dist = new Chart(refs.dist.current, {
        type: "doughnut",
        data: { labels: Object.keys(counts), datasets: [{ data:Object.values(counts),
          backgroundColor:["#10B981","#F59E0B","#EF4444","#7F1D1D"], borderColor:"#1E293B", borderWidth:2 }] },
        options: { responsive:true, maintainAspectRatio:false,
          plugins: { legend: { position:"bottom", labels:{ color:"#94A3B8", font:{size:11}, padding:12 } } } },
      });
    }
    return () => { Object.values(charts.current).forEach(c=>c?.destroy()); charts.current = {}; };
  }, [rows]);

  if (!rows.length) return null;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 240px", gap:16, marginBottom:20 }}>
      <Card title="PM2.5 & PM10 from CSV"><div style={{ position:"relative", height:200 }}><canvas ref={refs.pm} /></div></Card>
      <Card title="AQI Timeline from CSV"><div style={{ position:"relative", height:200 }}><canvas ref={refs.aqi} /></div></Card>
      <Card title="Status Distribution"><div style={{ position:"relative", height:200 }}><canvas ref={refs.dist} /></div></Card>
    </div>
  );
}

/* ── CSV Data Table ──────────────────────────────────────────── */
function CSVTable({ rows }) {
  const [page,    setPage]    = useState(0);
  const [filter,  setFilter]  = useState("all");
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const PER = 15;

  const filtered = rows.filter(r =>
    filter==="all"      ? true :
    filter==="safe"     ? r.aqi<=50 :
    filter==="moderate" ? r.aqi<=100 :
    filter==="unhealthy"? r.aqi<=200 : r.aqi>200
  );
  const sorted = [...filtered].sort((a,b) => {
    const av=a[sortKey], bv=b[sortKey];
    const n = typeof av==="number" ? av-bv : String(av).localeCompare(String(bv));
    return sortDir==="asc" ? n : -n;
  });
  const paged = sorted.slice(page*PER,(page+1)*PER);
  const total = Math.ceil(sorted.length/PER);
  const onSort = k => { if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(k);setSortDir("desc");} setPage(0); };

  const COLS = [
    {key:"timestamp",label:"TIMESTAMP"},{key:"city",label:"CITY"},
    {key:"pm25",label:"PM2.5"},{key:"pm10",label:"PM10"},
    {key:"co2",label:"CO2"},{key:"no2",label:"NO2"},
    {key:"so2",label:"SO2"},{key:"voc",label:"VOC"},
    {key:"aqi",label:"AQI"},{key:"status",label:"STATUS"},
  ];

  const Btn = ({ active, children, onClick }) => (
    <button onClick={onClick} style={{
      padding:"4px 11px", borderRadius:6, fontSize:11, cursor:"pointer",
      fontFamily:"Syne, sans-serif", fontWeight:600,
      background: active?"var(--primary)":"var(--surface2)",
      color:      active?"#fff":"var(--text3)",
      border:     active?"none":"1px solid var(--border2)",
    }}>{children}</button>
  );

  return (
    <Card title={`CSV DATA TABLE — ${sorted.length} ROWS`}>
      {/* Controls */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {["all","safe","moderate","unhealthy","hazardous"].map(f => (
          <Btn key={f} active={filter===f} onClick={()=>{setFilter(f);setPage(0);}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </Btn>
        ))}
        <div style={{ marginLeft:"auto" }}>
          <Btn active={false} onClick={()=>downloadCSV(rows,"ecosentinel_export.csv")}>↓ Export</Btn>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto", marginBottom:12 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, fontFamily:"JetBrains Mono, monospace" }}>
          <thead>
            <tr>
              {COLS.map(({key,label}) => (
                <th key={key} onClick={()=>onSort(key)} style={{
                  padding:"7px 10px", textAlign:"left",
                  color: sortKey===key ? "var(--primary)" : "var(--text3)",
                  fontSize:9, borderBottom:"1px solid var(--border)",
                  fontWeight:600, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap",
                }}>{label}{sortKey===key?(sortDir==="asc"?" ↑":" ↓"):""}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r,i) => {
              const s = classifyAQI(r.aqi);
              return (
                <tr key={i} style={{ borderBottom:"1px solid var(--border)" }}>
                  <td style={{ padding:"7px 10px", color:"var(--text3)", fontSize:10 }}>
                    {String(r.timestamp).slice(0,19).replace("T"," ")}
                  </td>
                  <td style={{ padding:"7px 10px", color:"var(--text)", fontWeight:600 }}>{r.city}</td>
                  <td style={{ padding:"7px 10px", color:r.pm25>35.5?"#EF4444":"var(--text2)" }}>{r.pm25}</td>
                  <td style={{ padding:"7px 10px", color:"var(--text2)" }}>{r.pm10}</td>
                  <td style={{ padding:"7px 10px", color:"var(--text2)" }}>{r.co2}</td>
                  <td style={{ padding:"7px 10px", color:"var(--text2)" }}>{r.no2}</td>
                  <td style={{ padding:"7px 10px", color:"var(--text2)" }}>{r.so2}</td>
                  <td style={{ padding:"7px 10px", color:"var(--text2)" }}>{r.voc}</td>
                  <td style={{ padding:"7px 10px", color:"var(--text)", fontWeight:700 }}>{r.aqi}</td>
                  <td style={{ padding:"7px 10px" }}>
                    <span style={{ background:s.bg, color:s.color, padding:"2px 8px", borderRadius:8, fontSize:10, fontWeight:700 }}>
                      ● {r.status||s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {paged.length===0 && (
              <tr><td colSpan={10} style={{ padding:24, textAlign:"center", color:"var(--text3)" }}>
                No rows match this filter
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 1 && (
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10 }}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
            style={{ padding:"4px 14px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:6, color:"var(--text2)", fontSize:12, cursor:"pointer" }}>‹</button>
          <span style={{ fontSize:12, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace" }}>
            {page+1} / {total}
          </span>
          <button onClick={()=>setPage(p=>Math.min(total-1,p+1))} disabled={page>=total-1}
            style={{ padding:"4px 14px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:6, color:"var(--text2)", fontSize:12, cursor:"pointer" }}>›</button>
        </div>
      )}
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════ */
export default function Dashboard({ city, latest, readings, onSpike, onCSVLoad, onAlertsGenerated, onCsvClear }) {
  const pmRef   = useRef(null);
  const gasRef  = useRef(null);
  const pmChart  = useRef(null);
  const gasChart = useRef(null);

  const [csvResult,  setCSVResult]  = useState(null);
  const [csvLoading, setCSVLoading] = useState(false);
  const [activeTab,  setActiveTab]  = useState("live");

  /* ── Init charts ── */
  useEffect(() => {
    if (pmRef.current && !pmChart.current) {
      pmChart.current = new Chart(pmRef.current, {
        type:"line",
        data:{ labels:[], datasets:[
          { label:"PM2.5", data:[], borderColor:"#10B981", tension:0.4, pointRadius:0, borderWidth:2, backgroundColor:"rgba(16,185,129,0.08)", fill:true },
          { label:"PM10",  data:[], borderColor:"#3B82F6", tension:0.4, pointRadius:0, borderWidth:2, backgroundColor:"rgba(59,130,246,0.04)", fill:true },
        ]},
        options:{ ...CHART_OPTS, plugins:{ ...CHART_OPTS.plugins, legend:{ display:true, labels:{ color:"#94A3B8", boxWidth:12, font:{size:11} } } } },
      });
    }
    if (gasRef.current && !gasChart.current) {
      gasChart.current = new Chart(gasRef.current, {
        type:"line",
        data:{ labels:[], datasets:[
          { label:"CO2÷10", data:[], borderColor:"#F59E0B", tension:0.4, pointRadius:0, borderWidth:2, backgroundColor:"rgba(245,158,11,0.06)", fill:true },
          { label:"NO2",    data:[], borderColor:"#8B5CF6", tension:0.4, pointRadius:0, borderWidth:2, fill:false },
        ]},
        options:{ ...CHART_OPTS, plugins:{ ...CHART_OPTS.plugins, legend:{ display:true, labels:{ color:"#94A3B8", boxWidth:12, font:{size:11} } } } },
      });
    }
    return () => {
      pmChart.current?.destroy();  pmChart.current  = null;
      gasChart.current?.destroy(); gasChart.current = null;
    };
  }, []);

  /* ── Push live data — only if CSV not loaded ── */
  useEffect(() => {
    if (!latest || csvResult) return;  // Don't update if CSV loaded
    const lbl = new Date(latest.timestamp).toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit"});
    const push = (chart, vals, max=30) => {
      chart.data.labels.push(lbl);
      vals.forEach((v,i) => chart.data.datasets[i].data.push(v));
      if (chart.data.labels.length>max) { chart.data.labels.shift(); chart.data.datasets.forEach(d=>d.data.shift()); }
      chart.update("none");
    };
    if (pmChart.current)  push(pmChart.current,  [latest.pm25, latest.pm10]);
    if (gasChart.current) push(gasChart.current, [+(latest.co2/10).toFixed(1), latest.no2]);
  }, [latest, csvResult]);

  const handleCSVLoad = async (result) => {
    setCSVResult(result);
    setActiveTab("csv");
    onCSVLoad?.(result.rows);
    
    // Generate alerts from CSV data
    try {
      const response = await fetch("http://localhost:8000/alerts/generate-from-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.rows),
      });
      const data = await response.json();
      if (onAlertsGenerated) {
        onAlertsGenerated(data.alerts || []);
      }
    } catch (error) {
      console.error("Failed to generate alerts from CSV:", error);
    }
  };
  
  const handleClearCSV = () => {
    setCSVResult(null);
    setActiveTab("live");
    onCSVLoad?.([]);
    onCsvClear?.();  // Notify parent to resume live data
  };

  if (!latest) return (
    <div style={{ color:"var(--text3)", padding:60, textAlign:"center", fontSize:14 }}>
      ⏳ Initialising sensor data...
    </div>
  );

  const prev   = readings[readings.length-2] || latest;
  const status = classifyAQI(latest.aqi);
  const city_  = CITIES[city];
  const BAR_COLORS = { safe:"#10B981", moderate:"#F59E0B", unhealthy:"#EF4444", hazardous:"#EF4444" };
  const bars = [
    { key:"pm25", val:latest.pm25, max:200, label:"PM2.5" },
    { key:"pm10", val:latest.pm10, max:400, label:"PM10"  },
    { key:"no2",  val:latest.no2,  max:400, label:"NO2"   },
    { key:"so2",  val:latest.so2,  max:304, label:"SO2"   },
    { key:"voc",  val:latest.voc,  max:400, label:"VOC"   },
  ];

  return (
    <div className="fade-in">

      {/* ── LIVE DATA SECTION (Hidden when CSV loaded) ── */}
      {!csvResult && (
        <>
          {/* ── Header ── */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:26, flexWrap:"wrap", gap:12 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text)", lineHeight:1.2 }}>{city_?.name}</h1>
              <p style={{ fontSize:12, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", marginTop:4 }}>
                AQI {latest.aqi} — {status.label} · Last updated {new Date(latest.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>downloadCSV(readings)} style={{
                padding:"8px 16px", background:"var(--surface2)", border:"1px solid var(--border2)",
                borderRadius:8, color:"var(--text2)", fontSize:12, cursor:"pointer",
                fontFamily:"Syne, sans-serif", fontWeight:600,
              }}>↓ Export CSV</button>
              <button onClick={onSpike} style={{
                padding:"8px 16px", background:"var(--primary)", border:"none",
                borderRadius:8, color:"#fff", fontSize:12, cursor:"pointer",
                fontFamily:"Syne, sans-serif", fontWeight:600,
              }}>⚡ Simulate Spike</button>
            </div>
          </div>

          {/* ── Primary KPIs — 4 columns ── */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(4, minmax(0,1fr))",
            gap:14, marginBottom:14,
          }}>
            <KPICard label="PM2.5"     value={latest.pm25} unit="µg/m³"           status={classifyPollutant("pm25",latest.pm25)} trendVal={(latest.pm25-prev.pm25).toFixed(1)} />
            <KPICard label="PM10"      value={latest.pm10} unit="µg/m³"           status={classifyPollutant("pm10",latest.pm10)} trendVal={(latest.pm10-prev.pm10).toFixed(1)} />
            <KPICard label="CO2"       value={latest.co2}  unit="ppm"             status={classifyPollutant("co2", latest.co2)}  trendVal={(latest.co2 -prev.co2 ).toFixed(0)} />
            <KPICard label="AQI Index" value={latest.aqi}  unit="Air Quality Index" status={status}                            trendVal={(latest.aqi -prev.aqi ).toFixed(0)} />
          </div>

          {/* ── Secondary KPIs — 3 columns ── */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(3, minmax(0,1fr))",
            gap:14, marginBottom:22,
          }}>
            <KPICard label="NO2 — Nitrogen Dioxide"       value={latest.no2} unit="ppb" status={classifyPollutant("no2",latest.no2)} />
            <KPICard label="SO2 — Sulfur Dioxide"         value={latest.so2} unit="ppb" status={classifyPollutant("so2",latest.so2)} />
            <KPICard label="VOC — Volatile Organic Cmpd"  value={latest.voc} unit="ppb" status={classifyPollutant("voc",latest.voc)} />
          </div>

          {/* ── Live charts — 2 columns ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:16, marginBottom:16 }}>
            <Card title="Live — PM2.5 & PM10 Trend">
              <div style={{ position:"relative", height:240 }}><canvas ref={pmRef} /></div>
            </Card>
            <Card title="Live — CO2 & NO2 Trend">
              <div style={{ position:"relative", height:240 }}><canvas ref={gasRef} /></div>
            </Card>
          </div>

          {/* ── Threshold bars + recent table — 2 columns ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:16, marginBottom:6 }}>
            {/* Bars */}
            <Card title="Pollutant Levels vs Thresholds">
              {bars.map(b => {
                const pct = Math.min(100,(b.val/b.max)*100);
                const cls = classifyPollutant(b.key,b.val);
                return (
                  <div key={b.key} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:11 }}>
                    <div style={{ fontSize:11, color:"var(--text2)", width:40, fontFamily:"JetBrains Mono, monospace", flexShrink:0 }}>{b.label}</div>
                    <div style={{ flex:1, height:6, background:"rgba(241,245,249,0.08)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct.toFixed(1)}%`, background:BAR_COLORS[cls.cls], borderRadius:3, transition:"width 0.8s ease" }} />
                    </div>
                    <div style={{ fontSize:11, color:"var(--text3)", width:42, textAlign:"right", fontFamily:"JetBrains Mono, monospace", flexShrink:0 }}>{b.val}</div>
                  </div>
                );
              })}
            </Card>

            {/* Recent table */}
            <Card title="Recent Live Readings">
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead><tr>
                    {["TIME","PM2.5","PM10","CO2","AQI","STATUS"].map(h=>(
                      <th key={h} style={{ padding:"5px 8px", textAlign:"left", color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", fontSize:9, borderBottom:"1px solid var(--border)", fontWeight:600 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {readings.slice(-8).reverse().map((r,i) => {
                      const s = classifyAQI(r.aqi);
                      return (
                        <tr key={i} style={{ borderBottom:"1px solid var(--border)" }}>
                          <td style={{ padding:"6px 8px", color:"var(--text3)", fontFamily:"JetBrains Mono, monospace" }}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                          <td style={{ padding:"6px 8px", color:r.pm25>35.5?"#EF4444":"var(--text2)" }}>{r.pm25}</td>
                          <td style={{ padding:"6px 8px", color:"var(--text2)" }}>{r.pm10}</td>
                          <td style={{ padding:"6px 8px", color:"var(--text2)" }}>{r.co2}</td>
                          <td style={{ padding:"6px 8px", color:"var(--text)", fontWeight:700 }}>{r.aqi}</td>
                          <td style={{ padding:"6px 8px" }}>
                            <span style={{ background:s.bg, color:s.color, padding:"2px 7px", borderRadius:8, fontSize:10, fontWeight:700 }}>● {s.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════
          CSV DATA READER SECTION
      ══════════════════════════════════════ */}
      <Divider label="CSV DATA READER" />

      {/* Format hint */}
      <div style={{
        background:"var(--surface2)", border:"1px solid var(--border)",
        borderRadius:8, padding:"10px 16px", marginBottom:16,
        display:"flex", gap:8, flexWrap:"wrap", alignItems:"center",
      }}>
        <span style={{ fontSize:11, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", flexShrink:0 }}>Expected columns:</span>
        {["timestamp","city","lat","lon","pm25","pm10","co2","no2","so2","voc","aqi","status"].map(c=>(
          <span key={c} style={{ fontSize:10, background:"rgba(16,185,129,0.10)", color:"var(--primary)", padding:"2px 7px", borderRadius:4, fontFamily:"JetBrains Mono, monospace" }}>{c}</span>
        ))}
      </div>

      {/* Tab buttons if CSV is loaded */}
      {csvResult && (
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[["live","⚡ Live Readings"],["csv","📊 CSV Analysis"]].map(([t,l]) => (
            <button key={t} onClick={()=>setActiveTab(t)} style={{
              padding:"7px 18px", borderRadius:7, fontSize:12, cursor:"pointer",
              fontFamily:"Syne, sans-serif", fontWeight:600,
              background: activeTab===t ? "var(--primary)" : "var(--surface2)",
              color:      activeTab===t ? "#fff" : "var(--text2)",
              border:     activeTab===t ? "none" : "1px solid var(--border2)",
            }}>{l}</button>
          ))}
        </div>
      )}

      {/* Upload zone — always shown when no CSV */}
      {!csvResult && <UploadZone onLoad={handleCSVLoad} loading={csvLoading} setLoading={setCSVLoading} />}

      {/* CSV analysis tab */}
      {csvResult && activeTab==="csv" && (
        <>
          <CSVSummaryCard summary={csvResult.summary} filename={csvResult.filename} rowCount={csvResult.parsed} onClear={handleClearCSV} />
          <CSVCharts rows={csvResult.rows} />
          <CSVTable rows={csvResult.rows} />
        </>
      )}

      {/* Live tab with CSV loaded info bar */}
      {csvResult && activeTab==="live" && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8 }}>
          <span style={{ fontSize:13, color:"var(--text2)" }}>
            📊 <strong style={{ color:"var(--text)" }}>{csvResult.filename}</strong> — {csvResult.parsed} rows loaded
          </span>
          <button onClick={()=>setActiveTab("csv")} style={{ marginLeft:"auto", padding:"5px 14px", background:"var(--primary)", border:"none", borderRadius:6, color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Syne, sans-serif", fontWeight:600 }}>
            View Analysis →
          </button>
          <button onClick={handleClearCSV} style={{ padding:"5px 11px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.22)", borderRadius:6, color:"#EF4444", fontSize:12, cursor:"pointer" }}>
            ✕ Clear
          </button>
        </div>
      )}

      {csvResult?.errors > 0 && (
        <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.22)", borderRadius:8, fontSize:12, color:"#F59E0B" }}>
          ⚠ {csvResult.errors} row(s) skipped due to parse errors.
        </div>
      )}
    </div>
  );
}
