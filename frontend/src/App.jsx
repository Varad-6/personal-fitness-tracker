import React, { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Milestones from './components/Milestones';
import ProgressAnalytics from './components/ProgressAnalytics';
import WorkoutLibrary from './components/WorkoutLibrary';
import DietReference from './components/DietReference';
import SettingsProfile from './components/SettingsProfile';
import Login from './components/Login';

import { getLocalDateString, seedSampleData } from './utils/helpers';

import { 
  Flame, Calendar, Award, BarChart3, Dumbbell, Apple, 
  Settings as SettingsIcon, LogOut, CheckSquare, Sparkles,
  Sun, Moon, RefreshCw
} from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState({ isOnboarded: false });
  const [dailyLogs, setDailyLogs] = useState({});
  const [weeklyCheckIns, setWeeklyCheckIns] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState({});
  const [settings, setSettings] = useState({ themeMode: 'light', notificationsEnabled: false, notificationTime: '20:00' });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('fithabit_token'));

  // Custom fetch wrapper adding bearer token
  const apiFetch = async (url, options = {}) => {
    const activeToken = localStorage.getItem('fithabit_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
    };
    const res = await fetch(url, {
      ...options,
      headers
    });
    if (res.status === 401) {
      handleLogout();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  };

  const handleLoginSuccess = (userToken, userData) => {
    localStorage.setItem('fithabit_token', userToken);
    setToken(userToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('fithabit_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Fetch initial state from FastAPI server
  const fetchAllData = async () => {
    const activeToken = localStorage.getItem('fithabit_token');
    if (!activeToken) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      
      const profileRes = await apiFetch('/api/profile');
      const profileData = await profileRes.json();
      setProfile(profileData);

      const settingsRes = await apiFetch('/api/settings');
      const settingsData = await settingsRes.json();
      setSettings(settingsData);

      const planRes = await apiFetch('/api/workout-plan');
      const planData = await planRes.json();
      setWorkoutPlan(planData);

      const logsRes = await apiFetch('/api/daily-logs');
      const logsData = await logsRes.json();
      setDailyLogs(logsData);

      const checkinsRes = await apiFetch('/api/weekly-checkins');
      const checkinsData = await checkinsRes.json();
      setWeeklyCheckIns(checkinsData);

      setIsAuthenticated(true);
    } catch (e) {
      console.error("Failed to fetch state from backend API", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify token validity on load
  useEffect(() => {
    const verifyToken = async () => {
      const activeToken = localStorage.getItem('fithabit_token');
      if (activeToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${activeToken}` }
          });
          if (res.status === 200) {
            const data = await res.json();
            setUser(data.user);
            setIsAuthenticated(true);
            await fetchAllData();
          } else {
            handleLogout();
          }
        } catch (e) {
          console.error("Token verification failed", e);
          handleLogout();
        }
      } else {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  // Theme Sync effect (class-based for Tailwind CSS v4)
  useEffect(() => {
    let activeTheme = settings.themeMode;
    if (activeTheme === 'system' || !activeTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeTheme = prefersDark ? 'dark' : 'light';
    }

    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [settings.themeMode]);

  // Toggle theme utility
  const toggleThemeMode = async () => {
    const nextTheme = settings.themeMode === 'dark' ? 'light' : 'dark';
    const nextSettings = { ...settings, themeMode: nextTheme };
    setSettings(nextSettings);

    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(nextSettings)
      });
    } catch (err) {
      console.error("Failed to save settings theme", err);
    }
  };

  // Complete Onboarding (saves and seeds starting workout plan)
  const handleCompleteOnboarding = async (profileData) => {
    setIsLoading(true);
    try {
      // 1. Save profile (this seeds default workout phases internally in backend)
      await apiFetch('/api/profile', {
        method: 'POST',
        body: JSON.stringify(profileData)
      });

      // 2. Initialize first daily log
      const firstLog = {
        workoutDone: false,
        proteinLog: [],
        caloriesQuick: '',
        water: 0,
        cigarettes: profileData.target_cigarettes,
        sleep: '',
        notes: 'Challenge started! Plan generated.',
        exercisesCompleted: {},
        isFastDay: profileData.fasting_days.includes(new Date(profileData.start_date).toLocaleDateString('en-US', { weekday: 'long' }))
      };

      await apiFetch(`/api/daily-logs/${profileData.start_date}`, {
        method: 'POST',
        body: JSON.stringify(firstLog)
      });

      // Reload
      await fetchAllData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Onboarding failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile handler
  // Update profile handler
  const handleUpdateProfile = async (updatedProfile) => {
    try {
      await apiFetch('/api/profile', {
        method: 'POST',
        body: JSON.stringify(updatedProfile)
      });
      setProfile(prev => ({ ...prev, ...updatedProfile }));
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  // Update specific day's log entry
  const handleUpdateDailyLog = async (dateStr, logData) => {
    // Optimistic UI update
    setDailyLogs(prev => ({ ...prev, [dateStr]: logData }));

    try {
      await apiFetch(`/api/daily-logs/${dateStr}`, {
        method: 'POST',
        body: JSON.stringify(logData)
      });
    } catch (err) {
      console.error("Failed to save daily log", err);
    }
  };

  // Update full workout plan library
  const handleUpdateWorkoutPlan = async (newPlan) => {
    setWorkoutPlan(newPlan);
    try {
      await apiFetch('/api/workout-plan', {
        method: 'PUT',
        body: JSON.stringify(newPlan)
      });
    } catch (err) {
      console.error("Failed to save workout plan library", err);
    }
  };

  // Reset workout plan library to defaults
  const handleResetWorkoutPlan = async () => {
    setIsLoading(true);
    try {
      await apiFetch('/api/workout-plan/reset', { method: 'POST' });
      const planRes = await apiFetch('/api/workout-plan');
      const planData = await planRes.json();
      setWorkoutPlan(planData);
    } catch (err) {
      console.error("Failed to reset workout plan library", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI Diet Plan using Gemini
  const handleGenerateAIDiet = async () => {
    try {
      const res = await apiFetch('/api/profile/generate-diet', { method: 'POST' });
      const data = await res.json();
      if (data && data.aiDietPlan) {
        setProfile(prev => ({ ...prev, aiDietPlan: data.aiDietPlan }));
        return data.aiDietPlan;
      }
    } catch (err) {
      console.error("Failed to generate AI diet plan", err);
      alert("Failed to generate AI diet plan: " + err.message);
    }
  };

  // Save settings updates
  const handleUpdateSettings = async (nextSettings) => {
    setSettings(nextSettings);
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(nextSettings)
      });
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  };

  // Add sunday checkin
  const handleAddCheckIn = async (checkIn) => {
    setWeeklyCheckIns(prev => [...prev, checkIn].sort((a, b) => new Date(a.date) - new Date(b.date)));
    try {
      await apiFetch('/api/weekly-checkins', {
        method: 'POST',
        body: JSON.stringify(checkIn)
      });
    } catch (err) {
      console.error("Failed to add check-in", err);
    }
  };

  // Delete sunday checkin
  const handleDeleteCheckIn = async (dateStr) => {
    setWeeklyCheckIns(prev => prev.filter(c => c.date !== dateStr));
    try {
      await apiFetch(`/api/weekly-checkins/${dateStr}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Failed to delete check-in", err);
    }
  };

  // Reset database entirely
  const handleResetAllData = async () => {
    setIsLoading(true);
    try {
      await apiFetch('/api/reset', { method: 'POST' });
      setProfile({ isOnboarded: false });
      setDailyLogs({});
      setWeeklyCheckIns([]);
      setWorkoutPlan({});
      setSettings({ themeMode: 'light', notificationsEnabled: false });
    } catch (err) {
      console.error("Failed to reset database", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Restore database from backup upload
  const handleImportData = async (importedState) => {
    setIsLoading(true);
    try {
      await apiFetch('/api/import', {
        method: 'POST',
        body: JSON.stringify(importedState)
      });
      await fetchAllData();
    } catch (err) {
      console.error("Failed to import database backup", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Seed historical mock data (calculates on client, inserts into DB)
  const handleSeedData = async () => {
    setIsLoading(true);
    try {
      const { dailyLogs: mockLogs, weeklyCheckIns: mockCheckins } = seedSampleData(
        profile.starting_weight || profile.startingWeight || 80,
        profile.height_cm || profile.height || 175,
        profile.start_date || profile.startDate || getLocalDateString()
      );

      await apiFetch('/api/seed', {
        method: 'POST',
        body: JSON.stringify({ dailyLogs: mockLogs, weeklyCheckIns: mockCheckins })
      });

      await fetchAllData();
    } catch (err) {
      console.error("Failed to seed database", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render spinner while loading initially
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center space-y-4 transition-colors duration-200">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
        <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Loading FitHabit Tracker...</span>
      </div>
    );
  }

  // Render Login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // If user has not completed onboarding flow, render portal
  if (!profile.isOnboarded) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: <Flame className="w-5 h-5" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
    { id: 'milestones', label: 'Milestones', icon: <Award className="w-5 h-5" /> },
    { id: 'analytics', label: 'Progress', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'workout', label: 'Workout', icon: <Dumbbell className="w-5 h-5" /> },
    { id: 'diet', label: 'Diet Guide', icon: <Apple className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> }
  ];

  // Map backend key schema to frontend component expectations
  const normalizedProfile = {
    ...profile,
    height: profile.height_cm,
    startingWeight: profile.starting_weight,
    targetWeight: profile.goal_weight,
    targetProtein: profile.target_protein,
    targetCalories: profile.target_calories,
    targetCigarettes: profile.target_cigarettes,
    startDate: profile.start_date,
    fastingDays: profile.fasting_days || []
  };

  // Full state bundle used for export backups
  const fullStateBundle = {
    profile: normalizedProfile,
    settings,
    dailyLogs,
    weeklyCheckIns,
    workoutPlan
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 flex flex-col md:flex-row relative transition-colors duration-200">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex-col justify-between shrink-0 h-screen sticky top-0 transition-colors duration-200">
        <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
          
          {/* Logo Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500 rounded-xl text-neutral-950">
                <CheckSquare className="w-5 h-5 stroke-[2.5px]" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-neutral-900 dark:text-white m-0">FitHabit</h1>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest block -mt-1">60-Day Journal</span>
              </div>
            </div>
            {/* Quick theme toggles */}
            <button
              onClick={toggleThemeMode}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-750 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition active:scale-95"
              title="Toggle Light/Dark Theme"
            >
              {settings.themeMode === 'dark' ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    activeTab === item.id
                      ? 'bg-emerald-500 text-neutral-950 shadow-lg scale-102 font-extrabold'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all mt-6"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </button>
          </nav>
        </div>

        {/* User Badge */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-850 bg-neutral-50/50 dark:bg-neutral-950/20 flex items-center gap-2.5">
          {user?.picture ? (
            <img src={user.picture} alt="User avatar" className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-extrabold text-orange-500 dark:text-orange-400 border border-neutral-300 dark:border-neutral-700">
              {profile.name ? profile.name[0].toUpperCase() : 'U'}
            </div>
          )}
          <div className="truncate flex-1">
            <span className="text-xs font-bold text-neutral-800 dark:text-white block truncate">{profile.name || user?.name || 'Guest User'}</span>
            <span className="text-[9px] text-neutral-500 block truncate">{user?.email || 'Offline Session'}</span>
          </div>
        </div>
      </aside>

      {/* BOTTOM NAV BAR FOR MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-neutral-900/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800 px-2 py-2 flex justify-around items-center z-50 transition-colors duration-200">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTab === item.id ? 'text-emerald-500' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-bold tracking-wide uppercase">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* MAIN LAYOUT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* Mobile Header Banner */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500 rounded-lg text-neutral-950">
              <CheckSquare className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <span className="text-sm font-black tracking-tight text-neutral-900 dark:text-white uppercase">FitHabit</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleThemeMode}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:text-white"
            >
              {settings.themeMode === 'dark' ? <Sun className="w-3.5 h-3.5 text-orange-400" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 py-1.5 px-3 rounded-full shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Day {(Math.max(1, Math.floor((new Date() - new Date(profile.start_date)) / (1000 * 60 * 60 * 24)) + 1))}</span>
            </div>
          </div>
        </div>

        {/* Tab Routers */}
        <div>
          {activeTab === 'dashboard' && (
            <Dashboard
              profile={normalizedProfile}
              dailyLogs={dailyLogs}
              weeklyCheckIns={weeklyCheckIns}
              onUpdateDailyLog={handleUpdateDailyLog}
              onNavigate={setActiveTab}
              workoutPlan={workoutPlan}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              profile={normalizedProfile}
              dailyLogs={dailyLogs}
              onUpdateDailyLog={handleUpdateDailyLog}
              workoutPlan={workoutPlan}
            />
          )}

          {activeTab === 'milestones' && (
            <Milestones
              profile={normalizedProfile}
              weeklyCheckIns={weeklyCheckIns}
              onAddCheckIn={handleAddCheckIn}
              onDeleteCheckIn={handleDeleteCheckIn}
            />
          )}

          {activeTab === 'analytics' && (
            <ProgressAnalytics
              profile={normalizedProfile}
              dailyLogs={dailyLogs}
              weeklyCheckIns={weeklyCheckIns}
            />
          )}

          {activeTab === 'workout' && (
            <WorkoutLibrary
              workoutPlan={workoutPlan}
              onUpdateWorkoutPlan={handleUpdateWorkoutPlan}
              onResetWorkoutPlan={handleResetWorkoutPlan}
            />
          )}

          {activeTab === 'diet' && (
            <DietReference
              profile={normalizedProfile}
              onUpdateDailyLog={handleUpdateDailyLog}
              dailyLogs={dailyLogs}
              onGenerateAIDiet={handleGenerateAIDiet}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsProfile
              profile={normalizedProfile}
              settings={settings}
              onUpdateProfile={handleUpdateProfile}
              onUpdateSettings={handleUpdateSettings}
              onResetAllData={handleResetAllData}
              onImportData={handleImportData}
              fullState={fullStateBundle}
              onSeedData={handleSeedData}
            />
          )}
        </div>
      </main>

    </div>
  );
}
