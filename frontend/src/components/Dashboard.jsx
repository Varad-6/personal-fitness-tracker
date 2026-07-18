import React, { useState, useEffect } from 'react';
import { quotes } from '../data/quotes';
import { 
  Flame, Award, AlertTriangle, Droplets, CheckCircle, XCircle, 
  Smile, ShieldAlert, Sparkles, ChevronRight, Zap, Coffee, Cigarette, HelpCircle 
} from 'lucide-react';
import { 
  getLocalDateString, formatUIDate, getWorkoutForDate, 
  calculateStreaks, checkOvertraining, calculateBMI, getBMICategory 
} from '../utils/helpers';

export default function Dashboard({ 
  profile, 
  dailyLogs, 
  weeklyCheckIns, 
  onUpdateDailyLog, 
  onNavigate,
  workoutPlan
}) {
  const [quote, setQuote] = useState('');
  const todayStr = getLocalDateString();
  const todayLog = dailyLogs[todayStr] || {
    workoutDone: false,
    exercisesCompleted: {},
    proteinLog: [],
    caloriesQuick: '',
    water: 0,
    cigarettes: 0,
    sleep: '',
    notes: '',
    isFastDay: false
  };

  // Get quote of the day (date-hashed so it's stable all day)
  useEffect(() => {
    // 1. Set local fallback first
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const localFallback = quotes[dayOfYear % quotes.length];
    setQuote(localFallback);

    // 2. Fetch from backend deterministic DB endpoint
    const fetchQuote = async () => {
      try {
        const token = localStorage.getItem('fithabit_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const res = await fetch('/api/quote-of-the-day', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.text) {
            setQuote(`"${data.text}" — ${data.author}`);
          }
        }
      } catch (e) {
        console.error("Failed to fetch daily quote from backend database", e);
      }
    };
    fetchQuote();
  }, []);

  // Today's weekday name (e.g., "Monday")
  const weekdayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isFastingDayToday = profile.fastingDays?.includes(weekdayName) || todayLog.isFastDay;

  // Today's workout details
  const todayWorkout = getWorkoutForDate(todayStr, profile.startDate, workoutPlan);
  
  // Calculate protein total so far
  const proteinSoFar = todayLog.proteinLog?.reduce((sum, item) => sum + (item.protein || 0), 0) || 0;
  
  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(dailyLogs);
  
  // Check overtraining warning
  const isOvertraining = checkOvertraining(dailyLogs, profile.startDate);
  
  // Get current weight from check-ins (fallback to starting weight)
  const currentWeight = weeklyCheckIns.length > 0 
    ? weeklyCheckIns[weeklyCheckIns.length - 1].weight 
    : profile.startingWeight;
  
  // Weight lost so far
  const weightLost = (profile.startingWeight - currentWeight).toFixed(1);
  
  // BMI calculation
  const bmi = calculateBMI(currentWeight, profile.height);
  const bmiCat = getBMICategory(bmi);

  // Day index of the challenge
  const start = new Date(profile.startDate);
  const today = new Date(todayStr);
  const diffTime = today.getTime() - start.getTime();
  const elapsedDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const daysRemaining = Math.max(0, (profile.plan_duration_months * 30) - elapsedDays);
  const totalDurationDays = profile.plan_duration_months * 30;
  
  // Total completed workout days (marked Done)
  const totalCompleted = Object.values(dailyLogs).filter(log => log.workoutDone === true).length;

  // Adjusted targets on Fasting Days (lower target by 25%)
  const calorieTarget = isFastingDayToday ? Math.round(profile.targetCalories * 0.75) : profile.targetCalories;
  const proteinTarget = isFastingDayToday ? Math.round(profile.targetProtein * 0.75) : profile.targetProtein;
  
  // Water tracker increment
  const adjustWater = (amount) => {
    onUpdateDailyLog(todayStr, {
      ...todayLog,
      water: Math.max(0, (todayLog.water || 0) + amount)
    });
  };

  // Cigarette counter adjust
  const adjustCigarettes = (amount) => {
    onUpdateDailyLog(todayStr, {
      ...todayLog,
      cigarettes: Math.max(0, (todayLog.cigarettes || 0) + amount)
    });
  };

  // Toggle overall day status
  const handleToggleTodayDone = () => {
    const nextStatus = !todayLog.workoutDone;
    onUpdateDailyLog(todayStr, {
      ...todayLog,
      workoutDone: nextStatus,
      isFastDay: isFastingDayToday
    });
  };

  // Badges lists (gamification)
  const badges = [
    {
      id: 'badge_first_day',
      title: 'First Step',
      desc: 'Completed first daily log',
      icon: <Sparkles className="w-5 h-5" />,
      unlocked: totalCompleted >= 1
    },
    {
      id: 'badge_week_streak',
      title: 'Week Strong',
      desc: 'Achieved a 7-day streak',
      icon: <Flame className="w-5 h-5 text-orange-500" />,
      unlocked: longestStreak >= 7
    },
    {
      id: 'badge_halfway',
      title: 'Halfway Hero',
      desc: `Completed 30 days`,
      icon: <Award className="w-5 h-5 text-indigo-400" />,
      unlocked: totalCompleted >= 30
    },
    {
      id: 'badge_clean_lungs',
      title: 'Clean Lungs',
      desc: '0 cigarettes logged in a day',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      unlocked: Object.values(dailyLogs).some(log => log.workoutDone && log.cigarettes === 0)
    },
    {
      id: 'badge_hydration_king',
      title: 'Hydration Hero',
      desc: 'Logged water target',
      icon: <Droplets className="w-5 h-5 text-sky-400" />,
      unlocked: Object.values(dailyLogs).some(log => (log.water || 0) >= (profile.targetWater * 4)) // 4 glasses per Liter
    }
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* Motivational Quote */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-md relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-2 right-4 text-8xl text-neutral-200 dark:text-neutral-800 font-serif select-none pointer-events-none opacity-20">“</div>
        <p className="text-lg md:text-xl font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed max-w-2xl relative z-10">
          {quote || "Consistency is the key to unlocking your true potential."}
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mt-3 relative z-10">
          DAILY MOTIVATION
        </p>
      </div>

      {/* Quick Stats Widget Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 shadow-sm flex items-center justify-between transition-colors duration-200">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase block">Current Weight</span>
            <span className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white">{currentWeight} <span className="text-xs text-neutral-400 font-normal">kg</span></span>
            {parseFloat(weightLost) !== 0 && (
              <span className={`text-[10px] font-bold block mt-0.5 ${parseFloat(weightLost) > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {parseFloat(weightLost) > 0 ? `-${weightLost}kg lost` : `+${Math.abs(weightLost)}kg gained`}
              </span>
            )}
          </div>
          <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-400">
            <Zap className="w-4 h-4 md:w-5 md:h-5 text-orange-500 dark:text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 shadow-sm flex items-center justify-between transition-colors duration-200">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase block">Active BMI</span>
            <span className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white">{bmi}</span>
            <span className={`text-[10px] font-bold block mt-0.5 ${bmiCat.color}`}>{bmiCat.name}</span>
          </div>
          <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-400">
            <Smile className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 shadow-sm flex items-center justify-between col-span-1 transition-colors duration-200">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase block">Challenge Progression</span>
            <span className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white">{elapsedDays} / {totalDurationDays}</span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">{daysRemaining} days left</span>
          </div>
          <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-400">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-orange-500 dark:text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 shadow-sm flex items-center justify-between col-span-1 transition-colors duration-200">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase block">Streak</span>
            <span className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white">{currentStreak} <span className="text-xs text-neutral-400 font-normal">days</span></span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">Best: {longestStreak} days</span>
          </div>
          <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-400">
            <Flame className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Action & Mini Trackers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Toggle Today Done Card */}
        <div className="md:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-6 relative overflow-hidden transition-colors duration-200">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold rounded-lg uppercase">
                {todayWorkout.phaseName}
              </span>
              {isFastingDayToday && (
                <span className="px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-extrabold rounded-lg uppercase tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                  Fasting Day Active
                </span>
              )}
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {formatUIDate(todayStr)}
              </span>
            </div>
            
            <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              {todayWorkout.focus.toLowerCase().includes('rest') ? (
                <>🛌 {todayWorkout.focus}</>
              ) : (
                <>🏋️‍♂️ {todayWorkout.focus}</>
              )}
            </h3>

            {isFastingDayToday && !todayWorkout.focus.toLowerCase().includes('rest') && (
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/5 p-2.5 border border-orange-500/10 rounded-xl">
                ⚠️ Fasting advice: Gym volume should be kept light today. Recommend focused cardio, stretch recovery or low-volume core exercises instead of heavy lift maxes.
              </p>
            )}

            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {todayWorkout.focus.toLowerCase().includes('rest') 
                ? "Rest and recovery are vital today. Enjoy Sunday milestone check-in!"
                : `Assigned: ${todayWorkout.exercises.length} progressive volume exercises. Complete them and check them off in the calendar.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleToggleTodayDone}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl font-extrabold flex items-center justify-center gap-3 transition-all duration-200 shadow-sm ${
                todayLog.workoutDone
                  ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-600 scale-102 font-extrabold'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 border border-neutral-250 dark:border-neutral-700 text-neutral-600 dark:text-neutral-350'
              }`}
            >
              {todayLog.workoutDone ? (
                <>
                  <CheckCircle className="w-6 h-6 stroke-[2.5px]" />
                  <span>Today is Logged Done ✓</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 stroke-neutral-400" />
                  <span>Mark Today Logged Done</span>
                </>
              )}
            </button>
            <button
              onClick={() => onNavigate('calendar')}
              className="w-full sm:w-auto px-5 py-3 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100/40 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-800 hover:border-neutral-400 rounded-2xl font-bold transition flex items-center justify-center gap-2"
            >
              Log Daily Details
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Progress Trackers */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-md space-y-6 transition-colors duration-200">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight border-b border-neutral-200 dark:border-neutral-800 pb-3">Quick Logs</h3>
          
          {/* Protein Quick Summary */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">Protein Intake</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {proteinSoFar}g <span className="text-neutral-400 dark:text-neutral-500 font-normal">/ {proteinTarget}g</span>
              </span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (proteinSoFar / proteinTarget) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => onNavigate('diet')} 
                className="text-xs font-bold text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-355 transition"
              >
                + Quick-Add Meals
              </button>
            </div>
          </div>

          {/* Water Tracker (glasses vs Liters, e.g. 4 glasses = 1L) */}
          <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Water Logged</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {todayLog.water || 0} Glass <span className="text-xs text-neutral-400 font-normal">({((todayLog.water || 0) * 0.25).toFixed(2)}L / {profile.targetWater}L)</span>
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={() => adjustWater(-1)} 
                className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 flex items-center justify-center font-bold text-neutral-600 dark:text-neutral-300 active:scale-95 hover:border-neutral-400 transition shadow-sm"
              >
                -
              </button>
              <button 
                onClick={() => adjustWater(1)} 
                className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 active:scale-95 hover:bg-sky-500/20 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Cigarette Tracker */}
          <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <Cigarette className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <div>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Cigarettes</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {todayLog.cigarettes || 0} <span className="text-xs text-neutral-400 font-normal">/ max {profile.targetCigarettes}</span>
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={() => adjustCigarettes(-1)} 
                className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 flex items-center justify-center font-bold text-neutral-600 dark:text-neutral-300 active:scale-95 hover:border-neutral-400 transition shadow-sm"
              >
                -
              </button>
              <button 
                onClick={() => adjustCigarettes(1)} 
                className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-500 dark:text-orange-400 active:scale-95 hover:bg-orange-500/20 transition"
              >
                +
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Overtraining alert card */}
      {isOvertraining && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-5 shadow-sm flex items-start gap-4 transition-all">
          <div className="p-2.5 bg-red-500/20 text-red-500 dark:text-red-400 rounded-xl mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">Overtraining Warning ⚠️</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-350 leading-relaxed">
              You haven't logged any rest days in the last 10 days! Over-exerting yourself can lead to injury and hinder your cricket conditioning. Please schedule a recovery day or training off-day soon.
            </p>
          </div>
        </div>
      )}

      {/* Gamification Badges Section */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-md transition-colors duration-200">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight mb-4">Milestone Badges</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {badges.map((b) => (
            <div 
              key={b.id} 
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 transition ${
                b.unlocked 
                  ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600'
              }`}
            >
              <div className={`p-2.5 rounded-xl border ${
                b.unlocked 
                  ? 'bg-emerald-500/10 border-emerald-500/20' 
                  : 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'
              }`}>
                {b.icon}
              </div>
              <span className={`text-xs font-bold block ${b.unlocked ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-550'}`}>{b.title}</span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-500 block leading-tight">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
