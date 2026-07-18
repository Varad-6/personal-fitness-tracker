import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Check, X, Plus, Trash2, 
  Clock, Dumbbell, Coffee, Flame, Moon, PenLine, Sparkles, BookOpen, RefreshCw 
} from 'lucide-react';
import { 
  getLocalDateString, formatUIDate, getWorkoutForDate, getPlanDayAndPhase 
} from '../utils/helpers';
import { dietReference } from '../data/dietReference';
import Timer from './Timer';

export default function CalendarView({ 
  profile, 
  dailyLogs, 
  onUpdateDailyLog, 
  workoutPlan 
}) {
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Local state for adding a custom meal
  const [mealName, setMealName] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [mealCalories, setMealCalories] = useState('');

  // AI Food Parser local state
  const [foodQuery, setFoodQuery] = useState('');
  const [isParsingFood, setIsParsingFood] = useState(false);
  const [parsedFoodResult, setParsedFoodResult] = useState(null);

  // Selected date log
  const log = dailyLogs[selectedDate] || {
    workoutDone: false,
    exercisesCompleted: {},
    proteinLog: [],
    caloriesQuick: '',
    water: 0,
    cigarettes: 0,
    sleep: '',
    notes: '',
    isFastDay: false,
    foodLog: []
  };

  // Workout details for selected date
  const workout = getWorkoutForDate(selectedDate, profile.startDate, workoutPlan);
  const isRestDay = workout.focus.toLowerCase().includes('rest');

  // Intermittent Fasting check
  const isFastingDaySelected = profile.fastingDays?.includes(workout.weekday) || log.isFastDay;

  // Adjusted targets on Fasting Days (lower target by 25%)
  const calorieTarget = isFastingDaySelected ? Math.round(profile.targetCalories * 0.75) : profile.targetCalories;
  const proteinTarget = isFastingDaySelected ? Math.round(profile.targetProtein * 0.75) : profile.targetProtein;

  // Handle month changes
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Build calendar days
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekDay = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const days = [];

    // Preceding empty cells
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        dateStr: getLocalDateString(date),
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false
      });
    }

    // Current month cells
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({
        dateStr: getLocalDateString(date),
        dayNum: i,
        isCurrentMonth: true
      });
    }

    // Succeeding cells to fill grid (multiple of 7)
    const totalGridCells = Math.ceil(days.length / 7) * 7;
    const nextDaysNeeded = totalGridCells - days.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        dateStr: getLocalDateString(date),
        dayNum: i,
        isCurrentMonth: false
      });
    }

    return days;
  };

  const calendarDays = getCalendarDays();

  // Helper: update property of selected day log
  const updateLogProperty = (key, value) => {
    onUpdateDailyLog(selectedDate, {
      ...log,
      [key]: value,
      isFastDay: isFastingDaySelected
    });
  };

  // Toggle single exercise checkmark
  const handleToggleExercise = (exId) => {
    const currentCompleted = { ...(log.exercisesCompleted || {}) };
    if (currentCompleted[exId]) {
      delete currentCompleted[exId];
    } else {
      currentCompleted[exId] = true;
    }
    updateLogProperty('exercisesCompleted', currentCompleted);
  };

  // Add a protein meal
  const addMeal = (name, protein, calories) => {
    if (!name.trim() || !protein) return;
    
    const pVal = parseInt(protein) || 0;
    const cVal = parseInt(calories) || 0;

    const newMeal = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }),
      name: name,
      protein: pVal,
      calories: cVal
    };

    const nextProteinLog = [...(log.proteinLog || []), newMeal];
    const nextCalories = (parseInt(log.caloriesQuick) || 0) + cVal;

    onUpdateDailyLog(selectedDate, {
      ...log,
      proteinLog: nextProteinLog,
      caloriesQuick: nextCalories,
      isFastDay: isFastingDaySelected
    });

    // Reset inputs
    setMealName('');
    setMealProtein('');
    setMealCalories('');
  };

  // Delete a protein meal
  const deleteMeal = (mealId) => {
    const mealToDelete = log.proteinLog?.find(m => m.id === mealId);
    const nextProteinLog = log.proteinLog?.filter(m => m.id !== mealId) || [];
    
    let nextCalories = parseInt(log.caloriesQuick) || 0;
    if (mealToDelete && mealToDelete.calories) {
      nextCalories = Math.max(0, nextCalories - mealToDelete.calories);
    }

    onUpdateDailyLog(selectedDate, {
      ...log,
      proteinLog: nextProteinLog,
      caloriesQuick: nextCalories,
      isFastDay: isFastingDaySelected
    });
  };

  const handleParseFood = async (e) => {
    e.preventDefault();
    if (!foodQuery.trim()) return;
    setIsParsingFood(true);
    try {
      const activeToken = localStorage.getItem('fithabit_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
      };
      const res = await fetch('/api/diet/parse-food', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: foodQuery })
      });
      if (!res.ok) throw new Error("Failed to parse food");
      const data = await res.json();
      setParsedFoodResult(data);
    } catch (err) {
      console.error(err);
      alert("AI food lookup failed: " + err.message);
    } finally {
      setIsParsingFood(false);
    }
  };

  const handleAddAllParsedFoods = () => {
    if (!parsedFoodResult || !parsedFoodResult.items) return;
    
    let nextProteinLog = [...(log.proteinLog || [])];
    let nextFoodLog = [...(log.foodLog || [])];
    let addedCal = 0;

    parsedFoodResult.items.forEach(item => {
      nextProteinLog.push({
        id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }),
        name: `${item.name} (${item.quantity})`,
        protein: parseFloat(item.protein) || 0,
        calories: parseInt(item.calories) || 0
      });
      nextFoodLog.push(item);
      addedCal += (parseInt(item.calories) || 0);
    });

    const nextCalories = (parseInt(log.caloriesQuick) || 0) + addedCal;

    onUpdateDailyLog(selectedDate, {
      ...log,
      proteinLog: nextProteinLog,
      caloriesQuick: nextCalories,
      foodLog: nextFoodLog,
      isFastDay: isFastingDaySelected
    });

    setParsedFoodResult(null);
    setFoodQuery('');
    alert("Added all items to today's macros!");
  };

  // Calculate day protein total
  const totalProtein = log.proteinLog?.reduce((sum, item) => sum + (item.protein || 0), 0) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* LEFT COLUMN: Month Calendar Grid */}
      <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-wide">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-1">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-350 transition active:scale-95 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-350 transition active:scale-95 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day) => {
            const dayLog = dailyLogs[day.dateStr];
            const isSelected = selectedDate === day.dateStr;
            const isToday = todayStr === day.dateStr;
            
            // Status Dot
            let statusMarkup = null;
            if (dayLog) {
              if (dayLog.workoutDone === true) {
                statusMarkup = <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 stroke-[3px]" />;
              } else if (dayLog.workoutDone === false && (dayLog.proteinLog?.length > 0 || dayLog.water > 0 || dayLog.cigarettes > 0)) {
                statusMarkup = <X className="w-3.5 h-3.5 text-red-500 stroke-[3px]" />;
              }
            }

            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`aspect-square p-1 rounded-2xl flex flex-col justify-between items-center transition-all relative border ${
                  day.isCurrentMonth ? 'text-neutral-900 dark:text-white' : 'text-neutral-300 dark:text-neutral-600'
                } ${
                  isSelected 
                    ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold scale-102 shadow-sm' 
                    : isToday
                      ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 font-semibold'
                      : 'bg-neutral-50/50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
                }`}
              >
                <span className="text-xs mt-1">{day.dayNum}</span>
                <div className="h-4 flex items-center justify-center mb-0.5">
                  {statusMarkup}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 items-center justify-center text-xs text-neutral-500 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-lg bg-neutral-100 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400 stroke-[3px]" />
            </div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-lg bg-neutral-100 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
              <X className="w-2.5 h-2.5 text-red-500 stroke-[3px]" />
            </div>
            <span>Missed / Incomplete</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Day Detail Entry */}
      <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
        
        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold rounded-lg uppercase">
                {workout.phaseName}
              </span>
              {isFastingDaySelected && (
                <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-extrabold rounded-lg uppercase tracking-wide">
                  Fasting Day Target
                </span>
              )}
              {selectedDate === todayStr && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white mt-1">
              {formatUIDate(selectedDate)}
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => updateLogProperty('workoutDone', true)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 ${
                log.workoutDone === true
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-250 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3px]" /> Done
            </button>
            <button
              onClick={() => updateLogProperty('workoutDone', false)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 ${
                log.workoutDone === false
                  ? 'bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-250 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <X className="w-4 h-4 stroke-[3px]" /> Missed
            </button>
          </div>
        </div>

        {/* Split Section: Checklist & rest timer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Exercises Checklist */}
          <div className="md:col-span-7 space-y-3">
            <h3 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-orange-500" />
              Workout: {workout.focus}
            </h3>

            {isFastingDaySelected && !isRestDay && (
              <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/5 p-2 border border-orange-500/10 rounded-xl leading-tight">
                ⚠️ Fasting warning: Keep training intensity low today. Consider lighter resistance or light cardio session.
              </p>
            )}

            {isRestDay ? (
              <div className="p-5 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-center space-y-2">
                <span className="text-3xl block">🛌</span>
                <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400 block">Rest & Recover</span>
                <p className="text-xs text-neutral-500">
                  Focus on recovery today. Complete Sunday Check-in milestones.
                </p>
              </div>
            ) : (
              <div className="space-y-2 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3">
                {workout.exercises.map((ex) => {
                  const isChecked = !!log.exercisesCompleted?.[ex.id];
                  return (
                    <button
                      key={ex.id}
                      onClick={() => handleToggleExercise(ex.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                        isChecked 
                          ? 'bg-emerald-500/5 border-emerald-500/30 text-neutral-800 dark:text-neutral-300' 
                          : 'bg-white dark:bg-neutral-900 border-neutral-250 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-emerald-500 border-emerald-500 text-neutral-950' 
                            : 'border-neutral-300 dark:border-neutral-700'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px] animate-checkmark" />}
                        </div>
                        <div>
                          <span className={`text-sm font-semibold block ${isChecked ? 'line-through text-neutral-400 dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-200'}`}>
                            {ex.name}
                          </span>
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block">
                            {ex.muscleGroup}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="font-bold text-neutral-600 dark:text-neutral-350 block">{ex.sets} Sets</span>
                        <span className="text-neutral-400 dark:text-neutral-500 block">{ex.reps} Reps</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rest Timer Widget */}
          <div className="md:col-span-5">
            {!isRestDay && <Timer />}
          </div>
        </div>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        {/* Diet / Protein Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Coffee className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Protein Log ({totalProtein}g / {proteinTarget}g)
            </h3>
          </div>

          {/* Meal List */}
          <div className="space-y-2">
            {log.proteinLog && log.proteinLog.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                {log.proteinLog.map((meal) => (
                  <div 
                    key={meal.id} 
                    className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl text-sm"
                  >
                    <div>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">{meal.name}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">{meal.time} • {meal.calories || 0} kcal</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{meal.protein}g</span>
                      <button 
                        onClick={() => deleteMeal(meal.id)}
                        className="text-neutral-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-550 italic bg-neutral-50 dark:bg-neutral-950/20 py-3 rounded-xl text-center">
                No protein sources logged for this day. Use quick add or manual form below.
              </p>
            )}
          </div>

          {/* Quick-Add Buttons */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Quick Add Protein</span>
            <div className="flex flex-wrap gap-1.5">
              {dietReference.quickAddSources.slice(0, 5).map((source) => (
                <button
                  key={source.id}
                  onClick={() => addMeal(source.name, source.protein, source.calories)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition active:scale-95 flex items-center gap-1.5 shadow-sm"
                >
                  <span>{source.icon}</span>
                  <span>{source.protein}g</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Natural Language Food Logger */}
          <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                AI Smart Food Logger & Parsing
              </span>
              <span className="text-[9px] text-neutral-400 dark:text-neutral-550">
                Powered by FitHabit AI
              </span>
            </div>
            
            <form onSubmit={handleParseFood} className="flex gap-2">
              <input
                type="text"
                placeholder="Type e.g. '2 chapati, 1 bowl bhaji, curd'"
                value={foodQuery}
                onChange={(e) => setFoodQuery(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
              />
              <button
                type="submit"
                disabled={isParsingFood || !foodQuery.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 active:scale-95 shadow-md shrink-0"
              >
                {isParsingFood ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Log
              </button>
            </form>

            {parsedFoodResult && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 space-y-3 mt-2 animate-fade-in">
                <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Estimated Nutrition Details</span>
                  <div className="flex gap-2 text-[10px] font-bold">
                    <span className="text-orange-500">{parsedFoodResult.totalCalories} kcal</span>
                    <span className="text-emerald-500">{parsedFoodResult.totalProtein}g Protein</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {parsedFoodResult.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{item.name}</span>
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500 block">Qty: {item.quantity} • Carbs: {item.carbs}g • Fat: {item.fat}g</span>
                      </div>
                      <span className="font-bold text-neutral-600 dark:text-neutral-300">+{item.protein}g</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddAllParsedFoods}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition active:scale-95 shadow-md"
                >
                  Confirm & Add to Journal
                </button>
              </div>
            )}
          </div>

          {/* Manual Entry Form */}
          <div className="flex flex-col sm:flex-row gap-2 bg-neutral-50 dark:bg-neutral-950/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <input
              type="text"
              placeholder="Meal description (e.g. Curd & Oats)"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="number"
                placeholder="Protein (g)"
                value={mealProtein}
                onChange={(e) => setMealProtein(e.target.value)}
                className="w-20 px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none text-center"
              />
              <input
                type="number"
                placeholder="Calories"
                value={mealCalories}
                onChange={(e) => setMealCalories(e.target.value)}
                className="w-20 px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none text-center"
              />
              <button
                onClick={() => addMeal(mealName, mealProtein, mealCalories)}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        {/* Other stats inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Calories (kcal) / target {calorieTarget}
            </label>
            <input
              type="number"
              value={log.caloriesQuick || ''}
              onChange={(e) => updateLogProperty('caloriesQuick', e.target.value ? parseInt(e.target.value) : '')}
              placeholder={`e.g. ${calorieTarget}`}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 text-indigo-550 dark:text-indigo-400" /> Sleep (hrs)
            </label>
            <input
              type="number"
              step="0.5"
              value={log.sleep || ''}
              onChange={(e) => updateLogProperty('sleep', e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="e.g. 7.5"
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Water (glasses)
            </label>
            <div className="flex bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => updateLogProperty('water', Math.max(0, (log.water || 0) - 1))}
                className="flex-1 py-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition font-bold"
              >
                -
              </button>
              <span className="flex-1 py-2 text-center text-sm font-bold text-neutral-800 dark:text-white flex items-center justify-center">
                {log.water || 0}
              </span>
              <button 
                onClick={() => updateLogProperty('water', (log.water || 0) + 1)}
                className="flex-1 py-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Cigarettes
            </label>
            <div className="flex bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => updateLogProperty('cigarettes', Math.max(0, (log.cigarettes || 0) - 1))}
                className="flex-1 py-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition font-bold"
              >
                -
              </button>
              <span className="flex-1 py-2 text-center text-sm font-bold text-neutral-800 dark:text-white flex items-center justify-center">
                {log.cigarettes || 0}
              </span>
              <button 
                onClick={() => updateLogProperty('cigarettes', (log.cigarettes || 0) + 1)}
                className="flex-1 py-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Free Notes */}
        <div>
          <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <PenLine className="w-3.5 h-3.5 text-neutral-400" />
            Notes & Comments (Soreness, cricket conditioning, etc.)
          </label>
          <textarea
            rows="3"
            value={log.notes || ''}
            onChange={(e) => updateLogProperty('notes', e.target.value)}
            placeholder="e.g. Feeling good. Good conditioning during cricket practice."
            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
          ></textarea>
        </div>

      </div>
    </div>
  );
}
