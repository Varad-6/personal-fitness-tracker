import React from 'react';
import { 
  Flame, Award, ShieldAlert, Sparkles, TrendingDown, 
  Activity, Calendar, Heart, GlassWater, Dumbbell, Cigarette 
} from 'lucide-react';
import { calculateBMI, getBMICategory } from '../utils/helpers';

export default function ProgressAnalytics({ profile, dailyLogs, weeklyCheckIns }) {
  const currentWeight = weeklyCheckIns.length > 0 
    ? weeklyCheckIns[weeklyCheckIns.length - 1].weight 
    : profile.startingWeight;

  const bmi = calculateBMI(currentWeight, profile.height);
  const bmiCat = getBMICategory(bmi);

  // Completion rates
  const logsArray = Object.values(dailyLogs);
  const totalCompleted = logsArray.filter(l => l.workoutDone === true).length;
  
  // Weekly averages
  const today = new Date();
  let last7DaysProtein = [];
  let last7DaysCigarettes = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const log = dailyLogs[dateStr];
    if (log) {
      const pTotal = log.proteinLog?.reduce((sum, item) => sum + (item.protein || 0), 0) || 0;
      last7DaysProtein.push(pTotal);
      if (log.cigarettes !== undefined) {
        last7DaysCigarettes.push(log.cigarettes);
      }
    }
  }
  const avgProtein = last7DaysProtein.length > 0 
    ? Math.round(last7DaysProtein.reduce((a, b) => a + b, 0) / last7DaysProtein.length) 
    : 0;
  
  const avgCigarettes = last7DaysCigarettes.length > 0
    ? (last7DaysCigarettes.reduce((a, b) => a + b, 0) / last7DaysCigarettes.length).toFixed(1)
    : 0;

  // Before vs Now Photos
  const photoCheckIns = weeklyCheckIns.filter(c => c.photo);
  const beforePhoto = photoCheckIns.length > 0 ? photoCheckIns[0] : null;
  const nowPhoto = photoCheckIns.length > 1 ? photoCheckIns[photoCheckIns.length - 1] : null;

  // Custom SVG Chart: Weight Trend
  const weightData = [
    { label: 'Start', weight: profile.startingWeight },
    ...weeklyCheckIns.map((c, i) => ({ label: `W${i + 1}`, weight: c.weight }))
  ];

  const renderWeightChart = () => {
    if (weightData.length < 2) {
      return (
        <div className="h-48 flex items-center justify-center text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-950/20 rounded-2xl border border-neutral-200 dark:border-neutral-850">
          Not enough data yet. Complete Sunday check-ins to generate the trend line.
        </div>
      );
    }

    const padding = 35;
    const width = 450;
    const height = 180;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const weights = weightData.map(d => d.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;

    const points = weightData.map((d, index) => {
      const x = padding + (index / (weightData.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((d.weight - minW) / range) * chartHeight;
      return { x, y, ...d };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + chartHeight * ratio;
          const val = (maxW - ratio * range).toFixed(1);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="1" strokeDasharray="3,3" />
              <text x={padding - 5} y={y + 4} className="fill-neutral-450 dark:fill-neutral-500 text-[9px] text-right font-mono" textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* Shaded Area */}
        <path d={areaPath} fill="url(#weightGrad)" />

        {/* Trend Line */}
        <path d={linePath} fill="none" className="stroke-emerald-500 dark:stroke-emerald-400" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data Nodes */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" className="fill-white dark:fill-neutral-900 stroke-emerald-500 dark:stroke-emerald-400" strokeWidth="2" />
            <text x={p.x} y={height - 6} className="fill-neutral-500 dark:fill-neutral-400 text-[9px] text-center" textAnchor="middle">{p.label}</text>
            <text x={p.x} y={p.y - 8} className="fill-neutral-800 dark:fill-white text-[9px] font-bold text-center font-mono" textAnchor="middle">{p.weight}</text>
          </g>
        ))}
      </svg>
    );
  };

  // Cigarette reduction trend graph
  const getCigaretteHistory = () => {
    const sortedDates = Object.keys(dailyLogs).sort((a, b) => new Date(a) - new Date(b));
    const recentDates = sortedDates.slice(-10);
    return recentDates.map(d => ({
      label: d.split('-')[2],
      val: dailyLogs[d].cigarettes || 0
    }));
  };

  const cigData = getCigaretteHistory();

  const renderCigChart = () => {
    if (cigData.length < 2) {
      return (
        <div className="h-48 flex items-center justify-center text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-950/20 rounded-2xl border border-neutral-200 dark:border-neutral-850">
          Log cigarettes for a few days to view the trend.
        </div>
      );
    }

    const padding = 35;
    const width = 450;
    const height = 180;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const values = cigData.map(d => d.val);
    const maxVal = Math.max(...values, profile.targetCigarettes) + 1;
    const minVal = 0;
    const range = maxVal - minVal;

    const points = cigData.map((d, index) => {
      const x = padding + (index / (cigData.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((d.val - minVal) / range) * chartHeight;
      return { x, y, ...d };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const targetY = padding + chartHeight - ((profile.targetCigarettes - minVal) / range) * chartHeight;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = padding + chartHeight * ratio;
          const val = Math.round(maxVal - ratio * range);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="1" strokeDasharray="3,3" />
              <text x={padding - 5} y={y + 4} className="fill-neutral-450 dark:fill-neutral-500 text-[9px] text-right font-mono" textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* Target limit line */}
        <line x1={padding} y1={targetY} x2={width - padding} y2={targetY} className="stroke-orange-500/50" strokeWidth="1.5" strokeDasharray="5,4" />
        <text x={width - padding - 4} y={targetY - 4} className="fill-orange-500 dark:fill-orange-400 text-[8px] font-bold text-right" textAnchor="end">TARGET MAX ({profile.targetCigarettes})</text>

        {/* Trend Line */}
        <path d={linePath} fill="none" className="stroke-orange-500 dark:stroke-orange-400" strokeWidth="2" strokeLinecap="round" />

        {/* Data Nodes */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" className="fill-white dark:fill-neutral-900 stroke-orange-500 dark:stroke-orange-400" strokeWidth="2" />
            <text x={p.x} y={height - 6} className="fill-neutral-500 dark:fill-neutral-450 text-[8px] text-center" textAnchor="middle">Day {p.label}</text>
            <text x={p.x} y={p.y - 7} className="fill-neutral-800 dark:fill-white text-[8px] font-bold text-center font-mono" textAnchor="middle">{p.val}</text>
          </g>
        ))}
      </svg>
    );
  };

  // Weekly Completion Rate (Bar Chart)
  const getWeeklyCompletions = () => {
    const weeklyData = [];
    const sortedDates = Object.keys(dailyLogs).sort((a, b) => new Date(a) - new Date(b));
    
    if (sortedDates.length === 0) return [];
    const start = new Date(profile.startDate);
    const totalWeeks = profile.plan_duration_months * 4;
    
    for (let w = 1; w <= totalWeeks; w++) {
      let completed = 0;
      let missed = 0;
      
      const wStart = new Date(start);
      wStart.setDate(start.getDate() + (w - 1) * 7);
      const wEnd = new Date(start);
      wEnd.setDate(start.getDate() + w * 7 - 1);

      for (const dStr of sortedDates) {
        const dObj = new Date(dStr);
        if (dObj >= wStart && dObj <= wEnd) {
          if (dailyLogs[dStr].workoutDone === true) {
            completed++;
          } else {
            missed++;
          }
        }
      }

      if (completed + missed > 0 || wStart <= new Date()) {
        weeklyData.push({
          week: `W${w}`,
          completed,
          missed: Math.min(7 - completed, missed)
        });
      }
    }

    return weeklyData.slice(-8); // Show last 8 weeks for sizing
  };

  const weeklyCompletions = getWeeklyCompletions();

  const renderCompletionChart = () => {
    if (weeklyCompletions.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-950/20 rounded-2xl border border-neutral-200 dark:border-neutral-850">
          Complete daily workouts to generate weekly completions bar charts.
        </div>
      );
    }

    const padding = 35;
    const width = 450;
    const height = 180;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = Math.min(30, (chartWidth / weeklyCompletions.length) * 0.5);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Y Axis Grid */}
        {[0, 2, 4, 6, 7].map((val) => {
          const y = padding + chartHeight - (val / 7) * chartHeight;
          return (
            <g key={val}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="1" strokeDasharray="3,3" />
              <text x={padding - 5} y={y + 3} className="fill-neutral-450 dark:fill-neutral-500 text-[9px] text-right font-mono" textAnchor="end">{val}d</text>
            </g>
          );
        })}

        {/* Bars */}
        {weeklyCompletions.map((d, i) => {
          const x = padding + (i / (weeklyCompletions.length)) * chartWidth + (chartWidth / weeklyCompletions.length) / 4;
          const totalDays = d.completed + d.missed;
          if (totalDays === 0) return null;

          const hComp = (d.completed / 7) * chartHeight;
          const hMiss = (d.missed / 7) * chartHeight;
          
          const yComp = padding + chartHeight - hComp;
          const yMiss = yComp - hMiss;

          return (
            <g key={d.week}>
              {/* Completed Bar */}
              {d.completed > 0 && (
                <rect 
                  x={x - barWidth/2} 
                  y={yComp} 
                  width={barWidth} 
                  height={hComp} 
                  className="fill-emerald-500/80 dark:fill-emerald-500/80 hover:fill-emerald-400 transition" 
                  rx="3"
                />
              )}
              {/* Missed Bar */}
              {d.missed > 0 && (
                <rect 
                  x={x - barWidth/2} 
                  y={yMiss} 
                  width={barWidth} 
                  height={hMiss} 
                  className="fill-red-500/50 dark:fill-red-500/60 hover:fill-red-400 transition" 
                  rx="3"
                />
              )}

              <text x={x} y={height - 6} className="fill-neutral-500 dark:fill-neutral-400 text-[9px] text-center font-bold" textAnchor="middle">{d.week}</text>
              <text x={x} y={yComp + hComp/2 + 3} className="fill-neutral-900 dark:fill-neutral-950 text-[8px] font-extrabold text-center" textAnchor="middle">
                {d.completed > 0 ? d.completed : ''}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BMI Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <div>
            <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500 uppercase tracking-widest block">Active BMI Level</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-neutral-900 dark:text-white">{bmi}</span>
              <span className={`text-sm font-bold ${bmiCat.color}`}>{bmiCat.name}</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              Updates dynamically as weight updates from Sunday check-ins.
            </p>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-800 mt-4 pt-3 flex justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>Height: {profile.height} cm</span>
            <span>Weight: {currentWeight} kg</span>
          </div>
        </div>

        {/* Protein Averages Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-orange-500/5 rounded-full blur-2xl"></div>
          <div>
            <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500 uppercase tracking-widest block">7-Day Protein Avg</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-neutral-900 dark:text-white">{avgProtein}g</span>
              <span className="text-xs text-neutral-500 font-bold">/ target {profile.targetProtein}g</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              Average protein intake based on logged sources over the last week.
            </p>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-800 mt-4 pt-3 flex justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>Status: {avgProtein >= profile.targetProtein ? '✅ Target Met' : '⚠️ Below Goal'}</span>
            <span>Cigs Avg: {avgCigarettes} / day</span>
          </div>
        </div>

        {/* Completion Streaks Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-red-500/5 rounded-full blur-2xl"></div>
          <div>
            <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500 uppercase tracking-widest block">Workouts Logged Done</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-neutral-900 dark:text-white">{totalCompleted}</span>
              <span className="text-xs text-neutral-500">days completed</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              Habit score. Maintain consecutive daily streaks to unlock badges.
            </p>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-800 mt-4 pt-3 flex justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span>Completion: {Math.round((totalCompleted / (profile.plan_duration_months * 30)) * 100)}%</span>
            <span>Total Logs: {logsArray.length}</span>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Weight Trend Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase">Weight Trend Over Time</h3>
            <span className="text-xs text-neutral-400">Sunday Check-ins</span>
          </div>
          <div className="h-48">
            {renderWeightChart()}
          </div>
        </div>

        {/* Weekly Completion Bar Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase">Weekly Completion Rate</h3>
            <span className="text-xs text-neutral-400">Completed vs Missed</span>
          </div>
          <div className="h-48">
            {renderCompletionChart()}
          </div>
        </div>

        {/* Cigarette Reduction Trend Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-2 transition-colors duration-200">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase">Cigarette Reduction Trend</h3>
            <span className="text-xs text-neutral-400">Daily logged count vs target limit</span>
          </div>
          <div className="h-48">
            {renderCigChart()}
          </div>
        </div>

      </div>

      {/* Before vs Now Photos Comparison */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase">Before vs Now Transformation</h3>
          <span className="text-xs text-neutral-400">Based on Sunday photos</span>
        </div>

        {photoCheckIns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 text-center">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block">Before ({formatUIDate(beforePhoto.date)})</span>
              <div className="aspect-square border border-neutral-200 dark:border-neutral-850 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950">
                <img 
                  src={beforePhoto.photo} 
                  alt="Before" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-bold text-neutral-800 dark:text-white">{beforePhoto.weight} kg</span>
            </div>

            <div className="space-y-2 text-center">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block">Latest ({formatUIDate(nowPhoto ? nowPhoto.date : beforePhoto.date)})</span>
              <div className="aspect-square border border-neutral-200 dark:border-neutral-850 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950">
                <img 
                  src={nowPhoto ? nowPhoto.photo : beforePhoto.photo} 
                  alt="Now" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-bold text-neutral-800 dark:text-white">{nowPhoto ? nowPhoto.weight : beforePhoto.weight} kg</span>
            </div>
          </div>
        ) : (
          <div className="p-8 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/20 rounded-2xl text-center space-y-2 transition-colors duration-200">
            <span className="text-3xl block">📸</span>
            <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400 block">No Transformation Photos Logged</span>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Upload a progress picture during Sunday check-ins to unlock this visual comparison view.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
