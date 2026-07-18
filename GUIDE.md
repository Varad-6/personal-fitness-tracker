# FitHabit App Setup & Operations Guide

Welcome to your personal FitHabit fitness tracker! This guide describes how to run, configure, and maintain your application.

---

## 🏗️ Architecture Design

The application is structured into two main packages:
- **`frontend/`**: React Single Page Application (SPA) styled with **Tailwind CSS v4** (running on Vite).
- **`backend/`**: Python **FastAPI** REST server backed by an **SQLite** database (`fit_habit.db`).

---

## 🔌 Running the App

Run the frontend and backend servers concurrently using separate terminal windows:

### 1. Start backend (FastAPI)
Navigate to the `backend/` directory, set up your Python environment, and start the server:
```bash
cd personal-fitness-tracker/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```
*The API server will listen on [http://localhost:5001](http://localhost:5001).*

### 2. Start frontend (Vite)
Navigate to the `frontend/` directory, install packages, and boot the web client:
```bash
cd personal-fitness-tracker/frontend
npm install
npm run dev
```
*The client dev server will listen on [http://localhost:5173](http://localhost:5173).*

---

## 🔐 Authentication Modes

We support two direct options to log in to the journal:

### Option A: Guest Bypass Login (Recommended for offline test)
You can enter a mock email (e.g. `guest@fithabit.com`) and name. The backend automatically registers a local guest profile in SQLite and generates a JWT session token. All records (profile targets, calendar logs, and weekly checkins) are persisted relative to this user ID.

### Option B: Sign In with Google
Direct Google Sign-In is supported on the login page via Google Identity Services. To use this in production:
1. Create a project in the [Google Cloud Developer Console](https://console.cloud.google.com).
2. Set up your **OAuth Consent Screen** and create an **OAuth Client ID** for a Web Application.
3. Add `http://localhost:5173` to your **Authorized JavaScript Origins**.
4. Copy your generated Client ID and paste it into the `client_id` parameter inside [Login.jsx](file:///Users/varad/personal-fitness-tracker/frontend/src/components/Login.jsx#L16).

---

## 🎨 Theme Modes (Light & Dark)

We override Tailwind v4's default system dark variant with a class-based selector `@custom-variant dark (&:where(.dark, .dark *));`. 
- **Light Mode (Default):** Soft off-white backgrounds with dark gray typography.
- **Dark Mode:** Deep charcoal-black backgrounds with white borders and high-contrast texts.
- **Native Select Inputs:** Overlaid dropdown lists are styled in CSS to remain highly legible on all operating systems.

---

## 💾 Database Schema

The SQLite tables inside `fit_habit.db` automatically track users by `user_id`:
- **`users`**: Logs authenticated user emails, names, Google IDs, and profile picture URLs.
- **`profile`**: Stores demographic info, start dates, calculated Mifflin-St Jeor TDEE metrics, target protein/macros, and intermittent fasting schedules.
- **`daily_logs`**: Persists daily workout completions, protein items, water intake, sleep patterns, cigarette counts, and journal notes.
- **`weekly_checkins`**: Tracks Sunday progress weights, chests, waists, and base64 progress picture uploads.
- **`workout_plan`**: Holds your dynamically generated, customizable sets & reps workout templates.
