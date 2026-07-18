import React, { useState, useEffect } from 'react';
import { 
  Award, User, Target, Calendar, Calculator, Sparkles, 
  ArrowRight, ArrowLeft, ShieldCheck, HelpCircle, Flame, Moon, Coffee, X 
} from 'lucide-react';
import { 
  convertFeetInchesToCm, calculateBMR, calculateTDEE, 
  suggestGoalWeight, suggestCalorieTarget, suggestProteinTarget, 
  suggestWaterTarget, calculateBMI, getBMICategory 
} from '../utils/helpers';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1); // 1: Biometrics & Preferences, 2: Calculated Results, 3: Meal Setup
  
  // Step 1: Raw Inputs + Extended Onboarding Choices
  const [info, setInfo] = useState({
    name: '',
    age: '25',
    gender: 'male',
    heightFeet: '5',
    heightInches: '9',
    startingWeight: '80',
    activityLevel: 'moderate',
    planDuration: '2', // in months
    cigarettes: '5',
    country: 'India',
    dietType: 'vegetarian',
    workoutTimeAvailable: '1 hr',
    medicalConditions: [],
    primaryGoal: 'Weight Loss',
    preferredRestDays: ['Sunday']
  });

  // Step 2: Calculated & Editable Goals
  const [goals, setGoals] = useState({
    heightCm: 175.3,
    bmi: 26.0,
    bmiCat: 'Overweight',
    bmr: 1730,
    tdee: 2680,
    goalWeight: 67.7,
    targetProtein: 122,
    targetCalories: 2080,
    targetWater: 2.8,
    targetCigarettes: 5,
    includeFasting: false,
    fastingDays: []
  });

  // Dynamic summary from Gemini
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Step 3: Meal Slots Builder
  const [mealCount, setMealCount] = useState(3);
  const [mealsList, setMealsList] = useState([]);
  const [tempFoodInput, setTempFoodInput] = useState({});

  // Initialize or rebuild meal slots dynamically when count changes
  useEffect(() => {
    const count = parseInt(mealCount);
    let defaultLabels = [];
    if (count === 2) defaultLabels = ["Lunch", "Dinner"];
    else if (count === 3) defaultLabels = ["Breakfast", "Lunch", "Dinner"];
    else if (count === 4) defaultLabels = ["Breakfast", "Lunch", "Evening Snack", "Dinner"];
    else if (count === 5) defaultLabels = ["Breakfast", "Mid-Morning Snack", "Lunch", "Evening Snack", "Dinner"];
    else if (count === 6) defaultLabels = ["Early Morning", "Breakfast", "Mid-Morning", "Lunch", "Evening Snack", "Dinner"];
    
    const nextMeals = defaultLabels.map((lbl, idx) => {
      const existing = mealsList[idx];
      return {
        id: idx,
        label: existing ? existing.label : lbl,
        time: existing ? existing.time : (idx === 0 ? "08:30" : idx === 1 ? "13:00" : idx === 2 ? "17:30" : "20:30"),
        foods: existing ? existing.foods : []
      };
    });
    setMealsList(nextMeals);
  }, [mealCount]);

  // Re-calculate math based on user inputs
  const runCalculations = () => {
    const feet = parseFloat(info.heightFeet) || 5;
    const inches = parseFloat(info.heightInches) || 0;
    const heightCm = convertFeetInchesToCm(feet, inches);
    
    const weight = parseFloat(info.startingWeight) || 70;
    const age = parseInt(info.age) || 25;
    const bmr = calculateBMR(weight, heightCm, age, info.gender);
    const tdee = calculateTDEE(bmr, info.activityLevel);
    
    const bmiVal = calculateBMI(weight, heightCm);
    const bmiCatObj = getBMICategory(bmiVal);
    
    const suggestedGoal = suggestGoalWeight(heightCm);
    
    // Scale suggested calories/protein based on Primary Goal:
    let suggestedCal = suggestCalorieTarget(tdee);
    let suggestedProt = suggestProteinTarget(suggestedGoal);

    if (info.primaryGoal === 'Muscle Gain') {
      suggestedCal = Math.round(tdee + 350);
      suggestedProt = Math.round(suggestedGoal * 2.0);
    } else if (info.primaryGoal === 'Body Recomposition') {
      suggestedCal = Math.round(tdee - 150);
      suggestedProt = Math.round(suggestedGoal * 1.9);
    } else if (info.primaryGoal === 'Weight Loss + Muscle Gain') {
      // Recomposition Focus: moderate deficit, high protein
      suggestedCal = Math.round(tdee - 350);
      suggestedProt = Math.round(suggestedGoal * 2.0);
    } else if (info.primaryGoal === 'General Fitness') {
      suggestedCal = Math.round(tdee);
    }

    const suggestedWat = suggestWaterTarget(weight);
    
    const nextGoals = {
      heightCm,
      bmi: parseFloat(bmiVal),
      bmiCat: bmiCatObj.name,
      bmr,
      tdee,
      goalWeight: suggestedGoal,
      targetProtein: suggestedProt,
      targetCalories: suggestedCal,
      targetWater: suggestedWat,
      targetCigarettes: parseInt(info.cigarettes) || 5,
      includeFasting: goals.includeFasting,
      fastingDays: goals.fastingDays
    };

    setGoals(nextGoals);
    return nextGoals;
  };

  useEffect(() => {
    runCalculations();
  }, [
    info.age, info.gender, info.heightFeet, info.heightInches, info.startingWeight, 
    info.activityLevel, info.cigarettes, info.primaryGoal
  ]);

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleGoalChange = (e) => {
    const { name, value } = e.target;
    setGoals(prev => ({
      ...prev,
      [name]: name.includes('target') || name === 'goalWeight' ? parseFloat(value) || 0 : value
    }));
  };

  const toggleMedicalCondition = (cond) => {
    const current = [...info.medicalConditions];
    if (current.includes(cond)) {
      setInfo(prev => ({ ...prev, medicalConditions: current.filter(c => c !== cond) }));
    } else {
      setInfo(prev => ({ ...prev, medicalConditions: [...current, cond] }));
    }
  };

  const toggleRestDay = (day) => {
    const current = [...info.preferredRestDays];
    if (current.includes(day)) {
      setInfo(prev => ({ ...prev, preferredRestDays: current.filter(d => d !== day) }));
    } else {
      setInfo(prev => ({ ...prev, preferredRestDays: [...current, day] }));
    }
  };

  const toggleFastingDay = (day) => {
    const current = [...goals.fastingDays];
    if (current.includes(day)) {
      setGoals(prev => ({ ...prev, fastingDays: current.filter(d => d !== day) }));
    } else {
      setGoals(prev => ({ ...prev, fastingDays: [...current, day] }));
    }
  };

  // Step transitions
  const goToStep2 = async () => {
    const nextGoals = runCalculations();
    setStep(2);
    
    // Fetch AI Summary from backend
    setIsLoadingSummary(true);
    setAiSummary('');
    try {
      const activeToken = localStorage.getItem('fithabit_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
      };
      const res = await fetch('/api/profile/onboarding-summary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: info.name || 'Challenger',
          age: parseInt(info.age),
          gender: info.gender,
          height_cm: nextGoals.heightCm,
          starting_weight: parseFloat(info.startingWeight),
          activity_level: info.activityLevel,
          plan_duration_months: parseInt(info.planDuration),
          goal_weight: nextGoals.goalWeight,
          target_protein: nextGoals.targetProtein,
          target_calories: nextGoals.targetCalories,
          target_cigarettes: nextGoals.targetCigarettes,
          country: info.country,
          diet_type: info.dietType,
          typical_meals: info.typicalMeals,
          workout_time_available: info.workoutTimeAvailable,
          medical_conditions: info.medicalConditions,
          primary_goal: info.primaryGoal,
          preferred_rest_days: info.preferredRestDays,
          fasting_days: nextGoals.includeFasting ? nextGoals.fastingDays : []
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Step 3 food tagging
  const handleAddFoodItem = (mealId) => {
    const text = tempFoodInput[mealId] || '';
    if (!text.trim()) return;

    if (info.dietType === 'vegetarian' || info.dietType === 'jain') {
      const lower = text.toLowerCase();
      if (lower.includes('chicken') || lower.includes('fish') || lower.includes('meat') || lower.includes('egg') || lower.includes('beef') || lower.includes('pork')) {
        alert(`Note: You selected a "${info.dietType}" diet. Please ensure you enter vegetarian food options.`);
      }
    }

    setMealsList(prev => prev.map(meal => {
      if (meal.id === mealId) {
        return { ...meal, foods: [...meal.foods, text.trim()] };
      }
      return meal;
    }));
    setTempFoodInput(prev => ({ ...prev, [mealId]: '' }));
  };

  const handleRemoveFoodItem = (mealId, foodIdx) => {
    setMealsList(prev => prev.map(meal => {
      if (meal.id === mealId) {
        return { ...meal, foods: meal.foods.filter((_, idx) => idx !== foodIdx) };
      }
      return meal;
    }));
  };

  const handleFinishSetup = (e) => {
    e.preventDefault();
    
    // Package Step 3 meals pattern as a clean JSON layout inside typical_meals
    const typicalMealsString = JSON.stringify(mealsList.map(m => ({
      label: m.label,
      time: m.time,
      foods: m.foods
    })));

    onComplete({
      name: info.name || 'Challenger',
      age: parseInt(info.age),
      gender: info.gender,
      height_cm: goals.heightCm,
      starting_weight: parseFloat(info.startingWeight),
      activity_level: info.activityLevel,
      plan_duration_months: parseInt(info.planDuration),
      goal_weight: goals.goalWeight,
      target_protein: goals.targetProtein,
      target_calories: goals.targetCalories,
      target_cigarettes: goals.targetCigarettes,
      start_date: new Date().toISOString().split('T')[0],
      fasting_days: goals.includeFasting ? goals.fastingDays : [],
      country: info.country,
      diet_type: info.dietType,
      typical_meals: typicalMealsString,
      workout_time_available: info.workoutTimeAvailable,
      medical_conditions: info.medicalConditions,
      primary_goal: info.primaryGoal,
      preferred_rest_days: info.preferredRestDays
    });
  };

  const getBmiPercentage = (bmi) => {
    const val = Math.max(15, Math.min(35, bmi));
    return ((val - 15) / (35 - 15)) * 100;
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const medicalOptions = ["Diabetes", "Thyroid", "High BP", "Joint/knee issues", "None"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 py-12 transition-colors duration-200">
      <div className="max-w-2xl w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-y-auto max-h-[92vh]">
        
        {/* Glow Details */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center space-y-1 relative z-10">
          <div className="inline-flex p-3 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-500 dark:text-emerald-400 mb-2">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-sans">Setup Your FitHabit Plan</h2>
          <p className="text-xs md:text-sm text-neutral-505 dark:text-neutral-400">
            Step {step} of 3: {step === 1 ? 'Biometrics & Goal' : step === 2 ? 'Calculated Targets' : 'Your Meal Rhythm'}
          </p>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* STEP 1: Biometrics & Preferences */}
        {step === 1 && (
          <div className="space-y-4 relative z-10 text-xs md:text-sm">
            
            {/* Row 1: Name and Primary Goal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Your Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Varad"
                    value={info.name}
                    onChange={handleInfoChange}
                    className="block w-full pl-10 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Primary Fitness Goal
                </label>
                <select
                  name="primaryGoal"
                  value={info.primaryGoal}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                >
                  <option value="Weight Loss">Weight Loss (Deficit focus)</option>
                  <option value="Muscle Gain">Muscle Gain (Hypertrophy Surplus)</option>
                  <option value="Body Recomposition">Body Recomposition (Lean & Tone)</option>
                  <option value="Weight Loss + Muscle Gain">Weight Loss + Muscle Gain (Recomposition Focus)</option>
                  <option value="General Fitness">General Conditioning & Health</option>
                </select>
              </div>
            </div>

            {/* Row 2: Age, Gender, Plan Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Age (years)
                </label>
                <input
                  type="number"
                  name="age"
                  min="1"
                  value={info.age}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Plan Duration
                </label>
                <select
                  name="planDuration"
                  value={info.planDuration}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                >
                  <option value="1">1 Month (4 Weeks)</option>
                  <option value="2">2 Months (8 Weeks)</option>
                  <option value="3">3 Months (12 Weeks)</option>
                  <option value="6">6 Months (24 Weeks)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['male', 'female'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setInfo({ ...info, gender: g })}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition capitalize ${
                        info.gender === g
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-250 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Height & Weight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Height (Feet)
                </label>
                <select
                  name="heightFeet"
                  value={info.heightFeet}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                >
                  {['3', '4', '5', '6', '7'].map(f => (
                    <option key={f} value={f}>{f} ft</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Height (Inches)
                </label>
                <select
                  name="heightInches"
                  value={info.heightInches}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                >
                  {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map(i => (
                    <option key={i} value={i}>{i} in</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="startingWeight"
                  step="0.1"
                  value={info.startingWeight}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            {/* Row 4: Country, Diet Type, Workout time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Country / Region
                </label>
                <select
                  name="country"
                  value={info.country}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                >
                  <option value="India">India (Indian Meals)</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Other">Other / Global</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Dietary Preference
                </label>
                <select
                  name="dietType"
                  value={info.dietType}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                >
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non-vegetarian">Non-Vegetarian</option>
                  <option value="eggetarian">Eggetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="jain">Jain Diet</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Workout Time Available
                </label>
                <select
                  name="workoutTimeAvailable"
                  value={info.workoutTimeAvailable}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                >
                  <option value="30 min">30 min (Shorter volume)</option>
                  <option value="1 hr">1 hr (Standard split)</option>
                  <option value="1.5 hr">1.5 hr (High volume)</option>
                  <option value="2 hr">2 hr (Peak Conditioning)</option>
                </select>
              </div>
            </div>

            {/* Medical Conditions */}
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Medical Conditions (Safe Exercise Flags)</span>
              <div className="flex flex-wrap gap-2">
                {medicalOptions.map(cond => {
                  const isSelected = info.medicalConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleMedicalCondition(cond)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 dark:text-emerald-400 font-extrabold'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-505'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred rest days selection */}
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Preferred Workout Rest Day(s)</span>
              <div className="flex flex-wrap gap-1.5">
                {daysOfWeek.map(day => {
                  const isRest = info.preferredRestDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleRestDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        isRest
                          ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-505'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 6: Activity level & Cigarettes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Activity Level
                </label>
                <select
                  name="activityLevel"
                  value={info.activityLevel}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                >
                  <option value="sedentary">Sedentary (desk work)</option>
                  <option value="light">Lightly Active (active lifestyle)</option>
                  <option value="moderate">Moderately Active (gym 3-5x/wk)</option>
                  <option value="very_active">Very Active (gym/cricket daily)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Cigarettes Smoked / Day (optional goal)
                </label>
                <input
                  type="number"
                  name="cigarettes"
                  value={info.cigarettes}
                  onChange={handleInfoChange}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none transition"
                />
              </div>
            </div>

            <button
              onClick={goToStep2}
              className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-neutral-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Continue to Calculated Plan
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Calculated Plan & Diagnostic Results */}
        {step === 2 && (
          <div className="space-y-6 relative z-10 text-xs md:text-sm">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block text-center">Step 2: Calculated Plan Results</span>
            
            {/* Visual BMI Gauge card */}
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">BMI Status Indicator</span>
                <span className="font-extrabold text-sm">{goals.bmi} ({goals.bmiCat})</span>
              </div>
              <div className="relative w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-visible mt-2">
                <div className="absolute inset-y-0 left-0 w-[17.5%] bg-blue-400 rounded-l-full"></div>
                <div className="absolute inset-y-0 left-[17.5%] w-[32.5%] bg-green-500"></div>
                <div className="absolute inset-y-0 left-[50%] w-[25%] bg-yellow-500"></div>
                <div className="absolute inset-y-0 left-[75%] w-[25%] bg-red-500 rounded-r-full"></div>
                {/* Marker */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-neutral-900 border-2 border-emerald-500 rounded-full shadow-md z-10 transition-all duration-500"
                  style={{ left: `${getBmiPercentage(goals.bmi)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[9px] text-neutral-400 dark:text-neutral-500 mt-1 font-semibold">
                <span>Underweight (&lt;18.5)</span>
                <span>Normal (18.5-25)</span>
                <span>Overweight (25-30)</span>
                <span>Obese (&gt;30)</span>
              </div>
            </div>

            {/* Calculations Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-950/40 p-3 border border-neutral-200 dark:border-neutral-850 rounded-2xl text-center">
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-bold">Basal Metabolic Rate (BMR)</span>
                <span className="text-xl font-extrabold text-neutral-900 dark:text-white block mt-1">{goals.bmr} kcal</span>
                <span className="text-[8px] text-neutral-500 block mt-0.5">Energy at total rest</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-950/40 p-3 border border-neutral-200 dark:border-neutral-850 rounded-2xl text-center">
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-bold">Daily Active Energy (TDEE)</span>
                <span className="text-xl font-extrabold text-neutral-900 dark:text-white block mt-1">{goals.tdee} kcal</span>
                <span className="text-[8px] text-neutral-500 block mt-0.5">Total energy burn</span>
              </div>
            </div>

            {/* Fasting Setup inside Step 2 */}
            <div className="space-y-3 bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Intermittent Fasting</span>
                  <span className="text-xs text-neutral-500">Include calorie-restriction days?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGoals(prev => ({ ...prev, includeFasting: !prev.includeFasting }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    goals.includeFasting
                      ? 'bg-emerald-500 border-emerald-500 text-neutral-950 font-bold'
                      : 'bg-neutral-200 dark:bg-neutral-850 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {goals.includeFasting ? 'Fasting Enabled ✓' : 'Fasting Disabled ✗'}
                </button>
              </div>

              {goals.includeFasting && (
                <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Pick fasting days:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {daysOfWeek.map(day => {
                      const isSelected = goals.fastingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleFastingDay(day)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 dark:text-emerald-400 font-extrabold'
                              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Editable Confirmation Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Goal Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  name="goalWeight"
                  value={goals.goalWeight}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Calorie Target (kcal)</label>
                <input
                  type="number"
                  name="targetCalories"
                  value={goals.targetCalories}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Protein Target (g)</label>
                <input
                  type="number"
                  name="targetProtein"
                  value={goals.targetProtein}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Water Target (Liters)</label>
                <input
                  type="number"
                  step="0.1"
                  name="targetWater"
                  value={goals.targetWater}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">Cigarettes Max Limit</label>
                <input
                  type="number"
                  name="targetCigarettes"
                  value={goals.targetCigarettes}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                />
              </div>
            </div>

            {/* AI Generated Plan Description */}
            <div className="bg-emerald-500/5 dark:bg-emerald-500/[0.02] border border-emerald-500/20 rounded-2xl p-4 space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                Coach's AI Recommendation Summary
              </span>
              {isLoadingSummary ? (
                <div className="flex items-center gap-2 py-3 text-xs text-neutral-400 dark:text-neutral-550">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  Generating plan summary...
                </div>
              ) : (
                <p className="text-xs text-neutral-700 dark:text-neutral-350 leading-relaxed font-sans select-text">
                  {aiSummary || "Reviewing calculations based on your targets..."}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrevStep}
                className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 animate-pulse"
              >
                Configure Meal slots <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Meal setup slots builder */}
        {step === 3 && (
          <form onSubmit={handleFinishSetup} className="space-y-5 relative z-10 text-xs md:text-sm">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block text-center">Step 3: Meal Structure & Habits</span>
            
            {/* Diet Type Reminder Banner */}
            <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-550/20 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Diet Selection: <strong className="capitalize">{info.dietType}</strong></span>
              <span className="text-[10px] text-neutral-500">Filters warnings automatically</span>
            </div>

            {/* Meal Count selector */}
            <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">How many times do you eat daily?</span>
                <span className="text-[10px] text-neutral-400">Creates custom meal planning tags</span>
              </div>
              <select
                value={mealCount}
                onChange={(e) => setMealCount(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none"
              >
                {[2, 3, 4, 5, 6].map(c => (
                  <option key={c} value={c}>{c} Meals</option>
                ))}
              </select>
            </div>

            {/* Dynamic Meal Slot Cards */}
            <div className="space-y-3.5 max-h-[35vh] overflow-y-auto pr-1">
              {mealsList.map((meal) => (
                <div key={meal.id} className="bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl space-y-3 relative">
                  
                  {/* Meal label & Time picker */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-between sm:items-center">
                    <input
                      type="text"
                      value={meal.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMealsList(prev => prev.map(m => m.id === meal.id ? { ...m, label: val } : m));
                      }}
                      className="font-bold text-neutral-900 dark:text-white bg-transparent border-b border-dashed border-neutral-300 focus:border-emerald-500 focus:outline-none text-xs"
                    />
                    <input
                      type="time"
                      value={meal.time}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMealsList(prev => prev.map(m => m.id === meal.id ? { ...m, time: val } : m));
                      }}
                      className="px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-lg text-[10px] focus:outline-none"
                    />
                  </div>

                  {/* Tag Chips list */}
                  <div className="flex flex-wrap gap-1">
                    {meal.foods.length > 0 ? (
                      meal.foods.map((food, foodIdx) => (
                        <span 
                          key={foodIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-300 font-bold rounded-lg"
                        >
                          {food}
                          <button
                            type="button"
                            onClick={() => handleRemoveFoodItem(meal.id, foodIdx)}
                            className="text-neutral-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-neutral-400 italic">No food items added yet</span>
                    )}
                  </div>

                  {/* Add Food Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 2 eggs, sabzi, curd"
                      value={tempFoodInput[meal.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTempFoodInput(prev => ({ ...prev, [meal.id]: val }));
                      }}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs focus:outline-none placeholder-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddFoodItem(meal.id)}
                      className="px-3 bg-emerald-500 hover:bg-emerald-650 text-neutral-950 font-bold rounded-xl text-xs active:scale-95 transition"
                    >
                      + Add
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5 stroke-[2.5px]" />
                Finish Setup!
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
