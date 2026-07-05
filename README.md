# SENTINEL — GPU Cluster War Room

> AI-powered cluster intelligence dashboard. Real-time monitoring, anomaly detection, job attribution, and cost optimization — explained in plain English by Gemini AI.

---

## Quick Start (2 terminals)

### Terminal 1 — Backend
```bash
cd backend
pip install fastapi uvicorn google-genai
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## Gemini AI Setup (optional but impressive)
Create a `.env` file in `/backend`:
```
GEMINI_API_KEY=your_key_here
```
Get a free key at: https://aistudio.google.com/app/apikey

Without a key, SENTINEL uses built-in expert explanations (still looks great in demo).

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /nodes | All node metrics + summary |
| GET | /jobs | Running jobs + cost |
| GET | /alerts | Active alerts |
| POST | /alerts/{id}/resolve | Resolve an alert |
| POST | /alerts/{id}/explain | Get Gemini AI explanation |
| GET | /cost | Waste report per team |
| POST | /schedule | Submit job, get optimal node |

---

## Architecture

```
Python Simulator (6 nodes, 5 teams, 15 jobs)
        ↓ ticks every 5 seconds
FastAPI Backend (port 8000)
        ↓ REST API + Gemini AI
React Frontend (port 5173)
        ↓ polls every 5 seconds
4 Pages: War Room · Jobs · Alerts · Cost
```

---

## Project Structure

```
sentinel/
├── backend/
│   ├── main.py           FastAPI app + 7 endpoints
│   ├── simulator.py      Cluster data generator
│   └── gemini_service.py Gemini AI integration
└── frontend/
    └── src/
        ├── App.jsx        Nav + routing
        ├── api.js         All API calls
        └── pages/
            ├── WarRoom.jsx      Node heatmap
            ├── JobFeed.jsx      Jobs + scheduler
            ├── AlertCenter.jsx  Alerts + AI explain
            └── CostReport.jsx   Waste analysis
```
