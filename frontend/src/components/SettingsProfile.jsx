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
    gender: profile.gender || 'male',
    height_cm: profile.height_cm || 175,
    starting_weight: profile.starting_weight || 80,
    goal_weight: profile.goal_weight || 75,
    target_protein: profile.target_protein || 160,
    target_calories: profile.target_calories || 2200,
    target_cigarettes: profile.target_cigarettes || 5,
    start_date: profile.start_date || getLocalDateString(),
    fasting_days: profile.fasting_days || [],
    country: profile.country || 'India',
    diet_type: profile.diet_type || 'vegetarian',
    typical_meals: profile.typical_meals || '',
    workout_time_available: profile.workout_time_available || '1 hr',
    medical_conditions: profile.medical_conditions || [],
    primary_goal: profile.primary_goal || 'Weight Loss',
    preferred_rest_days: profile.preferred_rest_days || ['Sunday']
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'start_date' || name === 'country' || name === 'diet_type' || name === 'typical_meals' || name === 'workout_time_available' || name === 'primary_goal' || name === 'gender'
        ? value 
        : parseFloat(value) || 0
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

  // Toggle preferred rest days in settings
  const toggleRestDaySetting = (day) => {
    const current = [...profileForm.preferred_rest_days];
    let next = [];
    if (current.includes(day)) {
      next = current.filter(d => d !== day);
    } else {
      next = [...current, day];
    }
    setProfileForm(prev => ({ ...prev, preferred_rest_days: next }));
  };

  // Toggle medical condition checkbox in settings
  const toggleMedicalConditionSetting = (cond) => {
    const current = [...profileForm.medical_conditions];
    let next = [];
    if (current.includes(cond)) {
      next = current.filter(c => c !== cond);
    } else {
      next = [...current, cond];
    }
    setProfileForm(prev => ({ ...prev, medical_conditions: next }));
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    alert("Profile, targets, and workout splits updated and synchronized with Supabase database!");
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
  const handleImportDataLocal = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        onImportData(data);
      } catch (err) {
        alert("Invalid backup file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (confirm("CRITICAL WARNING: This will permanently delete ALL logged database entries, custom progressive workout plans, and goals. This cannot be undone. Are you absolutely sure?")) {
      onResetAllData();
      alert("All data cleared.");
      window.location.reload();
    }
  };

  const handleSeedData = () => {
    if (confirm("This will seed realistic logs for the past 14 days and Sunday check-ins. Proceed?")) {
      onSeedData();
    }
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const medicalOptions = ["Diabetes", "Thyroid", "High BP", "Joint/knee issues", "None"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* LEFT COLUMN: Profile info (7 cols) */}
      <form onSubmit={handleProfileSubmit} className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-2 font-sans">
          <User className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          Edit Profile & Goals
        </h3>

        <div className="space-y-4 text-xs md:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Plan Start Date</label>
              <input
                type="date"
                name="start_date"
                value={profileForm.start_date}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Age</label>
              <input
                type="number"
                name="age"
                value={profileForm.age}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Height (cm)</label>
              <input
                type="number"
                name="height_cm"
                value={profileForm.height_cm}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none text-center"
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
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Country / Region</label>
              <select
                name="country"
                value={profileForm.country}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
              >
                <option value="India">India (Indian Meals)</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Other">Other / Global</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Diet Type</label>
              <select
                name="diet_type"
                value={profileForm.diet_type}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="non-vegetarian">Non-Vegetarian</option>
                <option value="eggetarian">Eggetarian</option>
                <option value="vegan">Vegan</option>
                <option value="jain">Jain Diet</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Workout Duration</label>
              <select
                name="workout_time_available"
                value={profileForm.workout_time_available}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
              >
                <option value="30 min">30 min (Shorter)</option>
                <option value="1 hr">1 hr (Standard)</option>
                <option value="1.5 hr">1.5 hr (High volume)</option>
                <option value="2 hr">2 hr (Peak Conditioning)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Primary fitness goal</label>
            <select
              name="primary_goal"
              value={profileForm.primary_goal}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
            >
              <option value="Weight Loss">Weight Loss (Fat Deficit)</option>
              <option value="Muscle Gain">Muscle Gain (Hypertrophy Surplus)</option>
              <option value="Body Recomposition">Body Recomposition (Lean & Tone)</option>
              <option value="General Fitness">General Conditioning & Health</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Typical Daily Meals Pattern</label>
            <textarea
              name="typical_meals"
              value={profileForm.typical_meals}
              onChange={handleProfileChange}
              rows="2"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-250 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Medical Conditions checkboxes */}
          <div className="space-y-2 bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">Medical Conditions</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {medicalOptions.map(cond => {
                const isSelected = profileForm.medical_conditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleMedicalConditionSetting(cond)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'bg-white dark:bg-neutral-900 border-neutral-255 dark:border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {cond}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rest Days selector */}
          <div className="space-y-2 bg-neutral-50 dark:bg-neutral-950/40 p-4 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">Preferred Rest Day(s) (regenerates split splits)</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {daysOfWeek.map(day => {
                const isRest = profileForm.preferred_rest_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleRestDaySetting(day)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      isRest
                        ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold'
                        : 'bg-white dark:bg-neutral-900 border-neutral-255 dark:border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-850" />

          {/* Fasting Days selector */}
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
                <Moon className="w-4 h-4 text-emerald-500" /> Dark Mode
              </button>
            </div>
          </div>

          {/* Daily Reminders */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 block">Daily Reminder Alerts</span>
            <div className="space-y-3 bg-neutral-50 dark:bg-neutral-950/40 p-3.5 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Push Notifications</span>
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition ${
                    settings.notificationsEnabled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-neutral-200 dark:bg-neutral-850 text-neutral-500 hover:bg-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  {settings.notificationsEnabled ? 'Enabled ✓' : 'Click to Enable'}
                </button>
              </div>

              {settings.notificationsEnabled && (
                <div className="space-y-2.5 pt-2.5 border-t border-neutral-200 dark:border-neutral-850 flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500">Reminder Daily Time:</span>
                    <input
                      type="time"
                      value={settings.notificationTime}
                      onChange={(e) => onUpdateSettings({ ...settings, notificationTime: e.target.value })}
                      className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendTestNotification}
                    className="w-full py-1.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 border border-neutral-250 dark:border-neutral-800 hover:border-neutral-400 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-500" /> Send Test Alert
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Database backup & restore */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Data Backup & Restore
          </h3>

          <p className="text-xs text-neutral-505 leading-relaxed">
            Backup your journal local copy. Import back files to sync between devices.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleExportData}
              className="py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-750 dark:text-neutral-205 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export Backup
            </button>

            <label className="py-2.5 bg-neutral-105 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-750 dark:text-neutral-205 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <Upload className="w-4 h-4" /> Import Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportDataLocal}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Database seeding & clean reset */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 transition-colors duration-200">
          <h3 className="text-sm font-bold text-red-500 dark:text-red-400 tracking-wide uppercase border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h3>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleSeedData}
              className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Seed 14 Days Sample Logs
            </button>

            <button
              onClick={handleClearData}
              className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
