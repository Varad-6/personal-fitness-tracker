import React, { useState } from 'react';
import { Camera, Calendar, Sparkles, TrendingDown, TrendingUp, HelpCircle, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getLocalDateString, formatUIDate, calculateBMI } from '../utils/helpers';

export default function Milestones({ 
  profile, 
  weeklyCheckIns, 
  onAddCheckIn, 
  onDeleteCheckIn 
}) {
  const todayStr = getLocalDateString();
  const todayDateObj = new Date();
  const isSunday = todayDateObj.getDay() === 0;

  // Form states
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [photo, setPhoto] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate live BMI
  const liveWeight = parseFloat(weight);
  const liveBmi = liveWeight ? calculateBMI(liveWeight, profile.height) : null;

  // Handle Photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024 * 1.5) {
        setErrorMessage("Image too large. Please select a photo under 1.5MB.");
        return;
      }
      setErrorMessage('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit check-in
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!weight) return;

    const wVal = parseFloat(weight);
    const waVal = waist ? parseFloat(waist) : null;
    const cVal = chest ? parseFloat(chest) : null;

    // Check if Sunday check-in already logged for today
    const exists = weeklyCheckIns.some(c => c.date === todayStr);
    if (exists) {
      setErrorMessage("You have already logged a check-in for today!");
      return;
    }

    onAddCheckIn({
      date: todayStr,
      weight: wVal,
      waist: waVal,
      chest: cVal,
      photo: photo
    });

    setWeight('');
    setWaist('');
    setChest('');
    setPhoto(null);
    setErrorMessage('');
  };

  // Calculate stats vs start & last week
  const getComparisonStats = () => {
    if (weeklyCheckIns.length === 0) {
      return {
        changeVsStart: 0,
        changeVsLast: 0,
        trend: 'neutral',
        trendText: 'Establish your first check-in to track trends.'
      };
    }

    const lastCheck = weeklyCheckIns[weeklyCheckIns.length - 1];
    const changeVsStart = lastCheck.weight - profile.startingWeight;
    
    let changeVsLast = 0;
    if (weeklyCheckIns.length > 1) {
      const prevCheck = weeklyCheckIns[weeklyCheckIns.length - 2];
      changeVsLast = lastCheck.weight - prevCheck.weight;
    }

    const isTrendingDown = changeVsLast < 0 || (weeklyCheckIns.length === 1 && changeVsStart < 0);
    const trend = isTrendingDown ? 'good' : changeVsLast > 0 ? 'warning' : 'neutral';
    
    let trendText = '';
    if (trend === 'good') {
      trendText = `Weight is trending down! Excellent job.`;
    } else if (trend === 'warning') {
      trendText = `Weight increased compared to last check-in. Stay consistent with your daily habit targets.`;
    } else {
      trendText = `Weight is stable. Monitor your daily calories and cricket conditioning.`;
    }

    return {
      changeVsStart: parseFloat(changeVsStart.toFixed(1)),
      changeVsLast: parseFloat(changeVsLast.toFixed(1)),
      trend,
      trendText
    };
  };

  const stats = getComparisonStats();

  return (
    <div className="space-y-6 pb-24 md:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* Sunday check-in active promo */}
      {isSunday && !weeklyCheckIns.some(c => c.date === todayStr) && (
        <div className="bg-gradient-to-r from-emerald-500/20 to-orange-500/20 border border-emerald-500/30 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="inline-flex px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-wider mb-1">
              Active Milestone Day
            </span>
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400 animate-spin" />
              It's Sunday Milestone Check-in!
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Measure your progress: weight, waist, and snap a progress photo to track your weekly transformation.
            </p>
          </div>
          <a
            href="#log-form"
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-2xl transition shadow-md shrink-0"
          >
            Log Check-In Now
          </a>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Container */}
        <div id="log-form" className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-5 transition-colors duration-200">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight border-b border-neutral-200 dark:border-neutral-850 pb-3">
            New Sunday Check-in
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                Current Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 78.5"
                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
              {liveBmi && (
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block mt-1">
                  Live calculated BMI: <span className="font-bold text-neutral-750 dark:text-neutral-300">{liveBmi}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Waist Size (cm, optional)
                </label>
                <input
                  type="number"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  placeholder="e.g. 88"
                  className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-1">
                  Chest Size (cm, optional)
                </label>
                <input
                  type="number"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  placeholder="e.g. 102"
                  className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase block mb-2">
                Progress Photo (optional)
              </label>
              
              {photo ? (
                <div className="relative border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden aspect-video bg-neutral-100 dark:bg-neutral-950">
                  <img 
                    src={photo} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="absolute top-2 right-2 p-1.5 bg-neutral-900/80 hover:bg-red-500/80 rounded-xl text-neutral-300 hover:text-white transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-neutral-350 dark:hover:border-neutral-700 rounded-2xl flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950/20 cursor-pointer transition relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Camera className="w-8 h-8 text-neutral-400 dark:text-neutral-600 mb-2" />
                  <span className="text-xs font-semibold text-neutral-550 dark:text-neutral-400">Click to Upload Photo</span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block mt-1">Stored locally in database</span>
                </div>
              )}
            </div>

            {errorMessage && (
              <p className="text-xs font-semibold text-red-500 dark:text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl shadow-sm transition"
            >
              Log Sunday Check-in
            </button>
          </form>
        </div>

        {/* Trends Container */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight border-b border-neutral-200 dark:border-neutral-850 pb-3">
            Milestone Insights
          </h3>

          {/* Trend Banner Indicator */}
          {weeklyCheckIns.length > 0 ? (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              stats.trend === 'good' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : stats.trend === 'warning'
                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400'
                  : 'bg-neutral-100 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'
            }`}>
              <div className="mt-0.5">
                {stats.trend === 'good' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : stats.trend === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                  Status Indicator: {stats.trend === 'good' ? '✅ Weight Trending Down' : stats.trend === 'warning' ? '⚠️ Trend Slowing' : '📊 Baseline Set'}
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  {stats.trendText}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-center text-xs text-neutral-500">
              No milestones logged yet. Complete your first Sunday check-in to view trends.
            </div>
          )}

          {/* Change Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-850 p-4 rounded-2xl text-center space-y-1">
              <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Vs Start Weight</span>
              <div className="flex items-center justify-center gap-1.5">
                {stats.changeVsStart < 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                ) : stats.changeVsStart > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500 dark:text-red-400" />
                ) : null}
                <span className={`text-2xl font-extrabold ${
                  stats.changeVsStart < 0 ? 'text-emerald-500 dark:text-emerald-400' : stats.changeVsStart > 0 ? 'text-red-500 dark:text-red-400' : 'text-neutral-450 dark:text-neutral-400'
                }`}>
                  {stats.changeVsStart > 0 ? `+${stats.changeVsStart}` : stats.changeVsStart} kg
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">Baseline: {profile.startingWeight} kg</span>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-850 p-4 rounded-2xl text-center space-y-1">
              <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Vs Last Week</span>
              <div className="flex items-center justify-center gap-1.5">
                {stats.changeVsLast < 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                ) : stats.changeVsLast > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500 dark:text-red-400" />
                ) : null}
                <span className={`text-2xl font-extrabold ${
                  stats.changeVsLast < 0 ? 'text-emerald-500 dark:text-emerald-400' : stats.changeVsLast > 0 ? 'text-red-500 dark:text-red-400' : 'text-neutral-455 dark:text-neutral-400'
                }`}>
                  {stats.changeVsLast > 0 ? `+${stats.changeVsLast}` : stats.changeVsLast} kg
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">Weekly changes</span>
            </div>
          </div>

          {/* Past Check-ins Log */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Past Milestones</h4>
            
            {weeklyCheckIns.length > 0 ? (
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Weight</th>
                      <th className="px-4 py-2">Waist / Chest</th>
                      <th className="px-4 py-2 text-center">Photo</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                    {weeklyCheckIns.map((check) => (
                      <tr key={check.date} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/40 text-neutral-700 dark:text-neutral-350">
                        <td className="px-4 py-3 font-semibold">{formatUIDate(check.date)}</td>
                        <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">{check.weight} kg</td>
                        <td className="px-4 py-3">
                          {check.waist ? `${check.waist} cm` : '--'} / {check.chest ? `${check.chest} cm` : '--'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {check.photo ? (
                            <img 
                              src={check.photo} 
                              alt="Thumbnail" 
                              className="w-10 h-10 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 mx-auto shadow-sm"
                            />
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-600 font-semibold italic text-[10px]">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onDeleteCheckIn(check.date)}
                            className="text-neutral-400 hover:text-red-500 transition"
                            title="Delete Milestone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-neutral-450 dark:text-neutral-500 italic text-center py-4 bg-neutral-50 dark:bg-neutral-950/20 rounded-2xl border border-neutral-200 dark:border-neutral-850">
                No milestone check-ins recorded yet.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
