import React, { useState } from 'react';
import { BookOpen, Sparkles, Plus, AlertCircle, RefreshCw, Apple, ShieldCheck, Flame } from 'lucide-react';
import { dietReference } from '../data/dietReference';

export default function DietReference({ profile, onUpdateDailyLog, dailyLogs }) {
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'simulator'
  
  // Protein simulator state
  const [simWeight, setSimWeight] = useState(profile.startingWeight || 75);
  const [activityMultiplier, setActivityMultiplier] = useState(2.0);

  // Calculate simulated target
  const calculatedProteinTarget = Math.round(simWeight * activityMultiplier);

  // Quick logging integration for today
  const todayStr = new Date().toISOString().split('T')[0];
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

  // Check if today is fasting day
  const weekdayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isFastingDayToday = profile.fastingDays?.includes(weekdayName) || todayLog.isFastDay;

  const handleQuickAddToday = (source) => {
    const newMeal = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }),
      name: source.name,
      protein: source.protein,
      calories: source.calories
    };

    const nextProteinLog = [...(todayLog.proteinLog || []), newMeal];
    const nextCalories = (parseInt(todayLog.caloriesQuick) || 0) + source.calories;

    onUpdateDailyLog(todayStr, {
      ...todayLog,
      proteinLog: nextProteinLog,
      caloriesQuick: nextCalories,
      isFastDay: isFastingDayToday
    });

    alert(`Successfully added "${source.name}" to today's log (+${source.protein}g protein, +${source.calories} kcal)!`);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
            activeTab === 'guide'
              ? 'bg-emerald-500 border-emerald-500 text-neutral-950 shadow-md font-extrabold'
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-250 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-350 dark:hover:border-neutral-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          PG Diet Reference Guide
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
            activeTab === 'simulator'
              ? 'bg-emerald-500 border-emerald-500 text-neutral-950 shadow-md font-extrabold'
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-250 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-350 dark:hover:border-neutral-600'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Protein Goal Calculator
        </button>
      </div>

      {activeTab === 'guide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Guide Sections */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-850 pb-3">
                <Apple className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                {dietReference.guidance.title}
              </h3>

              <div className="space-y-6">
                {dietReference.guidance.sections.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider block">
                      {section.title}
                    </h4>
                    <ul className="space-y-2 bg-neutral-50 dark:bg-neutral-950/30 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-4">
                      {section.items.map((item, i) => (
                        <li key={i} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-2.5 leading-relaxed animate-fade-in">
                          <span className="p-0.5 px-1 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-lg font-bold text-[10px]">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Eating Hacks */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-start gap-3 transition-colors duration-200">
              <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">PG Meal Conditioning Hack</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  PG kitchens often serve meals lacking lean proteins. Supplementing with whey powder and keeping a stash of roasted peanuts/chana in your room will ensure you easily hit target ranges without adding processed fat calories.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Quick Add Reference */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase border-b border-neutral-250 dark:border-neutral-850 pb-3">
              Quick Protein Reference Library
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Tap any food source below to quickly log it directly into <strong>Today's journal entry</strong>:
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {dietReference.quickAddSources.map((source) => (
                <div 
                  key={source.id}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-850 rounded-2xl hover:border-neutral-400 dark:hover:border-neutral-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{source.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">{source.name}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">{source.calories} kcal</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleQuickAddToday(source)}
                    className="py-1 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold rounded-xl text-xs transition border border-emerald-500/20 flex items-center gap-1 active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+{source.protein}g</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* Protein Goal Simulator tab */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
          <div className="border-b border-neutral-200 dark:border-neutral-850 pb-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              Interactive Protein Goal Simulator
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Adjust your stats to calculate recommendations for building muscle, preserving lean mass, and sports conditioning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-550 dark:text-neutral-400 uppercase block mb-1">
                  Simulated Weight (kg)
                </label>
                <input
                  type="range"
                  min="50"
                  max="120"
                  value={simWeight}
                  onChange={(e) => setSimWeight(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1">
                  <span>50 kg</span>
                  <span className="text-neutral-900 dark:text-white font-bold">{simWeight} kg</span>
                  <span>120 kg</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-550 dark:text-neutral-400 uppercase block mb-1">
                  Activity & Training Intensity
                </label>
                <div className="space-y-2">
                  {[
                    { val: 1.4, label: 'Moderate Active (1.4g/kg) - Maintenance & Light gym' },
                    { val: 1.7, label: 'High Active (1.7g/kg) - Strength Training & Weekly Cricket' },
                    { val: 2.0, label: 'Athletic Peak (2.0g/kg) - High Volume / Progressive Overload (Target)' },
                    { val: 2.2, label: 'Maximum Hypertrophy (2.2g/kg) - Bulking/Recomp conditioning' }
                  ].map((option) => (
                    <button
                      key={option.val}
                      type="button"
                      onClick={() => setActivityMultiplier(option.val)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                        activityMultiplier === option.val
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-250 dark:border-neutral-850 text-neutral-500 dark:text-neutral-400 hover:border-neutral-405'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-6 flex flex-col justify-between items-center text-center space-y-4">
              <div>
                <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Recommended Target</span>
                <span className="text-5xl font-extrabold text-neutral-900 dark:text-white block mt-3">
                  {calculatedProteinTarget}g
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-450 mt-2 block">
                  Daily Protein Intake goal ({calculatedProteinTarget} grams per day)
                </span>
              </div>

              <div className="space-y-3 w-full border-t border-neutral-200 dark:border-neutral-850 pt-4 text-xs text-left">
                <span className="font-bold text-neutral-500 dark:text-neutral-400 block uppercase tracking-wider">Example Hitting Schedule:</span>
                <div className="space-y-1.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                  <div className="flex justify-between">
                    <span>🥛 2 Scoops Whey Protein:</span>
                    <span className="text-emerald-650 dark:text-emerald-400 font-bold">48g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🥚 4 Boiled Eggs (Whole):</span>
                    <span className="text-emerald-650 dark:text-emerald-400 font-bold">24g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🍲 2 Bowls PG Dal:</span>
                    <span className="text-emerald-650 dark:text-emerald-400 font-bold">18g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🥣 1 Bowl Curd (200g):</span>
                    <span className="text-emerald-650 dark:text-emerald-400 font-bold">8g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🍛 standard Chapati & Veggie meals:</span>
                    <span className="text-emerald-650 dark:text-emerald-400 font-bold">62g</span>
                  </div>
                  <hr className="border-neutral-200 dark:border-neutral-850 my-1" />
                  <div className="flex justify-between text-xs text-neutral-900 dark:text-white font-bold">
                    <span>TOTAL ESTIMATED:</span>
                    <span>160g</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
