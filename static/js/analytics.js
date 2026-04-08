/* EPMS – Analytics page JS */

const POLLUTANTS = ['pm25', 'pm10', 'no2', 'co', 'o3', 'so2'];
const POLLUTANT_LABELS = ['PM2.5', 'PM10', 'NO₂', 'CO', 'O₃', 'SO₂'];
const PIE_COLOURS = ['#0d6efd','#6610f2','#fd7e14','#20c997','#0dcaf0','#ffc107'];

let compareChart = null;
let pieChart = null;
let pollutantTrendChart = null;

// ---------- Hotspots ----------
async function loadHotspots() {
  const res = await fetch('/api/analytics/hotspots');
  const data = await res.json();
  const tbody = document.getElementById('hotspot-body');
  tbody.innerHTML = data.map((s, i) => {
    const col = aqiColour(s.avg_aqi_24h);
    const textCol = s.avg_aqi_24h <= 100 ? '#333' : '#fff';
    const rankBg = i === 0 ? '#dc3545' : i === 1 ? '#fd7e14' : '#6c757d';
    return `
      <tr>
        <td><span class="rank-badge text-white" style="background:${rankBg}">${i+1}</span></td>
        <td>
          <div class="fw-semibold">${s.name}</div>
          <div class="text-muted small">${s.location}</div>
        </td>
        <td>
          <span class="badge px-2 py-1 fs-6" style="background:${col};color:${textCol}">
            ${s.avg_aqi_24h}
          </span>
        </td>
        <td><span class="text-muted small">${aqiLabel(s.avg_aqi_24h)}</span></td>
      </tr>`;
  }).join('');
}

// ---------- Trend comparison ----------
async function loadCompareChart() {
  const hours = document.getElementById('trend-hours').value;
  const [trendRes, sensorsRes] = await Promise.all([
    fetch(`/api/analytics/trends?hours=${hours}`),
    fetch('/api/sensors'),
  ]);
  const trend = await trendRes.json();
  const sensors = await sensorsRes.json();

  // Populate pie sensor selector
  const pieSel = document.getElementById('pie-sensor');
  const prevVal = pieSel.value;
  pieSel.innerHTML = '';
  sensors.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    pieSel.appendChild(opt);
  });
  if (prevVal && [...pieSel.options].some(o => o.value === prevVal)) {
    pieSel.value = prevVal;
  }

  const labels = trend.map(d => {
    const t = new Date(d.time.replace('T', ' ') + ':00');
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const cityAvg = trend.map(d => d.avg_aqi);

  if (compareChart) compareChart.destroy();
  const ctx = document.getElementById('compareChart').getContext('2d');
  compareChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'City Avg AQI',
        data: cityAvg,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      }]
    },
    options: {
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true, suggestedMax: 200 } },
      responsive: true,
      maintainAspectRatio: true,
    }
  });

  loadPieChart();
}

// ---------- Pie + Pollutant trend for selected sensor ----------
async function loadPieChart() {
  const sensorId = document.getElementById('pie-sensor').value;
  if (!sensorId) return;

  const hours = document.getElementById('trend-hours').value;
  const res = await fetch(`/api/sensors/${sensorId}/readings?hours=${hours}`);
  const readings = await res.json();
  if (!readings.length) return;

  const latest = readings[readings.length - 1];
  const pieValues = POLLUTANTS.map(p => Math.max(0, latest[p] || 0));

  if (pieChart) pieChart.destroy();
  const ctx1 = document.getElementById('pieChart').getContext('2d');
  pieChart = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: POLLUTANT_LABELS,
      datasets: [{
        data: pieValues,
        backgroundColor: PIE_COLOURS,
        borderWidth: 2,
      }]
    },
    options: {
      plugins: { legend: { position: 'right' } },
      responsive: true,
      maintainAspectRatio: true,
    }
  });

  // Trend for each pollutant over time
  const timeLabels = readings.map(r => {
    const t = new Date(r.timestamp.replace('T', ' '));
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  if (pollutantTrendChart) pollutantTrendChart.destroy();
  const ctx2 = document.getElementById('pollutantTrendChart').getContext('2d');
  pollutantTrendChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: POLLUTANTS.slice(0, 4).map((p, i) => ({
        label: POLLUTANT_LABELS[i],
        data: readings.map(r => r[p] || 0),
        borderColor: PIE_COLOURS[i],
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      }))
    },
    options: {
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } },
      responsive: true,
      maintainAspectRatio: true,
    }
  });
}

// ---------- Init ----------
document.getElementById('trend-hours').addEventListener('change', loadCompareChart);
document.getElementById('pie-sensor').addEventListener('change', loadPieChart);

Promise.all([loadHotspots(), loadCompareChart()]);
setInterval(() => Promise.all([loadHotspots(), loadCompareChart()]), 5 * 60 * 1000);
