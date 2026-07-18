import React, { useState, useEffect } from 'react';
import { 
  Award, User, Target, Calendar, Calculator, Sparkles, 
  ArrowRight, ArrowLeft, ShieldCheck, HelpCircle, Flame, Moon, Coffee, X,
  Activity, Heart, ChevronRight, CheckCircle2, RefreshCw, Compass
} from 'lucide-react';
import { 
  convertFeetInchesToCm, calculateBMR, calculateTDEE, 
  suggestGoalWeight, suggestCalorieTarget, suggestProteinTarget, 
  suggestWaterTarget, calculateBMI, getBMICategory 
} from '../utils/helpers';

// Inline self-contained animation styles
const ANIMATION_STYLES = `
@keyframes wizardFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-wizard-fade-in {
  animation: wizardFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes pulseScale {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.1); opacity: 1; }
}
.animate-pulse-scale {
  animation: pulseScale 2s infinite ease-in-out;
}
`;

export default function Onboarding({ onComplete }) {
  // Screen sequence: 
  // 1. Name, 2. Goal, 3. Age & Gender, 4. Height & Weight, 
  // 5. Country & Diet, 6. Duration & Time, 7. Medical & Activity, 
  // 8. Rest Days & Cigarettes, 9. Calculated Results, 10. Meal Structure
  const [screen, setScreen] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0); // 0: Quote, 1: Fact, 2: Progress, 3: Teaser
  const [progressPercent, setProgressPercent] = useState(0);
  const [generationError, setGenerationError] = useState('');

  // Info details (Step 1 questionnaire screens)
  const [info, setInfo] = useState({
    name: '',
    age: '25',
    gender: 'male',
    heightFeet: '5',
    heightInches: '9',
    startingWeight: '80',
    activityLevel: 'moderate',
    planDuration: '2', // months
    cigarettes: '5',
    country: 'India',
    dietType: 'vegetarian',
    workoutTimeAvailable: '1 hr',
    medicalConditions: [],
    primaryGoal: 'Weight Loss',
    preferredRestDays: ['Sunday']
  });

  // Calculated stats (Step 2 confirmation screens)
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

  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Meal slot setup (Step 3 meal screens)
  const [mealCount, setMealCount] = useState(3);
  const [mealsList, setMealsList] = useState([]);
  const [tempFoodInput, setTempFoodInput] = useState({});

  // Cycle the generation loading animations every 5 seconds
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setGenerationStep(prev => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Soft progress percentage simulator
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setProgressPercent(p => {
        if (p >= 99) return 99;
        return p + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Generate meal slots dynamically when meal count changes
  useEffect(() => {
    const count = parseInt(mealCount);
    let defaultLabels = [];
    if (count === 2) defaultLabels = ["Lunch", "Dinner"];
    else if (count === 3) defaultLabels = ["Breakfast", "Lunch", "Dinner"];
    else if (count === 4) defaultLabels = ["Breakfast", "Lunch", "Evening Snack", "Dinner"];
    else if (count === 5) defaultLabels = ["Breakfast", "Mid-Morning Snack", "Lunch", "Evening Snack", "Dinner"];
    else if (count === 6) defaultLabels = ["Early Morning", "Breakfast", "Mid-Morning Snack", "Lunch", "Evening Snack", "Dinner"];

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

  // Perform Calculations
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
    
    let suggestedCal = suggestCalorieTarget(tdee);
    let suggestedProt = suggestProteinTarget(suggestedGoal);

    if (info.primaryGoal === 'Muscle Gain') {
      suggestedCal = Math.round(tdee + 350);
      suggestedProt = Math.round(suggestedGoal * 2.0);
    } else if (info.primaryGoal === 'Body Recomposition') {
      suggestedCal = Math.round(tdee - 150);
      suggestedProt = Math.round(suggestedGoal * 1.9);
    } else if (info.primaryGoal === 'Weight Loss + Muscle Gain') {
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

  // Screen Validation
  const validateAndNext = () => {
    if (screen === 3) {
      const ageVal = parseInt(info.age);
      if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
        alert("Please enter a valid age between 1 and 120.");
        return;
      }
    }
    if (screen === 4) {
      const wVal = parseFloat(info.startingWeight);
      if (isNaN(wVal) || wVal <= 20 || wVal > 300) {
        alert("Please enter a valid starting weight between 20kg and 300kg.");
        return;
      }
    }
    
    if (screen === 8) {
      // Transitioning to Results screen (Screen 9): trigger AI summary call
      goToResultsScreen();
    } else {
      setScreen(prev => prev + 1);
    }
  };

  const goToResultsScreen = async () => {
    const nextGoals = runCalculations();
    setScreen(9);
    
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

  // Final submit handler
  const handleFinishSetup = async (e) => {
    if (e) e.preventDefault();
    
    setIsGenerating(true);
    setProgressPercent(10);
    setGenerationError('');
    
    const typicalMealsString = JSON.stringify(mealsList.map(m => ({
      label: m.label,
      time: m.time,
      foods: m.foods
    })));

    const payload = {
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
    };

    try {
      const activeToken = localStorage.getItem('fithabit_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
      };

      // TASK 1: Post profile configurations (instantly seeds local rule-based workouts)
      setProgressPercent(40);
      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!profileRes.ok) {
        const errData = await profileRes.json();
        throw new Error(errData.detail || "Failed to update profile statistics.");
      }

      // TASK 2: Trigger AI-Powered Diet Meal Plan generation in parallel / concurrent flow
      setProgressPercent(70);
      const dietRes = await fetch('/api/profile/generate-diet', {
        method: 'POST',
        headers
      });

      if (!dietRes.ok) {
        console.warn("AI Diet Plan generation had an error, proceeding with local profile updates.");
      }

      setProgressPercent(100);
      setTimeout(() => {
        onComplete(payload);
      }, 500);

    } catch (err) {
      console.error(err);
      setGenerationError(err.message || "An unexpected error occurred during setup. Please try again.");
      setIsGenerating(false);
    }
  };

  const getBmiPercentage = (bmi) => {
    const val = Math.max(15, Math.min(35, bmi));
    return ((val - 15) / (35 - 15)) * 100;
  };

  // Carousels data for generating screen
  const motivationalQuotes = [
    { text: "If you want something you've never had, you must be willing to do something you've never done.", author: "Daily Motivation" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "Consistency beats intensity every single time.", author: "Fitness Philosophy" },
    { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" }
  ];

  const fitnessFacts = [
    "Muscle is built during rest and sleep, not just during your workouts.",
    "Consuming protein within 24 hours of a training session optimizes recovery and protein synthesis.",
    "Drinking adequate water boosts metabolic rate and helps flush cellular waste.",
    "Progressive overload—gradually increasing weight or reps—is the key to continuous muscle growth."
  ];

  const currentProgressPercent = Math.round((screen / 10) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 py-12 transition-colors duration-200">
      <style>{ANIMATION_STYLES}</style>

      {/* DYNAMIC FULL SCREEN LOADING SCREEN */}
      {isGenerating ? (
        <div className="fixed inset-0 bg-neutral-900 text-white z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 animate-wizard-fade-in">
            
            {/* Spinning & Pulsing Glow Container */}
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 border-4 border-emerald-500/25 border-t-emerald-400 rounded-full animate-spin"></div>
              <div className="absolute w-16 h-16 bg-emerald-500/10 rounded-full blur-xl animate-pulse-scale"></div>
              <Compass className="absolute w-8 h-8 text-emerald-400 animate-pulse" />
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h3 className="text-xl font-black tracking-tight text-white">Assembling Your FitHabit Plan</h3>
              <p className="text-xs text-neutral-400">Please wait while we formulate workouts and diet goals...</p>
            </div>

            {/* Animation Content Slots (Rotates every 5 seconds) */}
            <div key={generationStep} className="bg-neutral-800 border border-neutral-800 rounded-2xl p-6 min-h-[140px] flex items-center justify-center text-sm shadow-xl animate-wizard-fade-in">
              {generationStep === 0 && (
                <div className="space-y-3">
                  <Flame className="w-6 h-6 text-orange-400 mx-auto" />
                  <p className="italic font-medium text-neutral-250">"{motivationalQuotes[0].text}"</p>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">— {motivationalQuotes[0].author}</span>
                </div>
              )}

              {generationStep === 1 && (
                <div className="space-y-2">
                  <Activity className="w-6 h-6 text-emerald-400 mx-auto animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider text-orange-400 font-bold block">Did you know?</span>
                  <p className="text-neutral-300 font-medium">{fitnessFacts[Math.floor(Math.random() * fitnessFacts.length)]}</p>
                </div>
              )}

              {generationStep === 2 && (
                <div className="space-y-3 w-full text-left text-xs text-neutral-300">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block text-center mb-1">Building Blocks Checklist</span>
                  <div className="space-y-2 max-w-xs mx-auto">
                    <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> BMI Metrics Calculated</div>
                    <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Custom Workout Split Seeded</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border border-neutral-600 rounded-full animate-pulse bg-emerald-500/10"></div> Personalizing Meal Layouts...</div>
                  </div>
                </div>
              )}

              {generationStep === 3 && (
                <div className="space-y-2.5">
                  <Heart className="w-6 h-6 text-red-400 mx-auto" />
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">Tailoring Personal Plan</span>
                  <p className="text-neutral-200 font-medium">
                    Building a plan for <strong className="text-white">{info.name || 'Challenger'}</strong>, optimized for {info.country} meals and a {info.workoutTimeAvailable} workout split.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-350"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-450 font-bold">
                <span>{progressPercent}% Complete</span>
                {progressPercent > 80 && <span className="animate-pulse">Finalizing setup...</span>}
              </div>
            </div>

            {/* Timeout helper */}
            {progressPercent === 99 && (
              <p className="text-[10px] text-neutral-500 animate-pulse">Almost there, thanks for your patience...</p>
            )}

          </div>
        </div>
      ) : (
        <div className="max-w-lg w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-y-auto max-h-[92vh] text-neutral-800 dark:text-neutral-100 transition-all">
          
          {/* Background decoration glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Progress bar and Navigation summary */}
          <div className="space-y-2 relative z-10">
            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              <span>Onboarding Wizard</span>
              <span>Screen {screen} of 10</span>
            </div>
            
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${currentProgressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* WIZARD SCREENS */}
          <div className="animate-wizard-fade-in relative z-10 min-h-[220px] flex flex-col justify-between">
            
            {/* Screen 1: Name Input */}
            {screen === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Let's start with your name</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Optional: Enter your name to personalize your dashboard</p>
                </div>
                <div className="relative pt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    autoFocus
                    placeholder="e.g. Varad"
                    value={info.name}
                    onChange={handleInfoChange}
                    className="block w-full pl-10 pr-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-sm"
                  />
                </div>
              </div>
            )}

            {/* Screen 2: Primary Goal */}
            {screen === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">What is your primary goal?</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">This helps configure daily calorie and protein multipliers</p>
                </div>
                <div className="space-y-2 pt-2">
                  {[
                    { val: "Weight Loss", label: "Weight Loss", desc: "Sustainable calorie deficit focus for fat reduction" },
                    { val: "Muscle Gain", label: "Muscle Gain", desc: "Hypertrophy calorie surplus focus to build size" },
                    { val: "Body Recomposition", label: "Body Recomposition (Lean & Tone)", desc: "Maintain weight, build muscle, and shed body fat" },
                    { val: "Weight Loss + Muscle Gain", label: "Weight Loss + Muscle Gain (Recomposition Focus)", desc: "Moderate calorie deficit combined with heavy compound lifts" },
                    { val: "General Fitness", label: "General Conditioning & Health", desc: "Energy focus, cardiorespiratory system fitness" }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setInfo({ ...info, primaryGoal: item.val })}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs font-semibold transition flex flex-col gap-0.5 ${
                        info.primaryGoal === item.val
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-350 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="font-extrabold text-sm">{item.label}</span>
                      <span className="text-[10px] text-neutral-450 dark:text-neutral-400">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Screen 3: Age & Gender */}
            {screen === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Tell us about yourself</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">We need these details to calculate accurate BMR targets</p>
                </div>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Your Age (years)</label>
                    <input
                      type="number"
                      name="age"
                      min="1"
                      max="120"
                      value={info.age}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">Gender</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['male', 'female'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setInfo({ ...info, gender: g })}
                          className={`py-3.5 rounded-2xl border text-sm font-bold transition capitalize ${
                            info.gender === g
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                              : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Screen 4: Height & Weight */}
            {screen === 4 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Height & Starting Weight</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Used for body mass index category calculations</p>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Height (Feet)</label>
                      <select
                        name="heightFeet"
                        value={info.heightFeet}
                        onChange={handleInfoChange}
                        className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                      >
                        {['3', '4', '5', '6', '7'].map(f => (
                          <option key={f} value={f}>{f} ft</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Height (Inches)</label>
                      <select
                        name="heightInches"
                        value={info.heightInches}
                        onChange={handleInfoChange}
                        className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                      >
                        {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map(i => (
                          <option key={i} value={i}>{i} in</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Current Weight (kg)</label>
                    <input
                      type="number"
                      name="startingWeight"
                      step="0.1"
                      value={info.startingWeight}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Screen 5: Country & Dietary Preference */}
            {screen === 5 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Region & Diet Preference</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Helps tailor localized meal plans and food item metrics</p>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Country / Region</label>
                    <select
                      name="country"
                      value={info.country}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    >
                      <option value="India">India (Indian Meals)</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Other">Other / Global</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Diet Type</label>
                    <select
                      name="dietType"
                      value={info.dietType}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    >
                      <option value="vegetarian">Vegetarian</option>
                      <option value="non-vegetarian">Non-Vegetarian</option>
                      <option value="eggetarian">Eggetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="jain">Jain Diet</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Screen 6: Plan Duration & Workout Time Available */}
            {screen === 6 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Duration & Workout Time</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Sets the length of your plan and workout volume parameters</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Plan Duration</label>
                    <select
                      name="planDuration"
                      value={info.planDuration}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    >
                      <option value="1">1 Month (4 Weeks)</option>
                      <option value="2">2 Months (8 Weeks)</option>
                      <option value="3">3 Months (12 Weeks)</option>
                      <option value="6">6 Months (24 Weeks)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Daily Available Workout Time</label>
                    <select
                      name="workoutTimeAvailable"
                      value={info.workoutTimeAvailable}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    >
                      <option value="30 min">30 min (Shorter split volume)</option>
                      <option value="1 hr">1 hr (Standard split volume)</option>
                      <option value="1.5 hr">1.5 hr (High split volume)</option>
                      <option value="2 hr">2 hr (Peak Conditioning volume)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Screen 7: Medical conditions & Activity level */}
            {screen === 7 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Health & Activity Details</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Helps protect joints and estimates calorie burns</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1.5">Medical Conditions (Check all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                      {medicalOptions.map(cond => {
                        const isSelected = info.medicalConditions.includes(cond);
                        return (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => {
                              const current = [...info.medicalConditions];
                              if (current.includes(cond)) {
                                setInfo({ ...info, medicalConditions: current.filter(c => c !== cond) });
                              } else {
                                setInfo({ ...info, medicalConditions: [...current, cond] });
                              }
                            }}
                            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-500'
                            }`}
                          >
                            {cond}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Activity Level</label>
                    <select
                      name="activityLevel"
                      value={info.activityLevel}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    >
                      <option value="sedentary">Sedentary (desk job)</option>
                      <option value="light">Lightly Active (active daily lifestyle)</option>
                      <option value="moderate">Moderately Active (exercises 3-5x/wk)</option>
                      <option value="very_active">Very Active (heavy workouts / cricket)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Screen 8: Preferred Rest Days & Cigarette counts */}
            {screen === 8 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Rest Days & Habit Reduction</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Configure rest days and cigarette reduction targets</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1.5">Workout Rest Day(s)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {daysOfWeek.map(day => {
                        const isRest = info.preferredRestDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const current = [...info.preferredRestDays];
                              if (current.includes(day)) {
                                setInfo({ ...info, preferredRestDays: current.filter(d => d !== day) });
                              } else {
                                setInfo({ ...info, preferredRestDays: [...current, day] });
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                              isRest
                                ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400'
                                : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-500'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Cigarettes Smoked / Day Currently</label>
                    <input
                      type="number"
                      name="cigarettes"
                      value={info.cigarettes}
                      onChange={handleInfoChange}
                      className="block w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded-2xl text-neutral-950 dark:text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Screen 9: Calculated results confirmation (Old Step 2) */}
            {screen === 9 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">Your Calculated Fitness Plan</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Review, recalculate, and modify any target values</p>
                </div>

                {/* BMI Gauge card */}
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">BMI Status Gauge</span>
                    <span className="font-black text-sm">{goals.bmi} ({goals.bmiCat})</span>
                  </div>
                  <div className="relative w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-visible mt-2">
                    <div className="absolute inset-y-0 left-0 w-[17.5%] bg-blue-400 rounded-l-full"></div>
                    <div className="absolute inset-y-0 left-[17.5%] w-[32.5%] bg-green-500"></div>
                    <div className="absolute inset-y-0 left-[50%] w-[25%] bg-yellow-500"></div>
                    <div className="absolute inset-y-0 left-[75%] w-[25%] bg-red-500 rounded-r-full"></div>
                    {/* Gauge marker */}
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

                {/* BMR / TDEE Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-50 dark:bg-neutral-800/45 p-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-center">
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-extrabold">Basal Metabolic Rate</span>
                    <span className="text-lg font-black text-neutral-900 dark:text-white block mt-1">{goals.bmr} kcal</span>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/45 p-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-center">
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-extrabold">Daily Active Burn (TDEE)</span>
                    <span className="text-lg font-black text-neutral-900 dark:text-white block mt-1">{goals.tdee} kcal</span>
                  </div>
                </div>

                {/* Intermittent Fasting Setup */}
                <div className="bg-neutral-50 dark:bg-neutral-800/45 p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Intermittent Fasting</span>
                      <span className="text-xs text-neutral-500">Include fasting restriction days?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGoals(prev => ({ ...prev, includeFasting: !prev.includeFasting }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        goals.includeFasting
                          ? 'bg-emerald-500 border-emerald-500 text-neutral-950 font-black'
                          : 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {goals.includeFasting ? 'Fasting: Yes' : 'Fasting: No'}
                    </button>
                  </div>

                  {goals.includeFasting && (
                    <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 animate-wizard-fade-in">
                      <span className="text-[10px] text-neutral-450 uppercase font-bold block">Select Fast Days:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {daysOfWeek.map(day => {
                          const isSelected = goals.fastingDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const current = [...goals.fastingDays];
                                if (current.includes(day)) {
                                  setGoals({ ...goals, fastingDays: current.filter(d => d !== day) });
                                } else {
                                  setGoals({ ...goals, fastingDays: [...current, day] });
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                                  : 'bg-white dark:bg-neutral-900 border-neutral-200'
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

                {/* Target Confirmation Form */}
                <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-800/45 p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  <div>
                    <label className="text-[9px] font-bold text-neutral-450 uppercase block mb-1">Goal Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="goalWeight"
                      value={goals.goalWeight}
                      onChange={handleGoalChange}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-755 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-450 uppercase block mb-1">Calorie Target (kcal)</label>
                    <input
                      type="number"
                      name="targetCalories"
                      value={goals.targetCalories}
                      onChange={handleGoalChange}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-755 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-450 uppercase block mb-1">Protein Target (g)</label>
                    <input
                      type="number"
                      name="targetProtein"
                      value={goals.targetProtein}
                      onChange={handleGoalChange}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-755 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-450 uppercase block mb-1">Water Target (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="targetWater"
                      value={goals.targetWater}
                      onChange={handleGoalChange}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-755 rounded-xl text-xs text-neutral-950 dark:text-white text-center focus:outline-none"
                    />
                  </div>
                </div>

                {/* FitHabit AI Recommendation Summary */}
                <div className="bg-emerald-500/5 dark:bg-emerald-500/[0.02] border border-emerald-500/20 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    Coach's AI Recommendation Summary
                  </span>
                  {isLoadingSummary ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-neutral-400 dark:text-neutral-550">
                      <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                      Generating summary description...
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-700 dark:text-neutral-350 leading-relaxed font-sans select-text">
                      {aiSummary || "Calculations completed based on your profile inputs."}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ERROR DISPLAY */}
            {generationError && (
              <p className="text-xs text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20 font-semibold mb-3">
                {generationError}
              </p>
            )}

            {/* NAVIGATION BUTTONS */}
            <div className="flex gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800 mt-4">
              {screen > 1 && (
                <button
                  type="button"
                  onClick={() => setScreen(prev => prev - 1)}
                  className="flex-1 py-3 bg-neutral-150 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs md:text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}
              
              {screen < 9 ? (
                <button
                  type="button"
                  onClick={validateAndNext}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-neutral-950 font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 text-xs md:text-sm shadow-md"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishSetup}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-neutral-950 font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 text-xs md:text-sm shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Finish Setup</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const medicalOptions = ["Diabetes", "Thyroid", "High BP", "Joint/knee issues", "None"];
