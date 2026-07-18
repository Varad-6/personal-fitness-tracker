import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Plus, AlertCircle, RefreshCw, Apple, ShieldCheck, Flame, Calculator, Minus, Trash2, X } from 'lucide-react';
import { dietReference } from '../data/dietReference';

export default function DietReference({ profile, onUpdateDailyLog, dailyLogs, onGenerateAIDiet }) {
  const [activeTab, setActiveTab] = useState('calculator'); // 'calculator' | 'guide' | 'simulator' | 'ai-planner'
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Search & Stepper states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedMealSlot, setSelectedMealSlot] = useState(() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 11) return 'Breakfast';
    if (hr >= 11 && hr < 15) return 'Lunch';
    if (hr >= 15 && hr < 18.5) return 'Snack';
    return 'Dinner';
  });
  const [isAILookingUp, setIsAILookingUp] = useState(false);

  // Autocomplete search
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const token = localStorage.getItem('fithabit_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const res = await fetch(`/api/diet/search-food?q=${encodeURIComponent(searchQuery)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    const debounce = setTimeout(fetchResults, 150);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

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

  const handleAILookup = async () => {
    setIsAILookingUp(true);
    try {
      const token = localStorage.getItem('fithabit_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch('/api/diet/parse-food', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: searchQuery })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          setSelectedFood({
            id: 'ai_' + Date.now(),
            name: item.name,
            standard_unit_label: item.quantity.split(' ')[1] || 'portion',
            unit_grams: 100,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat
          });
          setQuantity(1);
        } else {
          alert("Could not parse food item. Try simple names like 'roti' or 'boiled egg'.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("AI lookup failed. Please check connection.");
    } finally {
      setIsAILookingUp(false);
    }
  };

  const handleAddSelectedFood = () => {
    if (!selectedFood) return;
    
    const addedProt = Math.round(selectedFood.protein * quantity * 10) / 10;
    const addedCal = Math.round(selectedFood.calories * quantity);
    
    const newMeal = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }),
      name: `${quantity}x ${selectedFood.name} [${selectedMealSlot}]`,
      protein: addedProt,
      calories: addedCal
    };

    const nextProteinLog = [...(todayLog.proteinLog || []), newMeal];
    const nextCalories = (parseInt(todayLog.caloriesQuick) || 0) + addedCal;

    onUpdateDailyLog(todayStr, {
      ...todayLog,
      proteinLog: nextProteinLog,
      caloriesQuick: nextCalories,
      isFastDay: isFastingDayToday
    });

    setSearchQuery('');
    setSelectedFood(null);
    setSearchResults([]);
    
    alert(`Successfully added to daily log (+${addedProt}g protein, +${addedCal} kcal)!`);
  };

  const handleGenerateDiet = async () => {
    setIsGenerating(true);
    try {
      await onGenerateAIDiet();
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe client-side Markdown rendering helper
  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      let cleanLine = line.trim();
      if (cleanLine.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-orange-500 mt-4 mb-2">{cleanLine.replace('### ', '')}</h4>;
      }
      if (cleanLine.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-extrabold text-neutral-900 dark:text-white mt-5 mb-2 border-b border-neutral-250 dark:border-neutral-800 pb-1 flex items-center gap-1.5">{cleanLine.replace('## ', '')}</h3>;
      }
      if (cleanLine.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-black text-emerald-500 mt-6 mb-4">{cleanLine.replace('# ', '')}</h2>;
      }
      if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
        return <li key={idx} className="ml-4 list-disc text-xs text-neutral-700 dark:text-neutral-355 my-1 leading-relaxed">{cleanLine.substring(2)}</li>;
      }
      if (cleanLine === '') {
        return <div key={idx} className="h-2" />;
      }
      // Handle bold parsing
      const parts = cleanLine.split('**');
      if (parts.length > 1) {
        return (
          <p key={idx} className="text-xs text-neutral-700 dark:text-neutral-355 leading-relaxed my-1.5">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-neutral-900 dark:text-white">{part}</strong> : part)}
          </p>
        );
      }
      return <p key={idx} className="text-xs text-neutral-700 dark:text-neutral-355 leading-relaxed my-1.5">{cleanLine}</p>;
    });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
            activeTab === 'calculator'
              ? 'bg-emerald-500 border-emerald-500 text-neutral-950 shadow-md font-extrabold'
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-250 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-350 dark:hover:border-neutral-600'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Daily Calculator & Log
        </button>
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
        <button
          onClick={() => setActiveTab('ai-planner')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
            activeTab === 'ai-planner'
              ? 'bg-emerald-500 border-emerald-500 text-neutral-950 shadow-md font-extrabold'
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-250 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-350 dark:hover:border-neutral-600'
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-400" />
          AI Meal Planner
        </button>
      </div>

      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-wizard-fade-in">
          {/* Left Column: Search & Add */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                Quick-Add Food Calculator
              </h3>
              <p className="text-xs text-neutral-550 dark:text-neutral-400">
                Search our local database of common regional dishes to instantly log meals.
              </p>

              {/* Autocomplete Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search e.g. chapati, dal, paneer, oats, egg..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedFood) setSelectedFood(null);
                  }}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none"
                />

                {/* Dropdown matching list */}
                {searchResults.length > 0 && !selectedFood && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-2xl shadow-xl mt-1.5 max-h-60 overflow-y-auto z-40 p-2 space-y-1">
                    {searchResults.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedFood(item);
                          setQuantity(1);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-neutral-900 dark:text-white block">{item.name}</span>
                          <span className="text-[10px] text-neutral-450 dark:text-neutral-550 block">Serving: 1 {item.standard_unit_label} ({item.unit_grams}g)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 block">+{item.protein}g Protein</span>
                          <span className="text-[9px] text-neutral-400 dark:text-neutral-500 block">{item.calories} kcal</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* AI Fallback Helper if no matches found */}
                {searchQuery.trim() && searchResults.length === 0 && !selectedFood && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-2xl shadow-xl mt-1.5 p-4 z-40 text-center space-y-3">
                    <span className="text-xs text-neutral-500 block">No matching items found in the local database.</span>
                    <button
                      type="button"
                      onClick={handleAILookup}
                      disabled={isAILookingUp}
                      className="px-4 py-2 bg-emerald-500 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mx-auto hover:bg-emerald-600 transition active:scale-95 shadow-md"
                    >
                      {isAILookingUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Lookup "{searchQuery}" via FitHabit AI</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Stepper Card */}
              {selectedFood && (
                <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl space-y-4 animate-wizard-fade-in">
                  <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">{selectedFood.name}</span>
                      <span className="text-[10px] text-neutral-450 dark:text-neutral-555 block">Base: {selectedFood.calories} kcal • {selectedFood.protein}g protein per {selectedFood.standard_unit_label}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedFood(null)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Adjust Quantity:</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="p-1 px-2.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-lg text-xs font-bold hover:bg-neutral-100 transition active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-sm font-black w-8 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="p-1 px-2.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-lg text-xs font-bold hover:bg-neutral-100 transition active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Meal Slot Pickers */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider block">Select Meal Slot</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedMealSlot(slot)}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            selectedMealSlot === slot
                              ? 'bg-emerald-500 border-emerald-500 text-neutral-950'
                              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nutrition Tally Summary */}
                  <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
                    <span className="font-semibold text-neutral-500 font-sans">Totals to Add:</span>
                    <div className="flex gap-3 font-bold font-mono">
                      <span className="text-orange-500">{Math.round(selectedFood.calories * quantity)} kcal</span>
                      <span className="text-emerald-500">{Math.round(selectedFood.protein * quantity * 10) / 10}g Protein</span>
                    </div>
                  </div>

                  {/* Submit Add */}
                  <button
                    type="button"
                    onClick={handleAddSelectedFood}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-neutral-950 font-black rounded-xl text-xs shadow-md transition"
                  >
                    Add to Today's {selectedMealSlot} Log
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Today's running totals & Log List */}
          <div className="lg:col-span-5 space-y-6">
            {/* Running totals card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 pb-2">
                Today's Calories & Protein
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-neutral-450 uppercase block font-bold">Calorie intake</span>
                  <span className="text-2xl font-black text-neutral-900 dark:text-white block mt-0.5">
                    {todayLog.caloriesQuick || 0} / {profile.targetCalories || 2000} kcal
                  </span>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((parseInt(todayLog.caloriesQuick) || 0) / (profile.targetCalories || 2000)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-450 uppercase block font-bold">Protein Intake</span>
                  <span className="text-2xl font-black text-neutral-900 dark:text-white block mt-0.5">
                    {todayLog.proteinLog?.reduce((sum, item) => sum + (parseFloat(item.protein) || 0), 0).toFixed(1) || 0} / {profile.targetProtein || 150}g
                  </span>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((todayLog.proteinLog?.reduce((sum, item) => sum + (parseFloat(item.protein) || 0), 0) || 0) / (profile.targetProtein || 150)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* List of logged foods */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Today's Meal Ledger</span>
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {todayLog.proteinLog && todayLog.proteinLog.length > 0 ? (
                  todayLog.proteinLog.map(meal => (
                    <div key={meal.id} className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-950/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs">
                      <div>
                        <span className="font-extrabold text-neutral-900 dark:text-white block">{meal.name}</span>
                        <span className="text-[9px] text-neutral-450 dark:text-neutral-500 block">{meal.time} • {meal.calories} kcal</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-650 dark:text-emerald-400">+{meal.protein}g</span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextLog = todayLog.proteinLog.filter(m => m.id !== meal.id);
                            const nextCal = Math.max(0, (parseInt(todayLog.caloriesQuick) || 0) - (meal.calories || 0));
                            onUpdateDailyLog(todayStr, {
                              ...todayLog,
                              proteinLog: nextLog,
                              caloriesQuick: nextCal
                            });
                          }}
                          className="text-neutral-450 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400 dark:text-neutral-550 italic text-center py-4">No foods logged today. Search and add items above.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guide' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Guide Sections */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <Apple className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                {dietReference.guidance.title}
              </h3>

              <div className="space-y-6">
                {dietReference.guidance.sections.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider block">
                      {section.title}
                    </h4>
                    <ul className="space-y-2 bg-neutral-50 dark:bg-neutral-950/30 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
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
                <span className="text-xs font-bold text-neutral-900 dark:text-white block font-sans">PG Meal Conditioning Hack</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  PG kitchens often serve meals lacking lean proteins. Supplementing with whey powder and keeping a stash of roasted peanuts/chana in your room will ensure you easily hit target ranges without adding processed fat calories.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Quick Add Reference */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase border-b border-neutral-250 dark:border-neutral-800 pb-3">
              Quick Protein Reference Library
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Tap any food source below to quickly log it directly into <strong>Today's journal entry</strong>:
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {dietReference.quickAddSources.map((source) => (
                <div 
                  key={source.id}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-neutral-400 dark:hover:border-neutral-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{source.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">{source.name}</span>
                      <span className="text-[10px] text-neutral-455 dark:text-neutral-500 block">{source.calories} kcal</span>
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
      )}

      {activeTab === 'simulator' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              Interactive Protein Goal Simulator
            </h3>
            <p className="text-xs text-neutral-550 dark:text-neutral-400 mt-1">
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
                <div className="flex justify-between text-xs text-neutral-550 dark:text-neutral-400 font-mono mt-1">
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
                          : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-250 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-405'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col justify-between items-center text-center space-y-4">
              <div>
                <span className="text-xs font-bold text-neutral-400 dark:text-neutral-555 uppercase tracking-widest block font-sans">Recommended Target</span>
                <span className="text-5xl font-extrabold text-neutral-900 dark:text-white block mt-3 font-mono">
                  {calculatedProteinTarget}g
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-450 mt-2 block">
                  Daily Protein Intake goal ({calculatedProteinTarget} grams per day)
                </span>
              </div>

              <div className="space-y-3 w-full border-t border-neutral-200 dark:border-neutral-800 pt-4 text-xs text-left">
                <span className="font-bold text-neutral-500 dark:text-neutral-400 block uppercase tracking-wider">Example Hitting Schedule:</span>
                <div className="space-y-1.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-350">
                  <div className="flex justify-between">
                    <span>🥛 2 Scoops Whey Protein:</span>
                    <span className="text-emerald-650 dark:text-emerald-450 font-bold">48g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🥚 4 Boiled Eggs (Whole):</span>
                    <span className="text-emerald-650 dark:text-emerald-450 font-bold">24g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🍲 2 Bowls PG Dal:</span>
                    <span className="text-emerald-650 dark:text-emerald-450 font-bold">18g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🥣 1 Bowl Curd (200g):</span>
                    <span className="text-emerald-650 dark:text-emerald-450 font-bold">8g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🍛 standard Chapati & Veggie meals:</span>
                    <span className="text-emerald-650 dark:text-emerald-450 font-bold">62g</span>
                  </div>
                  <hr className="border-neutral-200 dark:border-neutral-800 my-1" />
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

      {activeTab === 'ai-planner' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                FitHabit AI Meal Planner
              </h3>
              <p className="text-xs text-neutral-550 dark:text-neutral-400 mt-1">
                Generates a customized, high-protein 7-day diet guide matched directly to your current biometrics and fasting choices.
              </p>
            </div>
            <button
              onClick={handleGenerateDiet}
              disabled={isGenerating}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shrink-0"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {profile.aiDietPlan ? "Regenerate Plan" : "Generate Plan"}
                </>
              )}
            </button>
          </div>

          {profile.aiDietPlan ? (
            <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 overflow-x-auto select-text space-y-1">
              {renderMarkdown(profile.aiDietPlan)}
            </div>
          ) : (
            <div className="p-8 bg-neutral-50 dark:bg-neutral-950/20 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-center space-y-3">
              <span className="text-4xl block">🥗🤖</span>
              <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400 block">No AI Plan Generated Yet</span>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Click the button above to analyze your target weight goal of <strong>{profile.goalWeight || profile.startingWeight} kg</strong> and compile customized calorie & protein meal schedules.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
