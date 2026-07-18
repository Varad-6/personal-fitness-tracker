import React, { useState, useEffect } from 'react';
import { 
  Award, User, Target, Calendar, Calculator, Sparkles, 
  ArrowRight, ArrowLeft, ShieldCheck, HelpCircle, Flame, Moon, Coffee 
} from 'lucide-react';
import { 
  convertFeetInchesToCm, calculateBMR, calculateTDEE, 
  suggestGoalWeight, suggestCalorieTarget, suggestProteinTarget, 
  suggestWaterTarget, calculateBMI, getBMICategory 
} from '../utils/helpers';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1); // 1: Biometrics & Preferences, 2: Auto-results/Fasting, 3: Confirm Targets
  
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
    typicalMeals: '',
    workoutTimeAvailable: '1 hr',
    medicalConditions: [], // e.g. ["Diabetes", "Joint/knee issues"]
    primaryGoal: 'Weight Loss',
    preferredRestDays: ['Sunday'] // Mon-Sun rest day picker
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
    
    // Scale suggested calories based on Primary Goal:
    // deficit for Weight Loss, surplus for Muscle Gain, maintenance/slight deficit for recomposition
    let suggestedCal = suggestCalorieTarget(tdee);
    if (info.primaryGoal === 'Muscle Gain') {
      suggestedCal = Math.round(tdee + 350);
    } else if (info.primaryGoal === 'Body Recomposition') {
      suggestedCal = Math.round(tdee - 200);
    } else if (info.primaryGoal === 'General Fitness') {
      suggestedCal = Math.round(tdee);
    }

    const suggestedProt = suggestProteinTarget(suggestedGoal);
    const suggestedWat = suggestWaterTarget(weight);
    
    setGoals({
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
    });
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

  // Toggle checklist values (medical conditions)
  const toggleMedicalCondition = (cond) => {
    const current = [...info.medicalConditions];
    if (current.includes(cond)) {
      setInfo(prev => ({ ...prev, medicalConditions: current.filter(c => c !== cond) }));
    } else {
      setInfo(prev => ({ ...prev, medicalConditions: [...current, cond] }));
    }
  };

  // Toggle preferred rest days
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

  const handleNextStep = () => {
    runCalculations();
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
      typical_meals: info.typicalMeals,
      workout_time_available: info.workoutTimeAvailable,
      medical_conditions: info.medicalConditions,
      primary_goal: info.primaryGoal,
      preferred_rest_days: info.preferredRestDays
    });
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const medicalOptions = ["Diabetes", "Thyroid", "High BP", "Joint/knee issues", "None"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 py-12 transition-colors duration-200">
      <div className="max-w-2xl w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-y-auto max-h-[90vh]">
        
        {/* Glow Details */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center space-y-1 relative z-10">
          <div className="inline-flex p-3 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-500 dark:text-emerald-400 mb-2">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-sans">Autogenerate Your FitHabit Plan</h2>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400">
            Step {step} of 3: {step === 1 ? 'Biometrics & Preferences' : step === 2 ? 'Calculated Diagnostics' : 'Confirm Targets'}
          </p>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* STEP 1: Onboarding and Custom Preferences */}
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
                  <option value="Weight Loss">Weight Loss (Fat Deficit)</option>
                  <option value="Muscle Gain">Muscle Gain (Hypertrophy Surplus)</option>
                  <option value="Body Recomposition">Body Recomposition (Lean & Tone)</option>
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
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
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

            {/* Row 5: Typical Meals description */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                Typical Daily Meals (seeds AI food suggestions)
              </label>
              <textarea
                name="typicalMeals"
                placeholder="e.g. Breakfast: Poha & milk. Lunch: 2 chapati & green veggies. Dinner: Dal-rice & curd."
                value={info.typicalMeals}
                onChange={handleInfoChange}
                rows="2"
                className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-xs placeholder-neutral-400"
              />
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
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500'
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
              onClick={handleNextStep}
              className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-neutral-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Continue to Calculations
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Calculated results */}
        {step === 2 && (
          <div className="space-y-5 relative z-10">
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Biometric Diagnostics</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">BMI</span>
                  <span className="text-sm font-extrabold text-neutral-900 dark:text-white">{goals.bmi}</span>
                  <span className="text-[8px] text-neutral-500 block">{goals.bmiCat}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">BMR</span>
                  <span className="text-sm font-extrabold text-neutral-900 dark:text-white">{goals.bmr}</span>
                  <span className="text-[8px] text-neutral-500 block">kcal/day</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">TDEE</span>
                  <span className="text-sm font-extrabold text-neutral-900 dark:text-white">{goals.tdee}</span>
                  <span className="text-[8px] text-neutral-500 block">Active Burn</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">Mid-BMI Goal</span>
                  <span className="text-sm font-extrabold text-neutral-900 dark:text-white">{goals.goalWeight}</span>
                  <span className="text-[8px] text-neutral-500 block">kg (BMI 22)</span>
                </div>
              </div>
            </div>

            {/* Fasting Setup */}
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
                      : 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {goals.includeFasting ? 'Fasting Enabled ✓' : 'Fasting Disabled ✗'}
                </button>
              </div>

              {goals.includeFasting && (
                <div className="space-y-2 pt-2 border-t border-neutral-250 dark:border-neutral-800">
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
                  <span className="text-[9px] text-neutral-500 block leading-tight">
                    * On fasting days, calorie/protein targets will reduce automatically by 25% and light rest/cardio is suggested in your daily workouts.
                  </span>
                </div>
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
                onClick={handleNextStep}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                Configure Targets <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block text-center">Confirm and Adjust Targets</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Target Goal Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="goalWeight"
                  value={goals.goalWeight}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-950 dark:text-white focus:outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Daily Protein Target (g)
                </label>
                <input
                  type="number"
                  name="targetProtein"
                  value={goals.targetProtein}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-950 dark:text-white focus:outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Daily Calories Target (kcal)
                </label>
                <input
                  type="number"
                  name="targetCalories"
                  value={goals.targetCalories}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-950 dark:text-white focus:outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Water Intake (Liters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="targetWater"
                  value={goals.targetWater}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-950 dark:text-white focus:outline-none text-center"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Cigarettes Limit / Day
                </label>
                <input
                  type="number"
                  name="targetCigarettes"
                  value={goals.targetCigarettes}
                  onChange={handleGoalChange}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-950 dark:text-white focus:outline-none text-center"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={runCalculations}
                className="py-2.5 px-3 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 text-neutral-750 dark:text-neutral-300 font-bold rounded-xl text-xs transition"
              >
                Reset Formulas
              </button>
              
              <span className="text-[10px] text-neutral-500 block self-center leading-tight">
                * Generates custom progression matching: <strong>Foundation</strong> → <strong>Build</strong> → <strong>Intensity</strong> phases across {info.planDuration} months.
              </span>
            </div>

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
                Generate My Plan!
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
