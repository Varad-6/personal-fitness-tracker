import React, { useState } from 'react';
import { 
  User, Settings, Download, Upload, Trash2, Moon, Sun, 
  Bell, Database, Play, CheckCircle2, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { seedSampleData, getLocalDateString } from '../utils/helpers';

export default function SettingsProfile({ 
  profile, 
  settings, 
  onUpdateProfile, 
  onUpdateSettings, 
  onResetAllData, 
  onImportData, 
  fullState,
  onSeedData 
}) {
  // Form profile state
  const [profileForm, setProfileForm] = useState({
    name: profile.name || '',
    age: profile.age || 25,
    height_cm: profile.height_cm || 175,
    starting_weight: profile.starting_weight || 80,
    goal_weight: profile.goal_weight || 75,
    target_protein: profile.target_protein || 160,
    target_calories: profile.target_calories || 2200,
    target_cigarettes: profile.target_cigarettes || 5,
    start_date: profile.start_date || getLocalDateString(),
    fasting_days: profile.fasting_days || []
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'start_date' ? value : parseFloat(value) || 0
    }));
  };

  // Toggle fasting day check in settings
  const toggleFastingDaySetting = (day) => {
    const current = [...profileForm.fasting_days];
    let next = [];
    if (current.includes(day)) {
      next = current.filter(d => d !== day);
    } else {
      next = [...current, day];
    }
    setProfileForm(prev => ({ ...prev, fasting_days: next }));
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    alert("Profile and targets updated successfully in SQLite database!");
  };

  // Notification permissions request
  const requestNotificationPermission = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        onUpdateSettings({ ...settings, notificationsEnabled: true });
        new Notification("Notifications Enabled!", {
          body: "We'll send you daily reminders to log your fitness journal."
        });
      } else {
        onUpdateSettings({ ...settings, notificationsEnabled: false });
        alert("Notifications permission denied.");
      }
    });
  };

  const sendTestNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("FitHabit Reminder 🏋️‍♂️", {
        body: "Have you logged your workout, protein, and habits for today?",
        icon: "/favicon.ico"
      });
    } else {
      alert("Notification permission is not granted. Enable it first.");
    }
  };

  // Export JSON backup file
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `fithabit_db_backup_${getLocalDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup file
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.profile && parsed.dailyLogs && parsed.workoutPlan) {
            onImportData(parsed);
            alert("Database restore completed successfully!");
          } else {
            alert("Error: Invalid backup file format.");
          }
        } catch (err) {
          alert("Error parsing backup JSON. Ensure the file is not corrupted.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClearData = () => {
    if (confirm("CRITICAL WARNING: This will permanently delete ALL logged SQLite database entries, custom progressive workout plans, and goals. This cannot be undone. Are you absolutely sure?")) {
      onResetAllData();
      alert("All SQLite data cleared.");
      window.location.reload();
    }
  };

  const handleSeedData = () => {
    if (confirm("This will seed realistic SQLite logs for the past 14 days and Sunday check-ins. Proceed?")) {
      onSeedData();
    }
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* LEFT COLUMN: Profile info (7 cols) */}
      <form onSubmit={handleProfileSubmit} className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          Edit Profile & Goals
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Plan Start Date</label>
              <input
                type="date"
                name="start_date"
                value={profileForm.start_date}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Age</label>
              <input
                type="number"
                name="age"
                value={profileForm.age}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Height (cm)</label>
              <input
                type="number"
                name="height_cm"
                value={profileForm.height_cm}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Start Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="starting_weight"
                value={profileForm.starting_weight}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850" />

          {/* Fasting Days selector in settings */}
          <div className="space-y-2 bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">Fasting Days Setup</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {daysOfWeek.map(day => {
                const isSelected = profileForm.fasting_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleFastingDaySetting(day)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Target weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="goal_weight"
                value={profileForm.goal_weight}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Target Protein (g)</label>
              <input
                type="number"
                name="target_protein"
                value={profileForm.target_protein}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Target Calories (kcal)</label>
              <input
                type="number"
                name="target_calories"
                value={profileForm.target_calories}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Target Cigarettes Max</label>
              <input
                type="number"
                name="target_cigarettes"
                value={profileForm.target_cigarettes}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl shadow-md transition"
        >
          Save Changes
        </button>
      </form>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* System settings */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            System Preferences
          </h3>

          {/* Theme Mode Option */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">Color Theme Mode</span>
            <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-neutral-950/40 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-850">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, themeMode: 'light' })}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  settings.themeMode === 'light'
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200'
                    : 'text-neutral-500 dark:text-neutral-450 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-orange-500" /> Light Mode
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, themeMode: 'dark' })}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  settings.themeMode === 'dark'
                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                    : 'text-neutral-500 dark:text-neutral-450 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" /> Dark Mode
              </button>
            </div>
          </div>

          {/* Log reminders */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">Daily Push Reminder</span>
            <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-950/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-850">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Log Reminders</span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">Reminder to log every evening</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    settings.notificationsEnabled
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  {settings.notificationsEnabled ? 'Enabled' : 'Allow'}
                </button>
                {settings.notificationsEnabled && (
                  <button
                    type="button"
                    onClick={sendTestNotification}
                    className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Test
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Database Backups */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Database & Backups
          </h3>

          <div className="space-y-3">
            <div className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10 space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block font-bold">Interactive Demo Mode</span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-450 leading-relaxed">
                Seed SQLite database with 14 days of mock data to immediately inspect the analytics, streaks, and graphs.
              </p>
              <button
                type="button"
                onClick={handleSeedData}
                className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400" />
                Seed SQLite Demo Data
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportData}
                className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 hover:border-neutral-450 text-neutral-600 dark:text-neutral-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export Backup
              </button>
              
              <div className="relative">
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button
                  type="button"
                  className="w-full py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 hover:border-neutral-455 text-neutral-600 dark:text-neutral-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 pointer-events-none shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import Backup
                </button>
              </div>
            </div>

            <hr className="border-neutral-200 dark:border-neutral-850 my-2" />

            <button
              type="button"
              onClick={handleClearData}
              className="w-full py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 text-red-500 dark:text-red-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Reset Database (Delete All)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
