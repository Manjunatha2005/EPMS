#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  EcoSentinel — Local Startup Script
#  Starts the FastAPI backend AND the React frontend in one go.
#
#  Usage:
#    chmod +x start.sh
#    ./start.sh
#
#  Requirements: Python 3.11+, Node.js 20+, MongoDB (optional)
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║      🌿  EcoSentinel AI  — Starting Up       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Copy .env ──────────────────────────────────────────────────────────────
if [ ! -f "$ROOT/.env" ]; then
  echo "📋 Copying .env.example → .env"
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "   ✏️  Edit .env to add your ANTHROPIC_API_KEY (optional)"
fi

# ── 2. Backend virtualenv + deps ──────────────────────────────────────────────
echo "🐍 Setting up Python backend..."
cd "$BACKEND"

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "   Virtual environment created"
fi

source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "   ✅ Backend dependencies installed"

# ── 3. Start backend in background ───────────────────────────────────────────
echo ""
echo "🚀 Starting FastAPI backend on http://localhost:8000 ..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
sleep 2

# ── 4. Frontend deps ──────────────────────────────────────────────────────────
echo ""
echo "⚛️  Setting up React frontend..."
cd "$FRONTEND"

if [ ! -d "node_modules" ]; then
  npm install --silent
  echo "   ✅ Frontend dependencies installed"
fi

# ── 5. Start frontend ─────────────────────────────────────────────────────────
echo ""
echo "🌐 Starting React dev server on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  EcoSentinel is running!                 ║"
echo "║                                              ║"
echo "║  Dashboard   →  http://localhost:3000        ║"
echo "║  API Docs    →  http://localhost:8000/docs   ║"
echo "║  API Health  →  http://localhost:8000/health ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping servers..."
  kill $BACKEND_PID  2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo "Stopped. Goodbye!"
}
trap cleanup INT TERM

wait
