# RailSense AI — Deployment Guide

## Architecture

```
[Vercel]          [Render.com]
Frontend (React)  Backend (FastAPI + SQLite)
     |                   |
     └── VITE_API_BASE_URL → https://rail-sense-api.onrender.com/api
```

---

## 1. Deploy Backend → Render.com (free)

1. Go to **https://render.com** → New → Web Service
2. Connect your GitHub repo: `saswatdutta1310/Rail_Sense`
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt && python init_db.py`
   - **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add these **Environment Variables** in Render dashboard:

| Key | Value |
|---|---|
| `SECRET_KEY` | (click "Generate" for a random value) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./railsense.db` |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGIN` | `https://rail-sense.vercel.app` (add after Vercel deploy) |
| `OPENWEATHER_API_KEY` | your key (optional) |
| `GEMINI_API_KEY` | your key (optional) |

5. Click **Deploy**. Once live, copy your URL e.g. `https://rail-sense-api.onrender.com`

> **Note**: The free Render plan spins down after 15 min inactivity. First request takes ~30s.

---

## 2. Deploy Frontend → Vercel

1. Go to **https://vercel.com** → New Project
2. Import: `saswatdutta1310/Rail_Sense`
3. Set **Root Directory** to `frontend`
4. Framework: **Vite** (auto-detected)
5. Add **Environment Variable**:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://rail-sense-api.onrender.com/api` |

6. Click **Deploy**

Once deployed, go back to Render and set:
```
CORS_ORIGIN = https://your-project.vercel.app
```

---

## 3. Local Development

```bash
# Terminal 1 — Backend
cd backend
python init_db.py          # seed database (first time only)
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend  
cd frontend
npm install
npm run dev               # opens http://localhost:5173
```

Login: `admin@railsense.ai` / `password123`

---

## 4. Demo Credentials

| Email | Password | Role |
|---|---|---|
| admin@railsense.ai | password123 | Super Admin |
| operator@railsense.ai | password123 | Operator |
| engineer@railsense.ai | password123 | Engineer |
| user@railsense.ai | password123 | Public |
