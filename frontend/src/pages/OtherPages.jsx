/**
 * Alerts, Recommendations, Chatbot, Admin pages
 */
import React, { useState, useEffect } from "react";
import { classifyAQI, calcAQI, CITIES, simulateReading } from "../services/utils.js";

/* ════════════════════════════════════════════════
   ALERTS PAGE  (dashboard notifications only)
════════════════════════════════════════════════ */
export function Alerts({ alerts, onClearAlerts, onSpike }) {
  const [resolvedAlerts, setResolvedAlerts] = useState([]);

  useEffect(() => {
    // Fetch resolved alerts
    const fetchResolved = async () => {
      try {
        const response = await fetch("http://localhost:8000/alerts/resolved?hours=24");
        const data = await response.json();
        setResolvedAlerts(data.alerts || []);
      } catch (error) {
        console.error("Failed to fetch resolved alerts:", error);
      }
    };
    fetchResolved();
  }, [alerts]);

  const critical = alerts.filter(a => a.level === "critical");
  const warning  = alerts.filter(a => a.level === "warning");
  const info     = alerts.filter(a => a.level === "info");

  const S = {
    critical: { dot:"#EF4444", border:"rgba(239,68,68,0.25)",  bg:"rgba(239,68,68,0.06)",  badge:"rgba(239,68,68,0.15)",  text:"#EF4444" },
    warning:  { dot:"#F59E0B", border:"rgba(245,158,11,0.25)", bg:"rgba(245,158,11,0.06)", badge:"rgba(245,158,11,0.15)", text:"#F59E0B" },
    info:     { dot:"#3B82F6", border:"rgba(59,130,246,0.25)", bg:"rgba(59,130,246,0.06)", badge:"rgba(59,130,246,0.15)", text:"#3B82F6" },
    resolved: { dot:"#10B981", border:"rgba(16,185,129,0.25)",  bg:"rgba(16,185,129,0.06)",  badge:"rgba(16,185,129,0.15)",  text:"#10B981" },
  };

  return (
    <div className="fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text)" }}>Alert System</h1>
          <p style={{ fontSize:13, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", marginTop:2 }}>
            Real-time threshold monitoring — active & resolved alerts
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClearAlerts} style={{ padding:"7px 14px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:8, color:"var(--text2)", fontSize:12, cursor:"pointer", fontFamily:"Syne, sans-serif", fontWeight:600 }}>Clear All</button>
          <button onClick={onSpike}       style={{ padding:"7px 14px", background:"var(--primary)", border:"none", borderRadius:8, color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Syne, sans-serif", fontWeight:600 }}>⚡ Trigger Test</button>
        </div>
      </div>

      {/* Counts */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[["Critical",critical.length,"#EF4444"],["Warnings",warning.length,"#F59E0B"],["Informational",info.length,"#3B82F6"],["Resolved",resolvedAlerts.length,"#10B981"]].map(([l,c,col]) => (
          <div key={l} style={{ background:"var(--surface2)", border:`1px solid var(--border)`, borderLeft:`3px solid ${col}`, borderRadius:8, padding:14, textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, color:col, fontFamily:"JetBrains Mono, monospace" }}>{c}</div>
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>{l} Alerts</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:16 }}>
        {/* Alert list */}
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:12 }}>ACTIVE ALERTS ({alerts.length})</div>
          {alerts.length === 0 && (
            <div style={{ padding:40, textAlign:"center", color:"var(--text3)", background:"var(--surface2)", borderRadius:12, border:"1px solid var(--border)" }}>
              ✅ No active alerts — all systems nominal
            </div>
          )}
          {alerts.slice(0,20).map(a => {
            const s = S[a.level] || S.info;
            return (
              <div key={a._id} style={{ display:"flex", gap:12, padding:12, borderRadius:8, marginBottom:8, border:`1px solid ${s.border}`, background:s.bg }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:s.dot, flexShrink:0, marginTop:4, animation:a.level==="critical"?"pulse 1s infinite":"none" }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{a.message}</div>
                  <div style={{ fontSize:10, color:"var(--text3)", marginTop:4, fontFamily:"JetBrains Mono, monospace" }}>
                    🕐 {new Date(a.timestamp).toLocaleTimeString()} · {a.city}
                  </div>
                </div>
                <span style={{ background:s.badge, color:s.text, fontSize:10, padding:"2px 8px", borderRadius:3, fontFamily:"JetBrains Mono, monospace", alignSelf:"flex-start", flexShrink:0 }}>
                  {(a.level||"info").toUpperCase()}
                </span>
              </div>
            );
          })}

          {/* Resolved alerts section */}
          <div style={{ marginTop:28 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:12 }}>✅ RESOLVED ({resolvedAlerts.length})</div>
            {resolvedAlerts.length === 0 && (
              <div style={{ padding:20, textAlign:"center", color:"var(--text3)", background:"var(--surface2)", borderRadius:12, border:"1px solid var(--border2)", fontSize:12 }}>
                No resolved alerts yet
              </div>
            )}
            {resolvedAlerts.slice(0,10).map(a => {
              const s = S.resolved;
              return (
                <div key={a._id} style={{ display:"flex", gap:12, padding:12, borderRadius:8, marginBottom:8, border:`1px solid ${s.border}`, background:s.bg, opacity:0.85 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:s.dot, flexShrink:0, marginTop:4 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{a.message}</div>
                    <div style={{ fontSize:10, color:"var(--text3)", marginTop:4, fontFamily:"JetBrains Mono, monospace" }}>
                      🕐 Resolved at {new Date(a.resolved_at).toLocaleTimeString()} · {a.city}
                    </div>
                  </div>
                  <span style={{ background:s.badge, color:s.text, fontSize:10, padding:"2px 8px", borderRadius:3, fontFamily:"JetBrains Mono, monospace", alignSelf:"flex-start", flexShrink:0 }}>
                    RESOLVED
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Threshold reference */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:12 }}>THRESHOLD REFERENCE</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead><tr>
              {["Pollutant","⚠ Warning","🚨 Critical"].map(h => (
                <th key={h} style={{ padding:"5px 8px", textAlign:"left", color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", fontSize:9, borderBottom:"1px solid var(--border)", fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[["PM2.5","35.5","55.5"],["PM10","154","254"],["CO2","1000","1500"],["NO2","100","200"],["SO2","75","185"],["VOC","100","200"]].map(([p,w,c]) => (
                <tr key={p} style={{ borderBottom:"1px solid var(--border)" }}>
                  <td style={{ padding:"7px 8px", color:"var(--text)", fontWeight:500 }}>{p}</td>
                  <td style={{ padding:"7px 8px", color:"#F59E0B", fontFamily:"JetBrains Mono, monospace" }}>{w}</td>
                  <td style={{ padding:"7px 8px", color:"#EF4444", fontFamily:"JetBrains Mono, monospace" }}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop:16, padding:12, background:"var(--surface2)", borderRadius:8, border:"1px solid var(--border)", fontSize:12, color:"var(--text3)", lineHeight:1.6 }}>
            🔔 Alerts appear here in real-time.<br />
            Resolved alerts shown below.<br />
            Thresholds: WHO / EPA guidelines.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   RECOMMENDATIONS PAGE
════════════════════════════════════════════════ */
export function Recommendations({ city, latest }) {
  const aqi    = latest?.aqi    ?? 0;
  const status = latest?.status ?? "Safe";

  const IMMEDIATE = [
    { icon:"🏭", title:"Reduce Industrial Activity",  desc:"Suspend non-essential manufacturing in high-pollution zones. Estimated 25% PM2.5 reduction.",   priority:"CRITICAL",  color:"rgba(239,68,68,0.08)"  },
    { icon:"🚗", title:"Traffic Restriction",         desc:"Implement odd-even vehicle scheme in downtown areas. Reduces NO2 by up to 35%.",                 priority:"HIGH",      color:"rgba(245,158,11,0.08)" },
    { icon:"😷", title:"Public Health Warning",       desc:"Advise sensitive groups to stay indoors. Distribute N95 masks at health centres.",               priority:"HIGH",      color:"rgba(245,158,11,0.08)" },
    { icon:"🌱", title:"Activate Water Spray Trucks", desc:"Deploy spray trucks on arterial roads to suppress particulates. Reduces PM10 by 15-20%.",        priority:"MEDIUM",    color:"rgba(16,185,129,0.06)" },
  ];
  const POLICY = [
    { icon:"⚖️", title:"Enforce Emission Standards",  desc:"Mandate industrial stack monitoring. Issue fines for non-compliance exceeding thresholds.",      priority:"POLICY",    color:"rgba(139,92,246,0.08)" },
    { icon:"🌳", title:"Urban Afforestation Program", desc:"Plant 10,000 trees in high-pollution corridors. Long-term AQI reduction of 5-8%.",               priority:"LONG-TERM", color:"rgba(16,185,129,0.06)" },
    { icon:"⚡", title:"Electric Vehicle Adoption",   desc:"Subsidise EV adoption. Each 10% EV penetration reduces NO2 by approximately 8%.",               priority:"MED-TERM",  color:"rgba(59,130,246,0.06)" },
  ];

  const Card = ({ icon, title, desc, priority, color }) => (
    <div style={{ display:"flex", gap:12, padding:14, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", marginBottom:10 }}>
      <div style={{ width:36, height:36, borderRadius:8, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:3 }}>{title}</div>
        <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.55 }}>{desc}</div>
        <div style={{ marginTop:6, display:"inline-block", background:color, color:"var(--text2)", fontSize:10, padding:"2px 8px", borderRadius:3, fontFamily:"JetBrains Mono, monospace" }}>{priority}</div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text)" }}>AI Decision Engine</h1>
        <p style={{ fontSize:13, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", marginTop:2 }}>AI-powered recommendations &amp; policy actions</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:12 }}>IMMEDIATE ACTIONS</div>
          {IMMEDIATE.map(r => <Card key={r.title} {...r} />)}
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:12 }}>POLICY RECOMMENDATIONS</div>
          {POLICY.map(r => <Card key={r.title} {...r} />)}
        </div>
      </div>
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:14 }}>AI ANALYSIS SUMMARY</div>
        <div style={{ fontSize:13, color:"var(--text2)", lineHeight:1.9 }}>
          <strong style={{ color:"var(--primary)" }}>EcoSentinel Analysis — {CITIES[city]?.name}</strong><br /><br />
          Current AQI: <strong style={{ color:"var(--text)" }}>{aqi}</strong> ({status}).
          PM2.5 at <strong style={{ color:"var(--text)" }}>{latest?.pm25 ?? "—"} µg/m³</strong> is{" "}
          {(latest?.pm25 ?? 0) > 35.5
            ? <span style={{ color:"#EF4444" }}>above the WHO 24-hour guideline of 15 µg/m³</span>
            : "within the moderate range"}.
          Primary contributors: vehicular (NO2: {latest?.no2 ?? "—"} ppb) and industrial (SO2: {latest?.so2 ?? "—"} ppb).<br /><br />
          <strong style={{ color:"var(--text)" }}>Priority: </strong>
          {status === "Safe" ? "Continue routine monitoring." :
           status === "Moderate" ? "Issue advisory for sensitive groups and prepare traffic restriction." :
           "Immediate public health warning required. Activate emergency response protocol."}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHATBOT PAGE
════════════════════════════════════════════════ */
export function Chatbot({ city, latest }) {
  const cityName = CITIES[city]?.name ?? city;
  const [messages, setMessages] = React.useState([{
    role:"bot",
    text:`👋 Hello! I'm **EcoSentinel AI**. Ask me about current pollution levels, health risks, or forecasts for ${cityName}.`,
  }]);
  const [input,   setInput]   = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef(null);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const QUICK = ["What is the current AQI?","Is it safe to go outside?","What are the health risks?","Show me tomorrow's forecast"];

  const reply = (msg) => {
    const m   = msg.toLowerCase();
    const aqi  = latest?.aqi  ?? 0;
    const pm25 = latest?.pm25 ?? "—";
    const s    = latest?.status ?? "Safe";

    if (m.match(/aqi|current|level|pollution/))
      return `Current readings for **${cityName}**:\n\n• AQI: **${aqi}** (${s})\n• PM2.5: ${pm25} µg/m³\n• PM10: ${latest?.pm10} µg/m³\n• CO2: ${latest?.co2} ppm\n• NO2: ${latest?.no2} ppb\n• SO2: ${latest?.so2} ppb`;
    if (m.match(/safe|outside|go out/))
      return aqi<=50 ? `✅ **Yes, safe to go outside!** AQI is ${aqi} — excellent air quality.` :
             aqi<=100 ? `⚠️ **Moderate caution.** AQI is ${aqi}. Sensitive groups should limit outdoor time.` :
             `🚨 **NOT recommended.** AQI is ${aqi} (${s}). Wear N95 mask if you must go out.`;
    if (m.match(/health|risk|effect|impact/))
      return `Health impacts at AQI **${aqi}**:\n\n• General: ${aqi<=50?"Minimal risk":aqi<=100?"Slight irritation":"Significant health effects"}\n• Sensitive groups: ${aqi>100?"High risk — stay indoors":"Low risk"}\n• PM2.5 (${pm25}): ${Number(pm25)>35.5?"Can penetrate deep into lungs":"Within range"}`;
    if (m.match(/forecast|tomorrow|predict/)) {
      const pred = +((latest?.pm25 ?? 60) * (0.88 + Math.random() * 0.28)).toFixed(1);
      return `**24-Hour Forecast for ${cityName}**\n\n• Predicted PM2.5: **${pred} µg/m³**\n• Trend: ${pred > (latest?.pm25??0) ? "📈 Worsening" : "📉 Improving"}\n• Peak expected: 17:00–20:00 (rush hour)\n\nSee the Predictions tab for the full 48-hour LSTM chart.`;
    }
    return `Monitoring **${cityName}** — AQI: **${aqi}** (${s}).\n\nAsk me about: current levels · safety · health risks · tomorrow's forecast · specific pollutants`;
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(p => [...p, { role:"user", text:msg }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
    setMessages(p => [...p, { role:"bot", text:reply(msg) }]);
    setLoading(false);
  };

  const fmt = t => t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text)" }}>AI Chatbot Assistant</h1>
        <p style={{ fontSize:13, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", marginTop:2 }}>Ask about air quality, health, and forecasts</p>
      </div>
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", background:"var(--surface2)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"var(--primary)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🤖</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>EcoSentinel AI</div>
            <div style={{ fontSize:11, color:"var(--primary)", display:"flex", alignItems:"center", gap:4 }}>
              <div className="pulse" style={{ width:5, height:5, background:"var(--primary)", borderRadius:"50%", display:"inline-block" }} />
              {" "}Online · {cityName}
            </div>
          </div>
        </div>
        <div style={{ height:400, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:12 }}>
          {messages.map((m,i) => (
            <div key={i} style={{
              maxWidth:"82%", padding:"10px 14px", fontSize:13, lineHeight:1.65,
              alignSelf:m.role==="user"?"flex-end":"flex-start",
              background:m.role==="user"?"var(--primary)":"var(--surface2)",
              color:m.role==="user"?"#fff":"var(--text)",
              border:m.role==="bot"?"1px solid var(--border2)":"none",
              borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",
            }} dangerouslySetInnerHTML={{ __html:fmt(m.text) }} />
          ))}
          {loading && <div style={{ alignSelf:"flex-start", background:"var(--surface2)", border:"1px solid var(--border2)", padding:"10px 14px", borderRadius:"12px 12px 12px 2px", fontSize:13, color:"var(--text3)" }}>Thinking...</div>}
          <div ref={endRef} />
        </div>
        <div style={{ padding:"8px 16px", display:"flex", flexWrap:"wrap", gap:6, borderTop:"1px solid var(--border)" }}>
          {QUICK.map(q => <button key={q} onClick={() => setInput(q)} style={{ padding:"5px 10px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:6, color:"var(--text2)", fontSize:11, cursor:"pointer", fontFamily:"Syne, sans-serif" }}>{q}</button>)}
        </div>
        <div style={{ display:"flex", gap:10, padding:16, borderTop:"1px solid var(--border)" }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Ask about air quality, health, or forecasts..."
            style={{ flex:1, background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:13, fontFamily:"Syne, sans-serif", outline:"none" }} />
          <button onClick={send} disabled={loading} style={{ padding:"10px 20px", background:"var(--primary)", border:"none", borderRadius:8, color:"#fff", fontSize:13, cursor:"pointer", fontFamily:"Syne, sans-serif", fontWeight:600, opacity:loading?0.7:1 }}>Send</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   ADMIN PAGE
════════════════════════════════════════════════ */
export function Admin({ readings, alerts, city, onCityChange }) {
  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text)" }}>Admin Panel</h1>
        <p style={{ fontSize:13, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", marginTop:2 }}>System management &amp; role-based access</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[[Object.keys(CITIES).length,"Cities Monitored"],[readings.length,"Total Readings"],[alerts.filter(a=>a.level==="critical").length,"Critical Alerts"],["99.7%","Uptime"]].map(([v,l]) => (
          <div key={l} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:14, textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, color:"var(--primary)", fontFamily:"JetBrains Mono, monospace" }}>{v}</div>
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:6 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:12 }}>USER ROLES</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr>{["USER","ROLE","ACCESS"].map(h=><th key={h} style={{ padding:"6px 10px", textAlign:"left", color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", fontSize:10, borderBottom:"1px solid var(--border)", fontWeight:500 }}>{h}</th>)}</tr></thead>
            <tbody>
              {[["admin@govt.in","GOVERNMENT","rgba(139,92,246,0.15)","#8B5CF6","Full"],
                ["analyst@cpcb.in","ANALYST","rgba(16,185,129,0.15)","#10B981","Read + Export"],
                ["user@public.com","PUBLIC","rgba(59,130,246,0.15)","#3B82F6","Read-only"],
              ].map(([email,role,bg,col,access])=>(
                <tr key={email} style={{ borderBottom:"1px solid var(--border)" }}>
                  <td style={{ padding:"8px 10px", color:"var(--text)", fontSize:11 }}>{email}</td>
                  <td style={{ padding:"8px 10px" }}><span style={{ background:bg, color:col, padding:"2px 7px", borderRadius:3, fontSize:10, fontFamily:"JetBrains Mono, monospace" }}>{role}</span></td>
                  <td style={{ padding:"8px 10px", color:"var(--primary)", fontSize:11 }}>{access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:16 }}>SYSTEM STATUS</div>
          {[["FastAPI Backend","RUNNING"],["WebSocket","ACTIVE"],["LSTM Model","LOADED"],["MongoDB","CONNECTED"],["AI Agent","READY"]].map(([s,v])=>(
            <div key={s} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontSize:13, color:"var(--text2)" }}>{s}</span>
              <span style={{ fontSize:12, color:"var(--primary)", fontFamily:"JetBrains Mono, monospace" }}>● {v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-city table */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:12 }}>MULTI-CITY STATUS — click row to switch</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr>{["CITY","PM2.5","AQI","STATUS","UPDATED"].map(h=><th key={h} style={{ padding:"6px 12px", textAlign:"left", color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", fontSize:10, borderBottom:"1px solid var(--border)", fontWeight:500 }}>{h}</th>)}</tr></thead>
            <tbody>
              {Object.entries(CITIES).map(([key,c])=>{
                const r = simulateReading(key);
                const s = classifyAQI(r.aqi);
                return (
                  <tr key={key} onClick={()=>onCityChange(key)} style={{ borderBottom:"1px solid var(--border)", cursor:"pointer" }}>
                    <td style={{ padding:"8px 12px", color:"var(--text)", fontWeight:500 }}>{c.name}</td>
                    <td style={{ padding:"8px 12px", color:r.pm25>35.5?"#EF4444":"var(--text2)" }}>{r.pm25}</td>
                    <td style={{ padding:"8px 12px", color:"var(--text2)", fontWeight:600 }}>{r.aqi}</td>
                    <td style={{ padding:"8px 12px" }}><span style={{ background:s.bg, color:s.color, padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:600 }}>● {s.label}</span></td>
                    <td style={{ padding:"8px 12px", color:"var(--text3)", fontFamily:"JetBrains Mono, monospace", fontSize:11 }}>{new Date().toLocaleTimeString()}</td>
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
