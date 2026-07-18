import os
import json
import requests
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt, JWTError
import psycopg2
from psycopg2.extras import RealDictCursor
import google.generativeai as genai

app = FastAPI(title="FitHabit API", version="2.0.0")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Secret & Configurations
SECRET_KEY = "fithabit_local_super_secret_key_change_me_in_prod"
ALGORITHM = "HS256"

# Load environment variables from local .env if present
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    with open(dotenv_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

# Setup Gemini API client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Supabase PostgreSQL Connection URI
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.gbtovqfgxlmtvvqjlxlw:Varad%4073873@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require"
)

def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

# Helper to run migrations / init tables in Supabase PostgreSQL
def init_db():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE,
            name TEXT,
            picture TEXT,
            google_id TEXT
        )
    """)

    # 2. Profile Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profile (
            user_id INTEGER PRIMARY KEY,
            name TEXT,
            age INTEGER,
            gender TEXT,
            height_cm REAL,
            starting_weight REAL,
            activity_level TEXT,
            plan_duration_months INTEGER,
            goal_weight REAL,
            target_protein INTEGER,
            target_calories INTEGER,
            target_cigarettes INTEGER,
            start_date TEXT,
            is_onboarded INTEGER DEFAULT 0,
            fasting_days TEXT DEFAULT '[]',
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 3. Daily Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_logs (
            user_id INTEGER,
            date TEXT,
            workout_done INTEGER DEFAULT 0,
            protein_log TEXT DEFAULT '[]',
            calories_quick INTEGER,
            water INTEGER DEFAULT 0,
            cigarettes INTEGER DEFAULT 0,
            sleep REAL,
            notes TEXT,
            exercises_completed TEXT DEFAULT '{}',
            is_fast_day INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, date),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 4. Weekly Check-ins Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weekly_checkins (
            user_id INTEGER,
            date TEXT,
            weight REAL,
            waist REAL,
            chest REAL,
            photo TEXT,
            PRIMARY KEY(user_id, date),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 5. Workout Plan Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workout_plan (
            user_id INTEGER,
            phase TEXT,
            day TEXT,
            focus TEXT,
            exercises TEXT,
            PRIMARY KEY(user_id, phase, day),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 6. Settings Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            user_id INTEGER PRIMARY KEY,
            theme_mode TEXT DEFAULT 'light',
            notifications_enabled INTEGER DEFAULT 0,
            notification_time TEXT DEFAULT '20:00',
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Ensure profile table has the ai_diet_plan column for storing the AI diet plan
    try:
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS ai_diet_plan TEXT;")
    except Exception as e:
        print("Column ai_diet_plan might already exist or failed to add:", e)

    conn.commit()
    conn.close()

# Run database setup
try:
    init_db()
    print("Supabase PostgreSQL tables initialized successfully!")
except Exception as e:
    print("Warning: Failed to auto-initialize database tables:", e)

# --- AUTHENTICATION DEPENDENCY ---
def get_current_user(authorization: Optional[str] = Header(None), db = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token format. Expected: Bearer <token>"
        )
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed")
    
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return dict(user)

# --- PYDANTIC MODEL SCHEMAS ---
class GoogleAuthRequest(BaseModel):
    credential: str

class MockAuthRequest(BaseModel):
    email: str
    name: str

class ProfileUpdate(BaseModel):
    name: str
    age: int
    gender: str
    height_cm: float
    starting_weight: float
    activity_level: str
    plan_duration_months: int
    goal_weight: float
    target_protein: int
    target_calories: int
    target_cigarettes: int
    start_date: str
    fasting_days: List[str]

class SettingsUpdate(BaseModel):
    themeMode: str
    notificationsEnabled: bool
    notificationTime: str

from pydantic import BaseModel, field_validator

class DailyLogUpdate(BaseModel):
    workoutDone: bool
    proteinLog: List[dict]
    caloriesQuick: Optional[int] = None
    water: int
    cigarettes: int
    sleep: Optional[float] = None
    notes: Optional[str] = ""
    exercisesCompleted: dict
    isFastDay: bool

    @field_validator('caloriesQuick', mode='before')
    @classmethod
    def parse_calories(cls, v):
        if v == '':
            return None
        return v

    @field_validator('sleep', mode='before')
    @classmethod
    def parse_sleep(cls, v):
        if v == '':
            return None
        return v

class CheckInSave(BaseModel):
    date: str
    weight: float
    waist: Optional[float] = None
    chest: Optional[float] = None
    photo: Optional[str] = None

class SeedDataRequest(BaseModel):
    dailyLogs: dict
    weeklyCheckIns: List[dict]

class ImportRequest(BaseModel):
    profile: dict
    settings: dict
    dailyLogs: dict
    weeklyCheckIns: List[dict]
    workoutPlan: dict

# --- CORE DB HELPER METHODS ---
def create_jwt_token(user_id: int, email: str) -> str:
    payload = {"user_id": user_id, "email": email}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def check_and_seed_user_settings(user_id: int, db):
    cursor = db.cursor()
    cursor.execute("SELECT user_id FROM settings WHERE user_id = %s", (user_id,))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO settings (user_id, theme_mode, notifications_enabled, notification_time) VALUES (%s, 'light', 0, '20:00')",
            (user_id,)
        )
        db.commit()

def generate_plan_with_gemini(profile: dict, months: int):
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        
        prompt = f"""
You are an expert personal trainer. Generate a highly customized progressive overload workout plan for a user with the following profile:
- Name: {profile.get('name', 'User')}
- Age: {profile.get('age', 25)}
- Gender: {profile.get('gender', 'Male')}
- Current Weight: {profile.get('starting_weight', 75.0)} kg
- Goal Weight: {profile.get('goal_weight', 70.0)} kg
- Activity Level: {profile.get('activity_level', 'Moderate')}
- Plan Duration: {months} months
- Intermittent Fasting Days: {profile.get('fasting_days', [])}

Structure your response as a valid JSON array of objects. Do not include any markdown styling like ```json or any other text wrapper. Return ONLY raw JSON.
The JSON array should contain objects with keys: "phase", "day", "focus", "exercises".
- "phase": Use exactly three progressive phases matching the plan duration. E.g. for a 2-month plan: "Weeks 1-2 (Foundation)", "Weeks 3-6 (Build)", "Weeks 7-8 (Intensity)".
- "day": One object for each day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday) for each phase.
- "focus": A brief description of the workout focus for that day (e.g. "Chest & Triceps", "Rest & Recovery").
- "exercises": A JSON array of exercise objects. Each exercise must have:
  - "id": A unique string ID (e.g., "ai_foundation_monday_ex1").
  - "name": Name of the exercise.
  - "sets": Integer number of sets.
  - "reps": String range of reps (e.g., "12", "8-10").
  - "muscleGroup": The primary muscle targeted.
Note: For Sunday (or rest days), set "focus" to "Rest & Recovery (Milestone Check-in)" and "exercises" to an empty list [].

Example structure:
[
  {{
    "phase": "Weeks 1-2 (Foundation)",
    "day": "Monday",
    "focus": "Chest & Triceps",
    "exercises": [
      {{"id": "ai_foundation_monday_ex1", "name": "Flat Bench Press", "sets": 3, "reps": "12", "muscleGroup": "Chest"}},
      {{"id": "ai_foundation_monday_ex2", "name": "Tricep Pushdown", "sets": 3, "reps": "12", "muscleGroup": "Triceps"}}
    ]
  }}
]
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        
        plan_data = json.loads(text)
        return plan_data
    except Exception as e:
        print("Gemini generation failed, falling back to local seeder:", e)
        return None

# Dynamic Workout split seeder (PostgreSQL compatible)
async def seed_workout_plan_for_user(user_id: int, months: int, db):
    cursor = db.cursor()
    
    # Try to load profile to pass context to Gemini
    cursor.execute("SELECT * FROM profile WHERE user_id = %s", (user_id,))
    prof_row = cursor.fetchone()
    ai_plan = None
    if prof_row:
        prof_dict = dict(prof_row)
        try:
            prof_dict["fasting_days"] = json.loads(prof_dict["fasting_days"] or "[]")
        except:
            prof_dict["fasting_days"] = []
        
        ai_plan = generate_plan_with_gemini(prof_dict, months)
        
    if ai_plan:
        try:
            cursor.execute("DELETE FROM workout_plan WHERE user_id = %s", (user_id,))
            for item in ai_plan:
                phase = item.get("phase")
                day = item.get("day")
                focus = item.get("focus", "Workout")
                exercises = item.get("exercises", [])
                cursor.execute("""
                    INSERT INTO workout_plan (user_id, phase, day, focus, exercises)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, phase, day)
                    DO UPDATE SET focus = EXCLUDED.focus, exercises = EXCLUDED.exercises
                """, (user_id, phase, day, focus, json.dumps(exercises)))
            db.commit()
            print(f"Workout plan generated successfully via Gemini for user {user_id}!")
            return
        except Exception as e:
            print("Failed to save Gemini-generated plan, falling back to local plan:", e)
            db.rollback()

    # Fallback default seeder
    cursor.execute("DELETE FROM workout_plan WHERE user_id = %s", (user_id,))

    total_weeks = round(months * 4.3)
    f_weeks = max(1, round(total_weeks * 0.2))
    b_weeks = max(1, round(total_weeks * 0.5))
    
    phase1 = f"Weeks 1-{f_weeks} (Foundation)" if f_weeks > 1 else "Week 1 (Foundation)"
    phase2 = f"Weeks {f_weeks + 1}-{f_weeks + b_weeks} (Build)"
    phase3 = f"Weeks {f_weeks + b_weeks + 1}-{total_weeks} (Intensity)"

    phases = [
        {"name": phase1, "sets": 3, "reps": "12", "label": "foundation"},
        {"name": phase2, "sets": 4, "reps": "10-12", "label": "build"},
        {"name": phase3, "sets": 4, "reps": "6-8 (Heavy)", "label": "intensity"}
    ]

    default_split = {
        "Monday": {
            "focus": "Chest & Triceps",
            "exercises": [
                {"name": "Flat Bench Press", "group": "Chest"},
                {"name": "Incline Dumbbell Press", "group": "Chest"},
                {"name": "Cable Chest Flyes", "group": "Chest"},
                {"name": "Overhead Tricep Extension", "group": "Triceps"},
                {"name": "Tricep Rope Pushdowns", "group": "Triceps"}
            ]
        },
        "Tuesday": {
            "focus": "Back & Biceps",
            "exercises": [
                {"name": "Lat Pulldowns (or Pull-ups)", "group": "Back"},
                {"name": "Bent Over Barbell Rows", "group": "Back"},
                {"name": "Seated Cable Rows", "group": "Back"},
                {"name": "Barbell Bicep Curls", "group": "Biceps"},
                {"name": "Hammer Curls", "group": "Biceps"}
            ]
        },
        "Wednesday": {
            "focus": "Legs, Forearms & Core",
            "exercises": [
                {"name": "Barbell Squats", "group": "Legs"},
                {"name": "Romanian Deadlifts (RDLs)", "group": "Legs"},
                {"name": "Leg Extensions", "group": "Legs"},
                {"name": "Dumbbell Wrist Curls", "group": "Forearms"},
                {"name": "Hanging Knee Raises", "group": "Core"},
                {"name": "Plank", "group": "Core", "reps": "60s"}
            ]
        },
        "Thursday": {
            "focus": "Shoulders & Triceps",
            "exercises": [
                {"name": "Overhead Dumbbell Press", "group": "Shoulders"},
                {"name": "Dumbbell Lateral Raises", "group": "Shoulders"},
                {"name": "Rear Delt Dumbbell Flyes", "group": "Shoulders"},
                {"name": "Tricep Dips", "group": "Triceps"},
                {"name": "Single Arm Overhead Extensions", "group": "Triceps"}
            ]
        },
        "Friday": {
            "focus": "Chest & Biceps",
            "exercises": [
                {"name": "Incline Barbell Press", "group": "Chest"},
                {"name": "Flat Dumbbell Press", "group": "Chest"},
                {"name": "Preacher Curls", "group": "Biceps"},
                {"name": "Incline Dumbbell Curls", "group": "Biceps"}
            ]
        },
        "Saturday": {
            "focus": "Full Body & Cardio",
            "exercises": [
                {"name": "Deadlifts", "group": "Full Body", "reps": "6"},
                {"name": "Dumbbell Thrusters", "group": "Full Body"},
                {"name": "Kettlebell Swings", "group": "Full Body", "reps": "15"},
                {"name": "Cardio (Running/Cycling)", "group": "Cardio", "sets": 1, "reps": "25 mins"}
            ]
        },
        "Sunday": {
            "focus": "Rest & Recovery (Milestone Check-in)",
            "exercises": []
        }
    }

    for phase in phases:
        for day, details in default_split.items():
            exercises = []
            for idx, ex in enumerate(details["exercises"]):
                exercises.append({
                    "id": f"dyn_{phase['label']}_{day.lower()}_ex{idx + 1}",
                    "name": ex["name"],
                    "sets": ex.get("sets", phase["sets"]),
                    "reps": ex.get("reps", phase["reps"]),
                    "muscleGroup": ex["group"]
                })
            
            cursor.execute("""
                INSERT INTO workout_plan (user_id, phase, day, focus, exercises)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, phase, day)
                DO UPDATE SET focus = EXCLUDED.focus, exercises = EXCLUDED.exercises
            """, (user_id, phase["name"], day, details["focus"], json.dumps(exercises)))
    db.commit()


# ================= API ENDPOINTS =================

# 1. Google OAuth2 Token login
@app.post("/api/auth/google")
async def google_login(payload: GoogleAuthRequest, db = Depends(get_db)):
    token = payload.credential
    try:
        # Validate ID Token with Google APIs
        res = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=10)
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Google authentication failed")
        
        info = res.json()
        email = info.get("email")
        name = info.get("name")
        picture = info.get("picture", "")
        google_id = info.get("sub")

        if not email:
            raise HTTPException(status_code=400, detail="Google token did not provide an email address")

        cursor = db.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user_row = cursor.fetchone()
        
        if user_row:
            user_id = user_row["id"]
            cursor.execute("UPDATE users SET name = %s, picture = %s, google_id = %s WHERE id = %s", (name, picture, google_id, user_id))
        else:
            cursor.execute("INSERT INTO users (email, name, picture, google_id) VALUES (%s, %s, %s, %s) RETURNING id", (email, name, picture, google_id))
            user_id = cursor.fetchone()["id"]
        
        db.commit()
        await check_and_seed_user_settings(user_id, db)
        
        jwt_token = create_jwt_token(user_id, email)
        return {
            "token": jwt_token,
            "user": {"id": user_id, "email": email, "name": name, "picture": picture}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 2. Guest / Mock Bypass Login
@app.post("/api/auth/mock")
async def mock_login(payload: MockAuthRequest, db = Depends(get_db)):
    email = payload.email.strip().lower()
    name = payload.name.strip()
    
    if not email or not name:
        raise HTTPException(status_code=400, detail="Email and Name are required")

    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    user_row = cursor.fetchone()

    if user_row:
        user_id = user_row["id"]
        cursor.execute("UPDATE users SET name = %s WHERE id = %s", (name, user_id))
    else:
        cursor.execute("INSERT INTO users (email, name, picture, google_id) VALUES (%s, %s, '', '') RETURNING id", (email, name))
        user_id = cursor.fetchone()["id"]
    
    db.commit()
    await check_and_seed_user_settings(user_id, db)
    
    jwt_token = create_jwt_token(user_id, email)
    return {
        "token": jwt_token,
        "user": {"id": user_id, "email": email, "name": name, "picture": ""}
    }

# 3. Get Auth Session Profile
@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

# 4. User Profile
@app.get("/api/profile")
async def get_profile(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM profile WHERE user_id = %s", (current_user["id"],))
    row = cursor.fetchone()
    if not row:
        return {"isOnboarded": False}
    
    profile_dict = dict(row)
    profile_dict["fasting_days"] = json.loads(profile_dict["fasting_days"] or "[]")
    profile_dict["isOnboarded"] = bool(profile_dict["is_onboarded"])
    profile_dict["aiDietPlan"] = profile_dict.get("ai_diet_plan")
    return profile_dict

@app.post("/api/profile/generate-diet")
async def generate_diet_plan(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    cursor.execute("SELECT * FROM profile WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="Profile not found. Please complete profile configuration first.")
    
    profile = dict(row)
    try:
        profile["fasting_days"] = json.loads(profile["fasting_days"] or "[]")
    except:
        profile["fasting_days"] = []

    prompt = f"""
You are an expert sports nutritionist. Generate a personalized 7-day high-protein diet plan for a user with the following metrics:
- Name: {profile.get('name', 'User')}
- Age: {profile.get('age', 25)}
- Gender: {profile.get('gender', 'Male')}
- Current Weight: {profile.get('starting_weight', 75.0)} kg
- Goal Weight: {profile.get('goal_weight', 70.0)} kg
- Activity Level: {profile.get('activity_level', 'Moderate')}
- Plan Duration: {profile.get('plan_duration_months', 2)} months
- Daily Protein Target: {profile.get('target_protein', 150)} g
- Daily Calories Target: {profile.get('target_calories', 2000)} kcal
- Intermittent Fasting Days: {profile.get('fasting_days', [])}

Format the response in clean, easy-to-read Markdown. Avoid wrapping the response in ```markdown tags. Start directly with the content. Provide specific recommendations for Breakfast, Lunch, Snacks, Dinner, Hydration, and Supplement schedules (e.g. Whey, Creatine). Also list foods to avoid.
"""
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(prompt)
        diet_md = response.text.strip()
        
        cursor.execute("UPDATE profile SET ai_diet_plan = %s WHERE user_id = %s", (diet_md, user_id))
        db.commit()
        return {"aiDietPlan": diet_md}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini generation failed: {str(e)}")

@app.post("/api/profile")
async def save_profile(payload: ProfileUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    
    cursor.execute("SELECT user_id FROM profile WHERE user_id = %s", (user_id,))
    exists = cursor.fetchone()
    
    fasting_days_str = json.dumps(payload.fasting_days)
    
    if exists:
        cursor.execute("""
            UPDATE profile SET
                name = %s, age = %s, gender = %s, height_cm = %s, starting_weight = %s,
                activity_level = %s, plan_duration_months = %s, goal_weight = %s,
                target_protein = %s, target_calories = %s, target_cigarettes = %s,
                start_date = %s, is_onboarded = 1, fasting_days = %s
            WHERE user_id = %s
        """, (
            payload.name, payload.age, payload.gender, payload.height_cm, payload.starting_weight,
            payload.activity_level, payload.plan_duration_months, payload.goal_weight,
            payload.target_protein, payload.target_calories, payload.target_cigarettes,
            payload.start_date, fasting_days_str, user_id
        ))
    else:
        cursor.execute("""
            INSERT INTO profile (
                user_id, name, age, gender, height_cm, starting_weight, activity_level,
                plan_duration_months, goal_weight, target_protein, target_calories,
                target_cigarettes, start_date, is_onboarded, fasting_days
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, %s)
        """, (
            user_id, payload.name, payload.age, payload.gender, payload.height_cm, payload.starting_weight,
            payload.activity_level, payload.plan_duration_months, payload.goal_weight,
            payload.target_protein, payload.target_calories, payload.target_cigarettes,
            payload.start_date, fasting_days_str
        ))
    
    db.commit()
    
    # Seed default progressive workout plans in database
    await seed_workout_plan_for_user(user_id, payload.plan_duration_months, db)
    return {"success": True}

# 5. Settings Router
@app.get("/api/settings")
async def get_settings(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM settings WHERE user_id = %s", (current_user["id"],))
    row = cursor.fetchone()
    if not row:
        return {"themeMode": "light", "notificationsEnabled": False, "notificationTime": "20:00"}
    
    return {
        "themeMode": row["theme_mode"],
        "notificationsEnabled": bool(row["notifications_enabled"]),
        "notificationTime": row["notification_time"]
    }

@app.post("/api/settings")
async def save_settings(payload: SettingsUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    cursor.execute("""
        UPDATE settings SET
            theme_mode = %s,
            notifications_enabled = %s,
            notification_time = %s
        WHERE user_id = %s
    """, (payload.themeMode, 1 if payload.notificationsEnabled else 0, payload.notificationTime, user_id))
    db.commit()
    return {"success": True}

# 6. Workout Plan Library
@app.get("/api/workout-plan")
async def get_workout_plan(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM workout_plan WHERE user_id = %s", (current_user["id"],))
    rows = cursor.fetchall()
    
    plan = {}
    for row in rows:
        if row["phase"] not in plan:
            plan[row["phase"]] = {}
        plan[row["phase"]][row["day"]] = {
            "focus": row["focus"],
            "exercises": json.loads(row["exercises"] or "[]")
        }
    return plan

@app.put("/api/workout-plan")
async def save_workout_plan(payload: dict, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    for phase_name, days in payload.items():
        for day_name, details in days.items():
            exercises_str = json.dumps(details.get("exercises", []))
            cursor.execute("""
                INSERT INTO workout_plan (user_id, phase, day, focus, exercises)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, phase, day)
                DO UPDATE SET focus = EXCLUDED.focus, exercises = EXCLUDED.exercises
            """, (user_id, phase_name, day_name, details.get("focus", ""), exercises_str))
    db.commit()
    return {"success": True}

@app.post("/api/workout-plan/reset")
async def reset_workout_plan(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    cursor.execute("SELECT plan_duration_months FROM profile WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    duration = row["plan_duration_months"] if row else 2
    await seed_workout_plan_for_user(user_id, duration, db)
    return {"success": True}

# 7. Daily Logs
@app.get("/api/daily-logs")
async def get_daily_logs(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM daily_logs WHERE user_id = %s", (current_user["id"],))
    rows = cursor.fetchall()
    
    logs = {}
    for row in rows:
        logs[row["date"]] = {
            "workoutDone": bool(row["workout_done"]),
            "proteinLog": json.loads(row["protein_log"] or "[]"),
            "caloriesQuick": row["calories_quick"],
            "water": row["water"],
            "cigarettes": row["cigarettes"],
            "sleep": row["sleep"],
            "notes": row["notes"],
            "exercisesCompleted": json.loads(row["exercises_completed"] or "{}"),
            "isFastDay": bool(row["is_fast_day"])
        }
    return logs

@app.post("/api/daily-logs/{date}")
async def save_daily_log(date: str, payload: DailyLogUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    protein_log_str = json.dumps(payload.proteinLog)
    exercises_completed_str = json.dumps(payload.exercisesCompleted)
    
    cursor.execute("""
        INSERT INTO daily_logs (
            user_id, date, workout_done, protein_log, calories_quick, water,
            cigarettes, sleep, notes, exercises_completed, is_fast_day
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            workout_done = EXCLUDED.workout_done,
            protein_log = EXCLUDED.protein_log,
            calories_quick = EXCLUDED.calories_quick,
            water = EXCLUDED.water,
            cigarettes = EXCLUDED.cigarettes,
            sleep = EXCLUDED.sleep,
            notes = EXCLUDED.notes,
            exercises_completed = EXCLUDED.exercises_completed,
            is_fast_day = EXCLUDED.is_fast_day
    """, (
        user_id, date, 1 if payload.workoutDone else 0, protein_log_str,
        payload.caloriesQuick, payload.water, payload.cigarettes, payload.sleep,
        payload.notes, exercises_completed_str, 1 if payload.isFastDay else 0
    ))
    db.commit()
    return {"success": True}

# 8. Weekly Check-ins
@app.get("/api/weekly-checkins")
async def get_weekly_checkins(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM weekly_checkins WHERE user_id = %s ORDER BY date ASC", (current_user["id"],))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.post("/api/weekly-checkins")
async def save_weekly_checkin(payload: CheckInSave, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO weekly_checkins (user_id, date, weight, waist, chest, photo)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            weight = EXCLUDED.weight,
            waist = EXCLUDED.waist,
            chest = EXCLUDED.chest,
            photo = EXCLUDED.photo
    """, (user_id, payload.date, payload.weight, payload.waist, payload.chest, payload.photo))
    db.commit()
    return {"success": True}

@app.delete("/api/weekly-checkins/{date}")
async def delete_weekly_checkin(date: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    cursor.execute("DELETE FROM weekly_checkins WHERE user_id = %s AND date = %s", (user_id, date))
    db.commit()
    return {"success": True}

# 9. Seed Demo Data (Saves to user database)
@app.post("/api/seed")
async def seed_data(payload: SeedDataRequest, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    
    # Seed check-ins
    for check in payload.weeklyCheckIns:
        cursor.execute("""
            INSERT INTO weekly_checkins (user_id, date, weight, waist, chest, photo)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                weight = EXCLUDED.weight,
                waist = EXCLUDED.waist,
                chest = EXCLUDED.chest,
                photo = EXCLUDED.photo
        """, (user_id, check["date"], check["weight"], check.get("waist"), check.get("chest"), check.get("photo")))
        
    # Seed logs
    for date, log in payload.dailyLogs.items():
        cursor.execute("""
            INSERT INTO daily_logs (
                user_id, date, workout_done, protein_log, calories_quick, water,
                cigarettes, sleep, notes, exercises_completed, is_fast_day
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                workout_done = EXCLUDED.workout_done,
                protein_log = EXCLUDED.protein_log,
                calories_quick = EXCLUDED.calories_quick,
                water = EXCLUDED.water,
                cigarettes = EXCLUDED.cigarettes,
                sleep = EXCLUDED.sleep,
                notes = EXCLUDED.notes,
                exercises_completed = EXCLUDED.exercises_completed,
                is_fast_day = EXCLUDED.is_fast_day
        """, (
            user_id, date, 1 if log["workoutDone"] else 0, json.dumps(log.get("proteinLog", [])),
            log.get("caloriesQuick"), log.get("water", 0), log.get("cigarettes", 0),
            log.get("sleep"), log.get("notes", ""), json.dumps(log.get("exercisesCompleted", {})),
            1 if log.get("isFastDay") else 0
        ))
        
    db.commit()
    return {"success": True}

# 10. Database Reset
@app.post("/api/reset")
async def reset_user_data(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    cursor.execute("DELETE FROM profile WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM daily_logs WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM weekly_checkins WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM workout_plan WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM settings WHERE user_id = %s", (user_id,))
    db.commit()
    await check_and_seed_user_settings(user_id, db)
    return {"success": True}

# 11. Backup restore import
@app.post("/api/import")
async def import_backup(payload: ImportRequest, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    
    # Reset existing user tables first
    cursor.execute("DELETE FROM profile WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM daily_logs WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM weekly_checkins WHERE user_id = %s", (user_id,))
    cursor.execute("DELETE FROM workout_plan WHERE user_id = %s", (user_id,))

    # Restore profile
    profile = payload.profile
    cursor.execute("""
        INSERT INTO profile (
            user_id, name, age, gender, height_cm, starting_weight, activity_level,
            plan_duration_months, goal_weight, target_protein, target_calories,
            target_cigarettes, start_date, is_onboarded, fasting_days
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id, profile.get("name"), profile.get("age"), profile.get("gender"),
        profile.get("height_cm", profile.get("height")),
        profile.get("starting_weight", profile.get("startingWeight")),
        profile.get("activity_level", profile.get("activityLevel")),
        profile.get("plan_duration_months", profile.get("planDurationMonths", 2)),
        profile.get("goal_weight", profile.get("targetWeight")),
        profile.get("target_protein", profile.get("targetProtein")),
        profile.get("target_calories", profile.get("targetCalories")),
        profile.get("target_cigarettes", profile.get("targetCigarettes")),
        profile.get("start_date", profile.get("startDate")),
        1 if profile.get("is_onboarded", profile.get("isOnboarded")) else 0,
        json.dumps(profile.get("fasting_days", profile.get("fastingDays", [])))
    ))

    # Restore settings
    settings = payload.settings
    cursor.execute("""
        INSERT INTO settings (user_id, theme_mode, notifications_enabled, notification_time)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_id)
        DO UPDATE SET
            theme_mode = EXCLUDED.theme_mode,
            notifications_enabled = EXCLUDED.notifications_enabled,
            notification_time = EXCLUDED.notification_time
    """, (
        user_id, settings.get("themeMode", "light"),
        1 if settings.get("notificationsEnabled") else 0,
        settings.get("notificationTime", "20:00")
    ))

    # Restore logs
    for date, log in payload.dailyLogs.items():
        cursor.execute("""
            INSERT INTO daily_logs (
                user_id, date, workout_done, protein_log, calories_quick, water,
                cigarettes, sleep, notes, exercises_completed, is_fast_day
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, date, 1 if log.get("workoutDone") else 0, json.dumps(log.get("proteinLog", [])),
            log.get("caloriesQuick"), log.get("water", 0), log.get("cigarettes", 0),
            log.get("sleep"), log.get("notes", ""), json.dumps(log.get("exercisesCompleted", {})),
            1 if log.get("isFastDay") else 0
        ))

    # Restore check-ins
    for check in payload.weeklyCheckIns:
        cursor.execute("""
            INSERT INTO weekly_checkins (user_id, date, weight, waist, chest, photo)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, check["date"], check["weight"], check.get("waist"), check.get("chest"), check.get("photo")))

    # Restore workout plan
    for phase_name, days in payload.workoutPlan.items():
        for day_name, details in days.items():
            cursor.execute("""
                INSERT INTO workout_plan (user_id, phase, day, focus, exercises)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, phase_name, day_name, details.get("focus"), json.dumps(details.get("exercises", []))))

    db.commit()
    return {"success": True}
