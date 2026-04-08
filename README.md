# 🌿 EcoSentinel AI — Environmental Pollution Monitoring

> Real-time air quality monitoring · LSTM predictions · AI chatbot · CSV data reader


## 📋 Manual Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev                    # → http://localhost:3000
```

---

## 📂 CSV Data Reader (Dashboard)

The Dashboard has a built-in CSV reader at the bottom of the page.

**Steps:**
1. Open **Dashboard** tab
2. Scroll down to **CSV Data Reader**
3. Drag & drop your `.csv` file — or click to browse
4. Three charts and a sortable/filterable table appear instantly

**Supported columns:**

| Column | Notes |
|---|---|
| `timestamp` | `2024-01-15 08:00:00` |
| `city` | e.g. `delhi` |
| `lat`, `lon` | Coordinates (optional) |
| `pm25`, `pm10` | µg/m³ |
| `co2` | ppm |
| `no2`, `so2`, `voc` | ppb |
| `aqi` | Auto-calculated if missing |
| `status` | Auto-classified if missing |

Use `data/sample_pollution.csv` to try it immediately.

---

## 🛣️ API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/data/?city=delhi` | Fetch readings |
| `POST` | `/upload-csv` | Upload CSV file |
| `GET` | `/predict/?city=delhi` | 48h LSTM forecast |
| `GET` | `/alerts/` | Active alerts |
| `WS` | `/ws/{city}` | Live data stream |
| `GET` | `/docs` | Swagger UI |

---

## 🗂️ Project Structure

```
ecosentinel/
├── start.sh                   ← Run this first
├── .env.example               ← Copy to .env
├── data/sample_pollution.csv  ← Test dataset
├── backend/
│   ├── app/main.py            FastAPI + WebSocket + /upload-csv
│   ├── app/routes/            data · alerts · predict
│   ├── app/services/          analyzer · alerter · ai_agent
│   └── requirements.txt
├── frontend/src/
│   ├── App.jsx
│   ├── pages/Dashboard.jsx    ← CSV reader lives here
│   ├── pages/RealTime.jsx
│   ├── pages/Heatmap.jsx
│   ├── pages/Predictions.jsx
│   ├── pages/OtherPages.jsx   Alerts · Chatbot · Admin · Recommendations
│   └── services/api.js        REST + CSV upload client
└── ml/train_lstm.py           Optional LSTM training
```

---

## Environment Variables

Copy `.env.example` → `.env`:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | AI chatbot (built-in fallback if omitted) |
| `MONGODB_URL` | No | Persistence (in-memory if omitted) |
| `VITE_API_URL` | No | Defaults to `http://localhost:8000` |

---

## Train LSTM Model (optional)

```bash
cd ml
pip install tensorflow scikit-learn pandas numpy joblib
python train_lstm.py --csv ../data/sample_pollution.csv
```

Model auto-loads from `ml/model/lstm_pollution.h5`. Falls back to statistical simulation if not found.
