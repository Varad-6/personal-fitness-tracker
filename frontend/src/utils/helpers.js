import { defaultWorkoutPlan } from '../data/workoutTemplates';

// Convert feet & inches to centimeters
export const convertFeetInchesToCm = (feet, inches) => {
  const f = parseFloat(feet) || 0;
  const i = parseFloat(inches) || 0;
  const totalInches = (f * 12) + i;
  return parseFloat((totalInches * 2.54).toFixed(1));
};

// Calculate Basal Metabolic Rate (Mifflin-St Jeor Equation)
export const calculateBMR = (weight, heightCm, age, gender) => {
  const w = parseFloat(weight) || 0;
  const h = parseFloat(heightCm) || 0;
  const a = parseInt(age) || 0;
  if (gender === 'female') {
    return Math.round(10 * w + 6.25 * h - 5 * a - 161);
  }
  // Default to male
  return Math.round(10 * w + 6.25 * h - 5 * a + 5);
};

// Calculate Total Daily Energy Expenditure
export const calculateTDEE = (bmr, activityLevel) => {
  const b = parseFloat(bmr) || 0;
  const multipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'very_active': 1.725
  };
  const mult = multipliers[activityLevel] || 1.2;
  return Math.round(b * mult);
};

// Suggest a healthy target weight using BMI 22 (mid-normal range) as anchor
export const suggestGoalWeight = (heightCm) => {
  const hM = (parseFloat(heightCm) || 0) / 100;
  if (hM <= 0) return 70;
  return parseFloat((22 * hM * hM).toFixed(1));
};

// Suggest calorie target (TDEE - 500 to 750 kcal)
export const suggestCalorieTarget = (tdee) => {
  return Math.max(1200, Math.round(tdee - 600)); // Default deficit of 600, floor at 1200 kcal
};

// Suggest protein target (default 1.8g per kg of goal weight)
export const suggestProteinTarget = (goalWeightKg, ratio = 1.8) => {
  return Math.round((parseFloat(goalWeightKg) || 70) * ratio);
};

// Suggest water intake (35 ml per kg body weight)
export const suggestWaterTarget = (weightKg) => {
  // Return in Liters (can be converted to glasses on frontend: 1 glass = 250ml)
  const liters = (parseFloat(weightKg) || 70) * 0.035;
  return parseFloat(liters.toFixed(1));
};

// Get YYYY-MM-DD date string for local time
export const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const adjustedDate = new Date(d.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split('T')[0];
};

// Format date for UI display (e.g. Sat, Jul 18)
export const formatUIDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC' // Keep it timezone neutral for direct YYYY-MM-DD dates
  });
};

// Calculate BMI
export const calculateBMI = (weight, heightCm) => {
  if (!weight || !heightCm) return 0;
  const heightM = heightCm / 100;
  return (weight / (heightM * heightM)).toFixed(1);
};

// Get BMI Category Label
export const getBMICategory = (bmi) => {
  const b = parseFloat(bmi);
  if (b < 18.5) return { name: 'Underweight', color: 'text-blue-400' };
  if (b < 25.0) return { name: 'Normal', color: 'text-emerald-400' };
  if (b < 30.0) return { name: 'Overweight', color: 'text-orange-400' };
  return { name: 'Obese', color: 'text-red-400' };
};

// Determine which week phase of the plan a date falls into
export const getPlanDayAndPhase = (dateStr, startDateStr, workoutPlan) => {
  const start = new Date(startDateStr);
  const current = new Date(dateStr);
  
  // Calculate difference in days (rounded)
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // 1-indexed
  
  if (diffDays < 1) {
    return { dayIndex: 0, weekNum: 0, phaseName: 'Pre-Challenge' };
  }
  
  const weekNum = Math.ceil(diffDays / 7);
  let phaseName = '';

  // Use default workout plan if none provided or empty
  const plan = (workoutPlan && Object.keys(workoutPlan).length > 0) ? workoutPlan : defaultWorkoutPlan;

  if (plan && Object.keys(plan).length > 0) {
    const keys = Object.keys(plan);
    for (const key of keys) {
      const match = key.match(/(\d+)(?:-(\d+))?/);
      if (match) {
        const startW = parseInt(match[1]);
        const endW = match[2] ? parseInt(match[2]) : startW;
        if (weekNum >= startW && weekNum <= endW) {
          phaseName = key;
          break;
        }
      }
    }
  }

  // Fallback to static rules if not found
  if (!phaseName) {
    if (diffDays <= 7) {
      phaseName = 'Week 1';
    } else if (diffDays <= 28) {
      phaseName = 'Weeks 2-4';
    } else if (diffDays <= 42) {
      phaseName = 'Weeks 5-6';
    } else {
      phaseName = 'Weeks 7-8';
    }
  }
  
  return {
    dayIndex: diffDays,
    weekNum,
    phaseName
  };
};

// Get the workout assigned for a specific date
export const getWorkoutForDate = (dateStr, startDateStr, workoutPlan) => {
  const plan = (workoutPlan && Object.keys(workoutPlan).length > 0) ? workoutPlan : defaultWorkoutPlan;
  const { phaseName } = getPlanDayAndPhase(dateStr, startDateStr, plan);
  
  // Get day of the week
  const dateObj = new Date(dateStr);
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  
  // Fallback to first available phase if phaseName is not found
  const phase = plan[phaseName] || Object.values(plan)[0] || {};
  const workout = phase[weekday] || { focus: 'Rest Day', exercises: [] };
  
  return {
    weekday,
    phaseName,
    focus: workout.focus,
    exercises: workout.exercises || []
  };
};

// Calculate current completed streak and longest completed streak
export const calculateStreaks = (dailyLogs) => {
  const dates = Object.keys(dailyLogs)
    .filter(d => dailyLogs[d].workoutDone === true)
    .sort((a, b) => new Date(b) - new Date(a)); // Sort descending (newest first)
  
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };
  
  // Calculate Current Streak
  let currentStreak = 0;
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  
  // Must have completed today or yesterday to continue streak
  const hasCompletedToday = dailyLogs[todayStr]?.workoutDone === true;
  const hasCompletedYesterday = dailyLogs[yesterdayStr]?.workoutDone === true;
  
  if (hasCompletedToday || hasCompletedYesterday) {
    let checkDate = new Date(hasCompletedToday ? todayStr : yesterdayStr);
    while (true) {
      const checkStr = getLocalDateString(checkDate);
      if (dailyLogs[checkStr]?.workoutDone === true) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate Longest Streak (across all records sorted ascending)
  const sortedDates = Object.keys(dailyLogs)
    .filter(d => dailyLogs[d].workoutDone === true)
    .sort((a, b) => new Date(a) - new Date(b));
  
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;
  
  for (const dateStr of sortedDates) {
    const currDate = new Date(dateStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }
    prevDate = currDate;
  }
  
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }
  
  return { currentStreak, longestStreak };
};

// Check if there has been no rest day in the last 10 days
export const checkOvertraining = (dailyLogs, startDateStr) => {
  const today = new Date();
  let consecutiveWorkdays = 0;
  
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(d);
    
    const workout = getWorkoutForDate(dateStr, startDateStr);
    const isRestDayAssigned = workout.focus.toLowerCase().includes('rest');
    
    // If a day was logged, check if it was marked done AND was not a rest day
    // Or if the plan itself had a workday and the user completed it
    const log = dailyLogs[dateStr];
    
    if (log && log.workoutDone) {
      if (!isRestDayAssigned) {
        consecutiveWorkdays++;
      } else {
        // Rest day taken
        return false;
      }
    }
  }
  
  return consecutiveWorkdays >= 9; // Warn if active training on 9 of the last 10 days
};

// Seed realistic sample data
export const seedSampleData = (startingWeight, heightCm, startDateStr) => {
  const start = new Date(startDateStr);
  const today = new Date();
  
  const dailyLogs = {};
  const weeklyCheckIns = [];
  
  // Calculate dates in past
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // We will seed up to 14 days ago
  const daysToSeed = Math.min(diffDays, 14);
  
  let currentWeight = startingWeight;
  
  // Seed weekly check-ins
  // If the challenge started > 7 days ago, seed 2 check-ins
  if (daysToSeed >= 7) {
    const firstSunday = new Date(start);
    // Find first Sunday
    firstSunday.setDate(start.getDate() + (7 - start.getDay()) % 7);
    
    weeklyCheckIns.push({
      date: getLocalDateString(firstSunday),
      weight: parseFloat((startingWeight - 0.6).toFixed(1)),
      waist: 88,
      chest: 102,
      photo: null
    });
    currentWeight = startingWeight - 0.6;
  }
  
  if (daysToSeed >= 14) {
    const secondSunday = new Date(start);
    secondSunday.setDate(start.getDate() + (7 - start.getDay()) % 7 + 7);
    
    weeklyCheckIns.push({
      date: getLocalDateString(secondSunday),
      weight: parseFloat((startingWeight - 1.2).toFixed(1)),
      waist: 87.5,
      chest: 101.5,
      photo: null
    });
    currentWeight = startingWeight - 1.2;
  }
  
  // Seed daily logs
  for (let i = 0; i <= daysToSeed; i++) {
    const currDate = new Date(start);
    currDate.setDate(start.getDate() + i);
    const dateStr = getLocalDateString(currDate);
    
    // Check if future or today (let's not auto-complete today)
    if (currDate.toDateString() === today.toDateString()) {
      // Just seed a partial log for today
      dailyLogs[dateStr] = {
        workoutDone: false,
        exercisesCompleted: {},
        proteinLog: [
          { id: 'p_1', time: '09:00', name: 'Eggs & Toast', protein: 12, calories: 300 },
          { id: 'p_2', time: '13:00', name: 'Lunch at PG', protein: 15, calories: 500 }
        ],
        caloriesQuick: 800,
        water: 2,
        cigarettes: 2,
        sleep: 7.5,
        notes: "Feeling good. Cricket practice scheduled in the evening."
      };
      continue;
    }
    
    const workout = getWorkoutForDate(dateStr, startDateStr);
    const isRest = workout.focus.toLowerCase().includes('rest');
    
    // Complete 80% of past workouts
    const isCompleted = isRest ? true : Math.random() > 0.15;
    
    const exercisesCompleted = {};
    if (isCompleted && !isRest) {
      workout.exercises.forEach(ex => {
        // 90% chance to check each exercise
        if (Math.random() > 0.1) {
          exercisesCompleted[ex.id] = true;
        }
      });
    }
    
    // Cigarettes: gradual decline from 5 to 2
    // Day 0: 5, Day 14: 2
    const baseCig = 5 - Math.floor((i / 14) * 3);
    const cigarettes = isCompleted ? Math.max(0, baseCig + (Math.random() > 0.5 ? 1 : -1)) : baseCig + 1;
    
    dailyLogs[dateStr] = {
      workoutDone: isCompleted,
      exercisesCompleted,
      proteinLog: isCompleted ? [
        { id: 'p_1', time: '08:30', name: 'Whey shake', protein: 24, calories: 120 },
        { id: 'p_2', time: '13:00', name: 'Eggs (3) + Rice', protein: 18, calories: 450 },
        { id: 'p_3', time: '17:00', name: 'Peanuts + Chana', protein: 13, calories: 280 },
        { id: 'p_4', time: '21:00', name: 'Dal, Curd & Chapati', protein: 25, calories: 550 },
        { id: 'p_5', time: '22:30', name: 'Whey shake', protein: 24, calories: 120 }
      ] : [
        { id: 'p_1', time: '09:00', name: 'Chapati & Bhaji', protein: 4, calories: 350 },
        { id: 'p_2', time: '14:00', name: 'Lunch at PG', protein: 10, calories: 600 },
        { id: 'p_3', time: '21:00', name: 'Dinner at PG', protein: 12, calories: 700 }
      ],
      caloriesQuick: isCompleted ? 2100 : 1800,
      water: isCompleted ? 4 : 2,
      cigarettes: Math.max(0, cigarettes),
      sleep: parseFloat((7 + Math.random() * 1.5).toFixed(1)),
      notes: isCompleted 
        ? `Felt strong during ${workout.focus} workout. Recovering well.` 
        : `Busy day, missed workout. Soreness in shoulders.`
    };
  }
  
  return { dailyLogs, weeklyCheckIns };
};
