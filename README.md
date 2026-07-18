# FitHabit 🏋️‍♂️🥗🚭

FitHabit is a complete, polished, production-quality **personal fitness, diet, and habit tracker** web application. It features a modern, off-white Light Mode interface (with responsive Dark Mode), backed by a local **Python FastAPI** backend and a file-based **SQLite** database.

---

## ✨ Features

- **Daily Journal Calendar Grid**: Track daily workout completions, water intake, sleep quality, notes, and habits per day.
- **Dynamic Workout Planner & Progressive Scaling**: Generates progressive overload set/rep phases dynamically matched to your custom plan duration (e.g., 2, 3, or 6 months).
- **Mifflin-St Jeor Biometrics**: Computes BMR, TDEE, target water intake, and protein targets (based on athletic multiplier calculations).
- **Intermittent Fasting Schedule**: Adjusts daily calorie/protein metrics downwards by 25% on fasting days with rest guidelines.
- **Transformation Logs**: Sunday check-in portal supporting chest/waist measurements and base64 progress picture uploads.
- **Custom Charts (SVG)**: Visualizes weight trends, habits completion streaks, and cigarette reduction logs.
- **Built-in Audio Rest Timer**: Web Audio API synthesized rest sound chime alerts and vibration notifications.
- **Double Auth Support**: Authenticate using native **Google OAuth2 Sign-in** or bypass securely as a local **Guest**.

---

## 🏗️ Repository Structure

```
├── backend/            # FastAPI Python backend (SQLite connections & JWT logic)
├── frontend/           # Vite + React + Tailwind CSS v4 frontend web app
├── GUIDE.md            # Advanced setup instructions
└── README.md           # Project summary
```

---

## ⚡ Getting Started

### 1. Launch FastAPI Server
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

### 2. Launch Vite Client
```bash
cd ../frontend
npm install
npm run dev
```

Open your browser to [http://localhost:5173/](http://localhost:5173/) and enjoy your new habit companion!
