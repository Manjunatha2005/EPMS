/* EPMS – Shared JS utilities */

// Live clock
function updateClock() {
  const el = document.getElementById('live-clock');
  if (el) el.textContent = new Date().toLocaleString();
}
setInterval(updateClock, 1000);
updateClock();

// Alert badge in navbar
async function refreshAlertBadge() {
  try {
    const res = await fetch('/api/alerts?active=true');
    const data = await res.json();
    const badge = document.getElementById('alert-badge');
    if (badge) {
      if (data.length > 0) {
        badge.textContent = data.length;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
      // Show critical banner if any critical alert
      const critical = data.find(a => a.severity === 'critical');
      const banner = document.getElementById('critical-banner');
      const bannerMsg = document.getElementById('critical-banner-msg');
      if (banner && critical) {
        bannerMsg.textContent = critical.message;
        banner.classList.remove('d-none');
      }
    }
  } catch (e) { /* silently ignore */ }
}
setInterval(refreshAlertBadge, 30000);
refreshAlertBadge();

// Colour helpers
function aqiColour(aqi) {
  if (aqi <= 50)  return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  if (aqi <= 300) return '#8f3f97';
  return '#7e0023';
}

function aqiLabel(aqi) {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function severityClass(s) {
  return { critical: 'danger', high: 'danger', moderate: 'warning', low: 'success' }[s] || 'secondary';
}
