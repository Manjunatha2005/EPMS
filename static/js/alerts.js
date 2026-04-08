/* EPMS – Alerts page JS */

async function loadAlerts() {
  const activeOnly = document.getElementById('active-only-toggle').checked;
  const container = document.getElementById('alerts-container');
  container.innerHTML = `
    <div class="text-center text-muted py-4">
      <div class="spinner-border" role="status"></div>
      <p class="mt-2">Loading alerts…</p>
    </div>`;

  const res = await fetch(`/api/alerts?active=${activeOnly}`);
  const alerts = await res.json();

  if (!alerts.length) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-check-circle-fill text-success fs-1"></i>
        <p class="mt-2">No ${activeOnly ? 'active ' : ''}alerts. Air quality is within acceptable limits.</p>
      </div>`;
    return;
  }

  container.innerHTML = alerts.map(a => {
    const ts = new Date(a.created_at).toLocaleString();
    const resolvedTs = a.resolved_at ? new Date(a.resolved_at).toLocaleString() : null;
    const typeBadge = a.alert_type === 'predictive'
      ? '<span class="badge bg-secondary me-1">⚡ Predictive</span>'
      : '<span class="badge bg-primary me-1">📡 Real-Time</span>';
    const severityBadge = `<span class="badge severity-${a.severity} me-1">${a.severity.toUpperCase()}</span>`;
    const resolvedNote = resolvedTs
      ? `<div class="text-muted small mt-1"><i class="bi bi-check2-circle me-1 text-success"></i>Resolved: ${resolvedTs}</div>`
      : '';
    const resolveBtn = a.is_active
      ? `<button class="btn btn-sm btn-outline-success ms-auto" onclick="resolveAlert(${a.id})">
           <i class="bi bi-check2"></i> Mark Resolved
         </button>`
      : '';

    return `
      <div class="card alert-card ${a.severity} ${a.is_active ? '' : 'resolved'}" id="alert-${a.id}">
        <div class="card-body py-2 px-3">
          <div class="d-flex flex-wrap align-items-start gap-1">
            ${severityBadge}
            ${typeBadge}
            <span class="badge bg-light text-dark border me-1">
              <i class="bi bi-geo-alt me-1"></i>${a.location || 'Unknown'}
            </span>
            <span class="text-muted small ms-auto">${ts}</span>
          </div>
          <p class="mb-1 mt-2">${a.message}</p>
          <div class="d-flex flex-wrap gap-2 align-items-center small text-muted">
            <span><b>Pollutant:</b> ${(a.pollutant || '').toUpperCase()}</span>
            <span><b>Current:</b> ${a.current_value != null ? a.current_value.toFixed(1) : '—'} µg/m³</span>
            <span><b>Threshold:</b> ${a.threshold_value != null ? a.threshold_value : '—'} µg/m³</span>
            ${a.predicted_value != null
              ? `<span><b>Forecast:</b> ${a.predicted_value.toFixed(1)} µg/m³</span>`
              : ''}
            ${resolveBtn}
          </div>
          ${resolvedNote}
        </div>
      </div>`;
  }).join('');
}

async function resolveAlert(id) {
  await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
  loadAlerts();
}

document.getElementById('active-only-toggle').addEventListener('change', loadAlerts);
loadAlerts();
setInterval(loadAlerts, 30000);
