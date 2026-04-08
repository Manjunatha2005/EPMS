/* EPMS – Dashboard page JS */

const POLLUTANTS = ['pm25', 'pm10', 'no2', 'co', 'o3', 'so2'];
const POLLUTANT_LABELS = ['PM2.5', 'PM10', 'NO₂', 'CO', 'O₃', 'SO₂'];
// Max scale for progress bars (µg/m³ / mg/m³)
const POLL_MAX = { pm25: 150, pm10: 300, no2: 400, co: 15, o3: 150, so2: 300 };

let trendChart = null;
let pollutantChart = null;
let sensorData = [];

// ---------- KPI summary ----------
async function loadSummary() {
  const res = await fetch('/api/stats/summary');
  const d = await res.json();
  document.getElementById('kpi-avg-aqi').textContent = d.avg_aqi;
  document.getElementById('kpi-avg-aqi').style.color = d.colour;
  const catEl = document.getElementById('kpi-category');
  catEl.textContent = d.category;
  catEl.style.background = d.colour;
  catEl.style.color = d.avg_aqi <= 100 ? '#333' : '#fff';
  document.getElementById('kpi-alerts').textContent = d.active_alerts;
  document.getElementById('kpi-sensors').textContent = d.total_sensors;
  document.getElementById('kpi-max-aqi').textContent = d.max_aqi;
  document.getElementById('kpi-max-aqi').style.color = aqiColour(d.max_aqi);
}

// ---------- Sensor grid ----------
async function loadSensors() {
  const res = await fetch('/api/sensors');
  sensorData = await res.json();
  const grid = document.getElementById('sensor-grid');
  grid.innerHTML = '';

  const sel = document.getElementById('sensor-select');
  const prevVal = sel.value;
  sel.innerHTML = '';

  sensorData.forEach(s => {
    const latest = s.latest || {};
    const aqi = latest.aqi || 0;
    const colour = aqiColour(aqi);
    const label = aqiLabel(aqi);

    // Sensor card
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6';
    col.innerHTML = `
      <div class="card sensor-card p-2" style="border-left-color:${colour}">
        <div class="d-flex align-items-center gap-3">
          <div class="sensor-aqi-badge" style="background:${colour}">
            ${Math.round(aqi)}
          </div>
          <div class="flex-grow-1 overflow-hidden">
            <div class="fw-semibold text-truncate">${s.name}</div>
            <div class="text-muted small text-truncate"><i class="bi bi-geo-alt-fill me-1"></i>${s.location}</div>
            <span class="badge mt-1" style="background:${colour};color:${aqi<=100?'#333':'#fff'}">${label}</span>
          </div>
        </div>
        <div class="mt-2">
          ${POLLUTANTS.map((p, i) => {
            const val = latest[p] != null ? latest[p] : 0;
            const pct = Math.min(100, (val / POLL_MAX[p]) * 100);
            const barColour = pct > 75 ? '#dc3545' : pct > 50 ? '#fd7e14' : '#198754';
            return `
              <div class="pollutant-row">
                <span style="width:38px">${POLLUTANT_LABELS[i]}</span>
                <div class="pollutant-bar-bg">
                  <div class="pollutant-bar-fill" style="width:${pct}%;background:${barColour}"></div>
                </div>
                <span style="width:50px;text-align:right">${val.toFixed(1)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    grid.appendChild(col);

    // Sensor selector
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });

  // Restore previous selection or default to first
  if (prevVal && [...sel.options].some(o => o.value === prevVal)) {
    sel.value = prevVal;
  }
  loadPollutantChart();
}

// ---------- 24h Trend ----------
async function loadTrend() {
  const res = await fetch('/api/analytics/trends?hours=24');
  const data = await res.json();
  const labels = data.map(d => {
    const t = new Date(d.time.replace('T', ' ') + ':00');
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const values = data.map(d => d.avg_aqi);
  const colours = values.map(v => aqiColour(v));

  if (trendChart) trendChart.destroy();
  const ctx = document.getElementById('trendChart').getContext('2d');
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Avg AQI',
        data: values,
        fill: true,
        tension: 0.4,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.1)',
        pointBackgroundColor: colours,
        pointRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, suggestedMax: 200 }
      },
      responsive: true,
      maintainAspectRatio: true,
    }
  });
}

// ---------- Pollutant bar chart for selected sensor ----------
async function loadPollutantChart() {
  const sel = document.getElementById('sensor-select');
  const sensorId = sel.value;
  if (!sensorId) return;

  const res = await fetch(`/api/sensors/${sensorId}/readings?hours=1`);
  const readings = await res.json();
  if (!readings.length) return;
  const latest = readings[readings.length - 1];

  const values = POLLUTANTS.map(p => latest[p] || 0);

  if (pollutantChart) pollutantChart.destroy();
  const ctx = document.getElementById('pollutantChart').getContext('2d');
  pollutantChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: POLLUTANT_LABELS,
      datasets: [{
        label: 'Concentration (µg/m³)',
        data: values,
        backgroundColor: values.map((v, i) => {
          const pct = v / POLL_MAX[POLLUTANTS[i]];
          if (pct > 0.75) return '#dc3545';
          if (pct > 0.5)  return '#fd7e14';
          if (pct > 0.25) return '#ffc107';
          return '#198754';
        }),
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
      responsive: true,
      maintainAspectRatio: true,
    }
  });
}

// ---------- Init & polling ----------
async function refresh() {
  await Promise.all([loadSummary(), loadSensors(), loadTrend()]);
}

document.getElementById('sensor-select').addEventListener('change', loadPollutantChart);
refresh();
setInterval(refresh, 5 * 60 * 1000);  // refresh every 5 min
