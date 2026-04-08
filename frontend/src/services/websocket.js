/**
 * EcoSentinel WebSocket Client
 * Maintains a persistent connection to the FastAPI /ws/{city} endpoint
 * and calls registered callbacks on each message.
 */

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

class WSClient {
  constructor() {
    this._ws        = null;
    this._city      = "delhi";
    this._callbacks = new Set();
    this._retries   = 0;
    this._maxRetries = 10;
    this._paused    = false;
  }

  /** Connect (or reconnect) to a city's WebSocket stream. */
  connect(city = "delhi") {
    this._city = city;
    this._retries = 0;
    this._open();
  }

  /** Subscribe to incoming messages. Returns an unsubscribe function. */
  subscribe(callback) {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  pause()  { this._paused = true;  }
  resume() { this._paused = false; }

  disconnect() {
    if (this._ws) {
      this._ws.onclose = null;   // Prevent auto-reconnect
      this._ws.close();
      this._ws = null;
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────
  _open() {
    this.disconnect();
    const url = `${WS_BASE}/ws/${this._city}`;
    console.log(`[WS] Connecting → ${url}`);
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      console.log("[WS] Connected");
      this._retries = 0;
    };

    this._ws.onmessage = (event) => {
      if (this._paused) return;
      try {
        const payload = JSON.parse(event.data);
        this._callbacks.forEach((cb) => cb(payload));
      } catch (e) {
        console.warn("[WS] Parse error:", e);
      }
    };

    this._ws.onerror = (err) => {
      console.warn("[WS] Error:", err);
    };

    this._ws.onclose = () => {
      if (this._retries < this._maxRetries) {
        const delay = Math.min(1000 * 2 ** this._retries, 30_000);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this._retries + 1})`);
        this._retries++;
        setTimeout(() => this._open(), delay);
      } else {
        console.error("[WS] Max retries reached — giving up");
      }
    };
  }
}

// Singleton instance shared across the app
const wsClient = new WSClient();
export default wsClient;
