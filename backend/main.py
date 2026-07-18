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

    # 7. Food Cache Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS food_cache (
            query TEXT PRIMARY KEY,
            response_json TEXT
        )
    """)

    # Ensure profile and logs tables have the extended columns
    try:
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS ai_diet_plan TEXT;")
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS country TEXT;")
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS diet_type TEXT;")
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS typical_meals TEXT;")
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS workout_time_available TEXT;")
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS medical_conditions TEXT;")
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS primary_goal TEXT;")
        cursor.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS preferred_rest_days TEXT DEFAULT '[\"Sunday\"]';")
        cursor.execute("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS food_log TEXT DEFAULT '[]';")
    except Exception as e:
        print("Column alterations status:", e)

    # 8. Local Food Items Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS food_items (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE,
            region TEXT,
            standard_unit_label TEXT,
            unit_grams REAL,
            calories REAL,
            protein REAL,
            carbs REAL,
            fat REAL
        )
    """)

    # Seed food items if table is empty
    try:
        cursor.execute("SELECT COUNT(*) FROM food_items")
        if cursor.fetchone()[0] == 0:
            seed_items = [
                ("Roti / Chapati (1 piece, 40g)", "India", "piece", 40, 120, 3, 22, 1),
                ("Phulka (1 piece, 30g)", "India", "piece", 30, 85, 2.5, 18, 0.5),
                ("Paratha (Plain, 1 piece, 60g)", "India", "piece", 60, 220, 4, 35, 8),
                ("Aloo Paratha (1 piece, 100g)", "India", "piece", 100, 290, 5, 45, 10),
                ("Paneer Paratha (1 piece, 100g)", "India", "piece", 100, 320, 10, 40, 12),
                ("Naan (Butter, 1 piece, 120g)", "India", "piece", 120, 350, 9, 55, 10),
                ("Tandoori Roti (1 piece, 50g)", "India", "piece", 50, 150, 4.5, 28, 1.5),
                ("White Rice (Cooked, 1 cup, 150g)", "India", "cup", 150, 195, 3.5, 42, 0.4),
                ("Brown Rice (Cooked, 1 cup, 150g)", "India", "cup", 150, 180, 4, 38, 1.5),
                ("Jeera Rice (1 cup, 150g)", "India", "cup", 150, 210, 3.5, 44, 2),
                ("Khichdi (1 bowl, 200g)", "India", "bowl", 200, 230, 7, 42, 4),
                ("Veg Biryani (1 plate, 300g)", "India", "plate", 300, 450, 10, 80, 10),
                ("Chicken Biryani (1 plate, 350g)", "India", "plate", 350, 620, 28, 85, 18),
                ("Curd Rice (1 bowl, 200g)", "India", "bowl", 200, 250, 6, 45, 5),
                ("Dal Tadka / Dal Fry (1 bowl, 150g)", "India", "bowl", 150, 140, 7, 22, 3.5),
                ("Dal Makhani (1 bowl, 150g)", "India", "bowl", 150, 250, 8, 26, 13),
                ("Moong Dal (Yellow, Cooked, 1 bowl, 150g)", "India", "bowl", 150, 130, 8, 20, 1.5),
                ("Masoor Dal (Red, Cooked, 1 bowl, 150g)", "India", "bowl", 150, 135, 8.5, 21, 1),
                ("Chole Masala (1 bowl, 150g)", "India", "bowl", 150, 220, 8, 32, 7),
                ("Rajma Masala (1 bowl, 150g)", "India", "bowl", 150, 190, 8, 28, 5),
                ("Chana Masala (1 bowl, 150g)", "India", "bowl", 150, 210, 8.5, 30, 6),
                ("Sambar (1 bowl, 150g)", "India", "bowl", 150, 95, 3, 16, 2),
                ("Kadhi (Punjabi, 1 bowl, 150g)", "India", "bowl", 150, 120, 4, 14, 5),
                ("Paneer Bhurji (1 plate, 150g)", "India", "plate", 150, 280, 16, 8, 22),
                ("Paneer Tikka Masala (1 bowl, 150g)", "India", "bowl", 150, 310, 14, 10, 24),
                ("Paneer Butter Masala (1 bowl, 150g)", "India", "bowl", 150, 340, 12, 12, 28),
                ("Palak Paneer (1 bowl, 150g)", "India", "bowl", 150, 220, 11, 8, 16),
                ("Matar Paneer (1 bowl, 150g)", "India", "bowl", 150, 260, 12, 14, 18),
                ("Aloo Gobhi (Dry, 1 bowl, 150g)", "India", "bowl", 150, 130, 3, 18, 6),
                ("Bhindi Fry (Okra, 1 bowl, 150g)", "India", "bowl", 150, 115, 2.5, 12, 7),
                ("Mix Veg Sabzi (1 bowl, 150g)", "India", "bowl", 150, 140, 3, 16, 8),
                ("Baingan Bharta (1 bowl, 150g)", "India", "bowl", 150, 110, 2, 10, 7),
                ("Soya Chunks Curry (1 bowl, 150g)", "India", "bowl", 150, 180, 18, 14, 5),
                ("Egg Bhurji (Scrambled, 2 eggs)", "India", "plate", 100, 210, 13, 4, 16),
                ("Egg Curry (with 2 boiled eggs)", "India", "bowl", 150, 250, 14, 8, 18),
                ("Chicken Curry (Indian Style, 1 bowl)", "India", "bowl", 180, 290, 26, 6, 18),
                ("Butter Chicken (1 bowl, 180g)", "India", "bowl", 180, 380, 24, 10, 27),
                ("Chicken Tikka (Dry, 6 pieces, 150g)", "India", "plate", 150, 220, 32, 3, 9),
                ("Fish Curry (Indian Style, 1 bowl)", "India", "bowl", 180, 240, 22, 8, 13),
                ("Mutton Curry (1 bowl, 180g)", "India", "bowl", 180, 340, 25, 8, 22),
                ("Idli (Plain, 1 piece, 40g)", "India", "piece", 40, 60, 1.5, 13, 0.1),
                ("Plain Dosa (1 piece, 80g)", "India", "piece", 80, 135, 3, 29, 1),
                ("Masala Dosa (1 piece, 120g)", "India", "piece", 120, 250, 4, 44, 7),
                ("Uttapam (Plain, 1 piece, 100g)", "India", "piece", 100, 180, 4, 36, 2),
                ("Coconut Chutney (2 tbsp, 30g)", "India", "portion", 30, 60, 0.8, 3, 5.5),
                ("Upma (1 bowl, 150g)", "India", "bowl", 150, 195, 4, 35, 4),
                ("Poha (Flattened Rice, 1 bowl, 150g)", "India", "bowl", 150, 220, 3.5, 38, 6),
                ("Curd / Dahi (Plain, 1 bowl, 100g)", "India", "bowl", 100, 60, 3.5, 4.5, 3),
                ("Greek Yogurt (Plain, 150g)", "Global", "container", 150, 90, 15, 5, 0),
                ("Milk (Toned, 1 glass, 200ml)", "India", "glass", 200, 110, 6, 9, 6),
                ("Milk (Skimmed, 1 glass, 200ml)", "Global", "glass", 200, 70, 6.5, 9.5, 0.2),
                ("Whey Protein (1 scoop, 33g)", "Global", "scoop", 33, 120, 24, 2, 1.5),
                ("Paneer (Raw, 100g)", "India", "grams", 100, 265, 18, 1.2, 20),
                ("Tofu (Raw, 100g)", "Global", "grams", 100, 80, 8, 2, 4.5),
                ("Boiled Egg (Large, 1 piece)", "Global", "piece", 50, 78, 6.3, 0.6, 5.3),
                ("Fried Egg (1 piece)", "Global", "piece", 50, 90, 6.3, 0.6, 7),
                ("Egg White (Boiled, 1 piece)", "Global", "piece", 33, 17, 3.6, 0.2, 0.1),
                ("Omelette (2 eggs, plain)", "Global", "portion", 100, 155, 13, 1, 11),
                ("Grilled Chicken Breast (100g)", "Global", "grams", 100, 165, 31, 0, 3.6),
                ("Oats (Rolled, Raw, 40g)", "Global", "grams", 40, 150, 5, 27, 3),
                ("Peanut Butter (1 tbsp, 16g)", "Global", "tbsp", 16, 95, 3.5, 3, 8),
                ("Almonds (10 pieces, 12g)", "Global", "portion", 12, 70, 2.5, 2.5, 6),
                ("Sautéed Broccoli (1 cup, 100g)", "Global", "cup", 100, 50, 3, 7, 2),
                ("Baked Sweet Potato (150g)", "Global", "grams", 150, 135, 2.5, 31, 0.2),
                ("Quinoa (Cooked, 1 cup, 185g)", "Global", "cup", 185, 220, 8, 39, 3.6),
                ("Whole Wheat Bread (1 slice, 30g)", "Global", "slice", 30, 75, 3.5, 13, 1),
                ("Banana (1 medium, 120g)", "Global", "piece", 120, 105, 1.3, 27, 0.3),
                ("Apple (1 medium, 150g)", "Global", "piece", 150, 80, 0.5, 20, 0.2),
                ("Mixed Salad (1 plate)", "Global", "plate", 150, 35, 1.5, 6, 0.55),
                ("Avocado (1/2 medium, 100g)", "Global", "piece", 100, 160, 2, 8.5, 14.55),
                ("Roasted Chana / Chickpeas (30g)", "India", "portion", 30, 110, 6, 18, 1.8),
                ("Roasted Peanuts (30g)", "India", "portion", 30, 170, 7, 6, 14),
                ("Samosa (1 piece, 75g)", "India", "piece", 75, 260, 4, 32, 13),
                ("Sprouts Salad (1 bowl, 150g)", "India", "bowl", 150, 120, 8, 20, 1),
                ("Dhokla (2 pieces, 80g)", "India", "portion", 80, 150, 5, 26, 3)
            ]
            for name, region, unit_label, unit_g, cal, prot, carb, fat in seed_items:
                cursor.execute("""
                    INSERT INTO food_items (name, region, standard_unit_label, unit_grams, calories, protein, carbs, fat)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (name) DO NOTHING
                """, (name, region, unit_label, unit_g, cal, prot, carb, fat))
    except Exception as e:
        print("Failed to seed food_items table:", e)

    # 9. Quotes Bank Table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quotes_bank (
                id SERIAL PRIMARY KEY,
                text TEXT UNIQUE,
                author TEXT
            )
        """)
        cursor.execute("SELECT COUNT(*) FROM quotes_bank")
        if cursor.fetchone()[0] == 0:
            prefixes = [
                "Your daily actions", "Every drop of sweat", "Consistently logging meals",
                "Waking up early for workouts", "Tracking calories and proteins", "Focusing on progressive overload",
                "Prioritizing deep rest and recovery", "Choosing healthy whole-foods", "Sustaining a positive mindset",
                "Small daily disciplines"
            ]
            connections = [
                "will eventually guide you to", "will build the inner momentum to", "gives you the absolute power to",
                "creates the metabolic foundation to", "keeps you perfectly aligned to", "unlocks the physical strength to",
                "sharpens your focus to", "nourishes your spirit to", "accelerates your journey to",
                "guarantees you will reach"
            ]
            suffixes = [
                "your absolute athletic peak.", "a healthy, disease-free lifetime.", "your target physical conditioning.",
                "unbreakable habits that scale forever.", "remarkable body recomposition results.", "the energy to conquer every day.",
                "a state of peak focus and fitness.", "your dream target weight.", "mastery over your body and mind.",
                "unshakeable fitness and longevity."
            ]
            authors = [
                "Arnold Schwarzenegger", "Marcus Aurelius", "FitHabit AI Coach", "David Goggins",
                "James Clear", "Lao Tzu", "Bruce Lee", "Epictetus", "Socrates", "Muhammad Ali"
            ]
            
            seed_quotes = []
            count = 0
            for p in prefixes:
                for c in connections:
                    for s in suffixes:
                        author = authors[count % len(authors)]
                        text = f"{p} {c} {s}"
                        seed_quotes.append((text, author))
                        count += 1
                        
            for text, author in seed_quotes:
                cursor.execute("""
                    INSERT INTO quotes_bank (text, author)
                    VALUES (%s, %s)
                    ON CONFLICT (text) DO NOTHING
                """, (text, author))
            print(f"Quotes bank seeded with {len(seed_quotes)} unique motivational quotes.")
    except Exception as e:
        print("Failed to initialize or seed quotes_bank table:", e)

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
    country: Optional[str] = ""
    diet_type: Optional[str] = ""
    typical_meals: Optional[str] = ""
    workout_time_available: Optional[str] = "1 hr"
    medical_conditions: List[str] = []
    primary_goal: Optional[str] = "Weight Loss"
    preferred_rest_days: List[str] = ["Sunday"]

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
    foodLog: Optional[List[dict]] = []

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
- Primary Goal: {profile.get('primary_goal', 'Weight Loss')}
- Plan Duration: {months} months
- Daily Workout Time Available: {profile.get('workout_time_available', '1 hr')}
- Medical Conditions: {profile.get('medical_conditions', [])}
- Preferred Rest Day(s): {profile.get('preferred_rest_days', ['Sunday'])}
- Intermittent Fasting Days: {profile.get('fasting_days', [])}

Adjust the plan volume:
- If workout time is 30 mins: Generate 3-4 exercises per day, 2-3 sets each.
- If workout time is 1 hr: Generate 5-6 exercises per day, 3 sets each.
- If workout time is 1.5+ hrs: Generate 6-7 exercises per day, 4 sets each.

Safety guidelines:
- If \"Joint/knee issues\" are present, avoid high-impact knee/joint loading (like heavy squats or jumping lunges), substituting with low-impact alternatives (e.g. leg press, leg extensions, or glute bridges).

Structure your response as a valid JSON array of objects. Do not include any markdown styling like ```json or any other text wrapper. Return ONLY raw JSON.
The JSON array should contain objects with keys: "phase", "day", "focus", "exercises".
- "phase": Use exactly three progressive phases matching the plan duration.
- "day": One object for each day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday) for each phase.
- "focus": A brief description of the workout focus for that day.
- "exercises": A JSON array of exercise objects. Each exercise must have:
  - "id": A unique string ID (e.g., "ai_foundation_monday_ex1").
  - "name": Name of the exercise.
  - "sets": Integer number of sets.
  - "reps": String range of reps (e.g., "12", "8-10").
  - "muscleGroup": The primary muscle targeted.
Note: For Preferred Rest Day(s) specified, set "focus" to "Rest & Recovery (Milestone Check-in)" and "exercises" to an empty list [].

Example structure:
[
  {{
    "phase": "Weeks 1-2 (Foundation)",
    "day": "Monday",
    "focus": "Chest & Triceps",
    "exercises": [
      {{"id": "ai_foundation_monday_ex1", "name": "Flat Bench Press", "sets": 3, "reps": "12", "muscleGroup": "Chest"}}
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
    cursor.execute("DELETE FROM workout_plan WHERE user_id = %s", (user_id,))
    
    # Load profile to apply user-specific time constraint and medical constraints
    cursor.execute("SELECT * FROM profile WHERE user_id = %s", (user_id,))
    prof_row = cursor.fetchone()
    
    preferred_rest = ["Sunday"]
    workout_time = "1 hr"
    medical_conditions = []
    
    if prof_row:
        prof_dict = dict(prof_row)
        try:
            preferred_rest = json.loads(prof_dict.get("preferred_rest_days") or "[\"Sunday\"]")
        except:
            preferred_rest = ["Sunday"]
        workout_time = prof_dict.get("workout_time_available") or "1 hr"
        try:
            medical_conditions = json.loads(prof_dict.get("medical_conditions") or "[]")
        except:
            medical_conditions = []

    # Configure exercise limit based on workout time
    limit = 5
    if "30 min" in workout_time:
        limit = 3
    elif "1.5" in workout_time or "2 hr" in workout_time:
        limit = 6

    # Swap exercises if joint/knee issues exist
    has_joint_issues = "Joint/knee issues" in medical_conditions
    def get_safe_exercise(ex_name):
        if has_joint_issues:
            swaps = {
                "Barbell Squats": "Leg Press (Low Joint Stress)",
                "Romanian Deadlifts (RDLs)": "Glute Bridges (Low Joint Stress)",
                "Deadlifts": "Cable Pull-Throughs (Low Joint Stress)",
                "Cardio (Running/Cycling)": "Rowing Machine (Low Impact Cardio)"
            }
            return swaps.get(ex_name, ex_name)
        return ex_name

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
                {"name": "Tricep Rope Pushdowns", "group": "Triceps"},
                {"name": "Pushups", "group": "Chest"}
            ]
        },
        "Tuesday": {
            "focus": "Back & Biceps",
            "exercises": [
                {"name": "Lat Pulldowns (or Pull-ups)", "group": "Back"},
                {"name": "Bent Over Barbell Rows", "group": "Back"},
                {"name": "Seated Cable Rows", "group": "Back"},
                {"name": "Barbell Bicep Curls", "group": "Biceps"},
                {"name": "Hammer Curls", "group": "Biceps"},
                {"name": "Preacher Curls", "group": "Biceps"}
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
                {"name": "Incline Dumbbell Curls", "group": "Biceps"},
                {"name": "Decline Chest Flyes", "group": "Chest"}
            ]
        },
        "Saturday": {
            "focus": "Full Body & Cardio",
            "exercises": [
                {"name": "Deadlifts", "group": "Full Body"},
                {"name": "Dumbbell Thrusters", "group": "Full Body"},
                {"name": "Kettlebell Swings", "group": "Full Body"},
                {"name": "Cardio (Running/Cycling)", "group": "Cardio"}
            ]
        },
        "Sunday": {
            "focus": "Rest & Recovery (Milestone Check-in)",
            "exercises": []
        }
    }

    for phase in phases:
        for day, details in default_split.items():
            if day in preferred_rest:
                focus_title = "Rest & Recovery (Milestone Check-in)"
                exercises = []
            else:
                focus_title = details["focus"]
                exercises = []
                selected_exs = details["exercises"][:limit]
                for idx, ex in enumerate(selected_exs):
                    safe_name = get_safe_exercise(ex["name"])
                    exercises.append({
                        "id": f"dyn_{phase['label']}_{day.lower()}_ex{idx + 1}",
                        "name": safe_name,
                        "sets": ex.get("sets", phase["sets"]),
                        "reps": ex.get("reps", phase["reps"]),
                        "muscleGroup": ex["group"]
                    })
            
            cursor.execute("""
                INSERT INTO workout_plan (user_id, phase, day, focus, exercises)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, phase, day)
                DO UPDATE SET focus = EXCLUDED.focus, exercises = EXCLUDED.exercises
            """, (user_id, phase["name"], day, focus_title, json.dumps(exercises)))
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
    profile_dict["fasting_days"] = json.loads(profile_dict.get("fasting_days") or "[]")
    profile_dict["medical_conditions"] = json.loads(profile_dict.get("medical_conditions") or "[]")
    profile_dict["preferred_rest_days"] = json.loads(profile_dict.get("preferred_rest_days") or "[\"Sunday\"]")
    profile_dict["isOnboarded"] = bool(profile_dict["is_onboarded"])
    profile_dict["aiDietPlan"] = profile_dict.get("ai_diet_plan")
    return profile_dict

class SummaryRequest(BaseModel):
    name: Optional[str] = "Challenger"
    age: Optional[int] = 25
    gender: Optional[str] = "male"
    height_cm: Optional[float] = 175.0
    starting_weight: Optional[float] = 70.0
    activity_level: Optional[str] = "moderate"
    plan_duration_months: Optional[int] = 2
    goal_weight: Optional[float] = 65.0
    target_protein: Optional[int] = 130
    target_calories: Optional[int] = 2000
    target_cigarettes: Optional[int] = 0
    country: Optional[str] = "India"
    diet_type: Optional[str] = "vegetarian"
    typical_meals: Optional[str] = ""
    workout_time_available: Optional[str] = "1 hr"
    medical_conditions: Optional[List[str]] = []
    primary_goal: Optional[str] = "Weight Loss"
    preferred_rest_days: Optional[List[str]] = ["Sunday"]
    fasting_days: Optional[List[str]] = []

@app.post("/api/profile/onboarding-summary")
async def generate_onboarding_summary(payload: SummaryRequest):
    bmi = round(payload.starting_weight / ((payload.height_cm / 100) ** 2), 1)
    prompt = f"""
You are a friendly personal fitness coach. Based on the user's details, write a concise 2-3 sentence summary explaining what this personalized plan means for them, their calorie deficit/surplus, BMR/TDEE context, active split focus, and highlight any diabetic/medical or rest-day adaptations:
User profile:
- Name: {payload.name}
- Age: {payload.age}
- Gender: {payload.gender}
- BMI: {bmi}
- Goal: {payload.primary_goal}
- Goal Weight: {payload.goal_weight} kg
- Calories target: {payload.target_calories} kcal
- Protein target: {payload.target_protein} g
- Country/Diet: {payload.country} / {payload.diet_type}
- Workout Time: {payload.workout_time_available}
- Rest Days: {payload.preferred_rest_days}
- Fasting Days: {payload.fasting_days}
- Medical Conditions: {payload.medical_conditions}

Keep it strictly to 2-3 sentences. Do not use any markdown formatting or lists.
"""
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(prompt)
        return {"summary": response.text.strip()}
    except Exception as e:
        return {"summary": f"Based on your profile, you're targetting {payload.primary_goal} to reach {payload.goal_weight} kg. Your plan includes a daily target of {payload.target_calories} kcal and {payload.target_protein}g protein, adapted to your {payload.workout_time_available} workouts and preferred rest days."}

@app.get("/api/quote-of-the-day")
async def get_quote_of_the_day(db = Depends(get_db)):
    from datetime import datetime
    day_of_year = datetime.now().timetuple().tm_yday
    
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM quotes_bank")
    total_quotes = cursor.fetchone()["count"]
    
    if total_quotes == 0:
        return {
            "text": "Your daily actions will build the inner momentum to a healthy, disease-free lifetime.",
            "author": "FitHabit AI Coach"
        }
    
    # Deterministic index selection
    quote_index = (day_of_year % total_quotes) + 1
    cursor.execute("SELECT text, author FROM quotes_bank WHERE id = %s", (quote_index,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT text, author FROM quotes_bank LIMIT 1")
        row = cursor.fetchone()
        
    return {"text": row["text"], "author": row["author"]}

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
    try:
        profile["medical_conditions"] = json.loads(profile["medical_conditions"] or "[]")
    except:
        profile["medical_conditions"] = []

    country_val = profile.get('country', 'India')
    diet_type_val = profile.get('diet_type', 'vegetarian')

    regional_prompt = ""
    if country_val == "India":
        regional_prompt = """
CRITICAL: Since the user is from India, the meals MUST consist ONLY of common Indian home-cooked dishes such as roti, chapati, phulka, sabzi, dal, rice, curd, paneer, idli, dosa, dahi, sprouts, egg bhurji, etc. Do NOT suggest Western or non-regional foods like salmon, quinoa, burritos, bagels, tuna, kale, beef, pork, or similar.
"""
    elif country_val in ["United States", "United Kingdom"]:
        regional_prompt = f"""
CRITICAL: Since the user is from {country_val}, suggest common regional home-cooked Western options from {country_val} (e.g. eggs, toast, oatmeal, chicken breast, salads, baked potato). Do NOT suggest regional Indian foods like paneer tikka, roti, dal, or typical Indian dishes.
"""

    prompt = f"""
You are an expert sports nutritionist. Generate a personalized 7-day high-protein diet plan for a user with the following metrics:
- Name: {profile.get('name', 'User')}
- Country / Region: {country_val}
- Diet Type: {diet_type_val}
- Typical Daily Meals: {profile.get('typical_meals', 'Not specified')}
- Age: {profile.get('age', 25)}
- Gender: {profile.get('gender', 'Male')}
- Current Weight: {profile.get('starting_weight', 75.0)} kg
- Goal Weight: {profile.get('goal_weight', 70.0)} kg
- Activity Level: {profile.get('activity_level', 'Moderate')}
- Primary Goal: {profile.get('primary_goal', 'Weight Loss')}
- Daily Protein Target: {profile.get('target_protein', 150)} g
- Daily Calories Target: {profile.get('target_calories', 2000)} kcal
- Medical Conditions: {profile.get('medical_conditions', [])}
- Intermittent Fasting Days: {profile.get('fasting_days', [])}

{regional_prompt}

Important Health Warnings:
- If user has Diabetes / Blood sugar issues, strictly flag and avoid high-sugar, refined flour/carb meals, recommending low-glycemic alternatives.
- Tailor suggestions to the region ({country_val}) and diet type ({diet_type_val}).

Format the response in clean, easy-to-read Markdown. Avoid wrapping the response in ```markdown tags. Start directly with the content. Provide specific recommendations for Breakfast, Lunch, Snacks, Dinner, Hydration, and Supplement schedules. Also list foods to avoid.
"""
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(prompt)
        diet_md = response.text.strip()
        
        # Blocklist post-validation check for India
        if country_val == "India":
            blocklist = ["salmon", "quinoa", "burrito", "tuna", "bagel", "kale", "avocado salad", "beef", "pork"]
            text_lower = diet_md.lower()
            if any(term in text_lower for term in blocklist):
                print("India blocklist term matched. Regenerating with stronger constraint...")
                prompt_strict = prompt + "\nCRITICAL: YOU PREVIOUSLY FAILED AND SUGGESTED BLOCKED ITEMS. You MUST NOT suggest salmon, quinoa, burritos, tuna, bagels, kale, avocado, beef, or pork. Swap them out with Indian foods like paneer, curd, eggs, chicken breast, dal, or roti."
                response = model.generate_content(prompt_strict)
                diet_md = response.text.strip()

        cursor.execute("UPDATE profile SET ai_diet_plan = %s WHERE user_id = %s", (diet_md, user_id))
        db.commit()
        return {"aiDietPlan": diet_md}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini generation failed: {str(e)}")

@app.get("/api/diet/search-food")
async def search_food(q: str = "", db = Depends(get_db)):
    q = q.strip()
    if not q:
        return []
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, name, region, standard_unit_label, unit_grams, calories, protein, carbs, fat
        FROM food_items
        WHERE name ILIKE %s
        LIMIT 15
    """, (f"%{q}%",))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "name": r["name"],
            "region": r["region"],
            "standard_unit_label": r["standard_unit_label"],
            "unit_grams": r["unit_grams"],
            "calories": r["calories"],
            "protein": r["protein"],
            "carbs": r["carbs"],
            "fat": r["fat"]
        })
    return results

class ParseFoodRequest(BaseModel):
    query: str

def try_local_parse(query_str: str, db):
    parts = [p.strip().lower() for p in query_str.split(",") if p.strip()]
    if not parts:
        return None
    
    parsed_items = []
    total_cal = 0.0
    total_prot = 0.0
    
    cursor = db.cursor()
    for part in parts:
        tokens = part.split()
        quantity_num = 1.0
        food_name_tokens = tokens
        
        if tokens:
            try:
                quantity_num = float(tokens[0])
                food_name_tokens = tokens[1:]
            except ValueError:
                quantity_num = 1.0
        
        search_term = " ".join(food_name_tokens).strip()
        if not search_term:
            return None
            
        cursor.execute("""
            SELECT name, standard_unit_label, unit_grams, calories, protein, carbs, fat
            FROM food_items
            WHERE name ILIKE %s OR name ILIKE %s
            LIMIT 1
        """, (f"{search_term}%", f"%{search_term}%"))
        row = cursor.fetchone()
        
        if not row:
            return None
            
        item_cal = round(row["calories"] * quantity_num)
        item_prot = round(row["protein"] * quantity_num, 1)
        item_carbs = round(row["carbs"] * quantity_num, 1)
        item_fat = round(row["fat"] * quantity_num, 1)
        
        parsed_items.append({
            "name": row["name"],
            "calories": item_cal,
            "protein": item_prot,
            "carbs": item_carbs,
            "fat": item_fat,
            "quantity": f"{quantity_num} {row['standard_unit_label']}"
        })
        total_cal += item_cal
        total_prot += item_prot
        
    return {
        "items": parsed_items,
        "totalCalories": int(total_cal),
        "totalProtein": round(total_prot, 1)
    }

@app.post("/api/diet/parse-food")
async def parse_food(payload: ParseFoodRequest, db = Depends(get_db)):
    query = payload.query.strip().lower()
    if not query:
        raise HTTPException(status_code=400, detail="Empty query")

    cursor = db.cursor()
    
    # 1. Try local parse first
    local_parsed = try_local_parse(query, db)
    if local_parsed:
        print(f"Local food DB hit for: {query}")
        return local_parsed

    # 2. Check food_cache
    cursor.execute("SELECT response_json FROM food_cache WHERE query = %s", (query,))
    cached = cursor.fetchone()
    if cached:
        return json.loads(cached["response_json"])

    # 3. Fallback to Gemini AI
    prompt = f"""
You are a food nutrition database. Parse this natural language food entry: "{query}"

Format your response as a valid JSON object. Do not include any markdown formatting like ```json. Return ONLY raw JSON.
The JSON object must have keys: "items", "totalCalories", "totalProtein".
- "items": A list of objects, each containing:
  - "name": string (e.g. "chapati", "paneer bhurji")
  - "calories": integer (calories)
  - "protein": float (protein in grams)
  - "carbs": float (carbs in grams)
  - "fat": float (fat in grams)
  - "quantity": string (e.g. "2 units", "1 bowl")
- "totalCalories": integer (sum of all items)
- "totalProtein": float (sum of all protein in grams)

Example query "2 chapati, 1 bowl dal":
{{
  "items": [
    {{"name": "chapati", "calories": 140, "protein": 4.0, "carbs": 30.0, "fat": 0.8, "quantity": "2 units"}},
    {{"name": "dal", "calories": 150, "protein": 9.0, "carbs": 24.0, "fat": 2.0, "quantity": "1 bowl"}}
  ],
  "totalCalories": 290,
  "totalProtein": 13.0
}}
"""
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        parsed = json.loads(text)
        
        # Cache the query response
        cursor.execute(
            "INSERT INTO food_cache (query, response_json) VALUES (%s, %s) ON CONFLICT (query) DO UPDATE SET response_json = EXCLUDED.response_json",
            (query, json.dumps(parsed))
        )
        
        # Save newly parsed items to food_items table for future local lookups
        for item in parsed.get("items", []):
            try:
                qty_str = item.get("quantity", "1 portion")
                unit_lbl = "portion"
                unit_g = 100.0
                tokens = qty_str.split()
                if len(tokens) >= 2:
                    unit_lbl = tokens[1]
                cursor.execute("""
                    INSERT INTO food_items (name, region, standard_unit_label, unit_grams, calories, protein, carbs, fat)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (name) DO NOTHING
                """, (item["name"], "Global", unit_lbl, unit_g, item["calories"], item["protein"], item["carbs"], item["fat"]))
            except Exception as e:
                print("Failed to save newly discovered food item:", e)
                
        db.commit()
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI food parsing failed: {str(e)}")

@app.post("/api/profile")
async def save_profile(payload: ProfileUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    cursor.execute("SELECT user_id FROM profile WHERE user_id = %s", (user_id,))
    exists = cursor.fetchone()
    
    fasting_days_str = json.dumps(payload.fasting_days)
    medical_conditions_str = json.dumps(payload.medical_conditions)
    preferred_rest_days_str = json.dumps(payload.preferred_rest_days)
    
    if exists:
        cursor.execute("""
            UPDATE profile SET
                name = %s, age = %s, gender = %s, height_cm = %s, starting_weight = %s,
                activity_level = %s, plan_duration_months = %s, goal_weight = %s,
                target_protein = %s, target_calories = %s, target_cigarettes = %s,
                start_date = %s, is_onboarded = 1, fasting_days = %s,
                country = %s, diet_type = %s, typical_meals = %s,
                workout_time_available = %s, medical_conditions = %s,
                primary_goal = %s, preferred_rest_days = %s
            WHERE user_id = %s
        """, (
            payload.name, payload.age, payload.gender, payload.height_cm, payload.starting_weight,
            payload.activity_level, payload.plan_duration_months, payload.goal_weight,
            payload.target_protein, payload.target_calories, payload.target_cigarettes,
            payload.start_date, fasting_days_str,
            payload.country, payload.diet_type, payload.typical_meals,
            payload.workout_time_available, medical_conditions_str,
            payload.primary_goal, preferred_rest_days_str,
            user_id
        ))
    else:
        cursor.execute("""
            INSERT INTO profile (
                user_id, name, age, gender, height_cm, starting_weight, activity_level,
                plan_duration_months, goal_weight, target_protein, target_calories,
                target_cigarettes, start_date, is_onboarded, fasting_days,
                country, diet_type, typical_meals, workout_time_available,
                medical_conditions, primary_goal, preferred_rest_days
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, payload.name, payload.age, payload.gender, payload.height_cm, payload.starting_weight,
            payload.activity_level, payload.plan_duration_months, payload.goal_weight,
            payload.target_protein, payload.target_calories, payload.target_cigarettes,
            payload.start_date, 1, fasting_days_str,
            payload.country, payload.diet_type, payload.typical_meals, payload.workout_time_available,
            medical_conditions_str, payload.primary_goal, preferred_rest_days_str
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
            "isFastDay": bool(row["is_fast_day"]),
            "foodLog": json.loads(row.get("food_log") or "[]")
        }
    return logs

@app.post("/api/daily-logs/{date}")
async def save_daily_log(date: str, payload: DailyLogUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    protein_log_str = json.dumps(payload.proteinLog)
    exercises_completed_str = json.dumps(payload.exercisesCompleted)
    food_log_str = json.dumps(payload.foodLog or [])
    
    cursor.execute("""
        INSERT INTO daily_logs (
            user_id, date, workout_done, protein_log, calories_quick, water,
            cigarettes, sleep, notes, exercises_completed, is_fast_day, food_log
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            is_fast_day = EXCLUDED.is_fast_day,
            food_log = EXCLUDED.food_log
    """, (
        user_id, date, 1 if payload.workoutDone else 0, protein_log_str,
        payload.caloriesQuick, payload.water, payload.cigarettes, payload.sleep,
        payload.notes, exercises_completed_str, 1 if payload.isFastDay else 0, food_log_str
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
