import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Check, RotateCcw, Dumbbell, 
  ChevronRight, Calendar, Sparkles, X, ChevronDown, ChevronUp 
} from 'lucide-react';
import Timer from './Timer';

export default function WorkoutLibrary({ 
  workoutPlan, 
  onUpdateWorkoutPlan, 
  onResetWorkoutPlan 
}) {
  // Determine dynamically generated phases from plan
  const phases = Object.keys(workoutPlan);
  const [selectedPhase, setSelectedPhase] = useState(() => phases[0] || "Week 1");
  const [selectedDay, setSelectedDay] = useState("Monday");
  
  // Editing state
  const [editingExId, setEditingExId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    sets: 3,
    reps: '',
    muscleGroup: ''
  });

  // Adding state
  const [isAdding, setIsAdding] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    sets: 3,
    reps: '12',
    muscleGroup: 'Chest'
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const currentDayPlan = workoutPlan[selectedPhase]?.[selectedDay] || { focus: 'Rest', exercises: [] };

  const startEdit = (ex) => {
    setEditingExId(ex.id);
    setEditFormData({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      muscleGroup: ex.muscleGroup
    });
  };

  const cancelEdit = () => {
    setEditingExId(null);
  };

  const saveEdit = (exId) => {
    if (!editFormData.name.trim()) return;

    const updatedExercises = currentDayPlan.exercises.map(ex => {
      if (ex.id === exId) {
        return {
          id: exId,
          name: editFormData.name,
          sets: parseInt(editFormData.sets) || 3,
          reps: editFormData.reps,
          muscleGroup: editFormData.muscleGroup
        };
      }
      return ex;
    });

    updateExercisesForDay(updatedExercises);
    setEditingExId(null);
  };

  const handleAddExercise = (e) => {
    e.preventDefault();
    if (!addFormData.name.trim()) return;

    const newEx = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: addFormData.name,
      sets: parseInt(addFormData.sets) || 3,
      reps: addFormData.reps,
      muscleGroup: addFormData.muscleGroup
    };

    const updatedExercises = [...currentDayPlan.exercises, newEx];
    updateExercisesForDay(updatedExercises);

    setAddFormData({
      name: '',
      sets: 3,
      reps: '12',
      muscleGroup: 'Chest'
    });
    setIsAdding(false);
  };

  const deleteExercise = (exId) => {
    const updatedExercises = currentDayPlan.exercises.filter(ex => ex.id !== exId);
    updateExercisesForDay(updatedExercises);
  };

  const updateExercisesForDay = (newExercises) => {
    const updatedPlan = { ...workoutPlan };
    updatedPlan[selectedPhase][selectedDay] = {
      ...currentDayPlan,
      exercises: newExercises
    };
    onUpdateWorkoutPlan(updatedPlan);
  };

  const updateDayFocus = (newFocus) => {
    const updatedPlan = { ...workoutPlan };
    updatedPlan[selectedPhase][selectedDay] = {
      ...currentDayPlan,
      focus: newFocus
    };
    onUpdateWorkoutPlan(updatedPlan);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the entire workout plan library to defaults? All custom changes will be lost.")) {
      onResetWorkoutPlan();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-6 text-neutral-800 dark:text-neutral-100 transition-colors duration-200">
      
      {/* LEFT PANEL */}
      <div className="lg:col-span-4 space-y-6">
        <Timer />

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4 transition-colors duration-200">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide uppercase">Plan Actions</h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Modify exercises to fit your gym equipment availability. All changes save to your database plan.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-2.5 px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Plan to Default
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-200">
        
        {/* Phase selection pills */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-neutral-200 dark:border-neutral-800">
          {phases.map((phase) => (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border shrink-0 ${
                selectedPhase === phase
                  ? 'bg-orange-500 border-orange-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-250 dark:border-neutral-700 text-neutral-500 dark:text-neutral-450 hover:border-neutral-350 dark:hover:border-neutral-600'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>

        {/* Weekday selection buttons */}
        <div className="flex flex-wrap gap-1.5">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                selectedDay === day
                  ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-white font-bold'
                  : 'bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Exercises view */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">
                {selectedPhase} • {selectedDay}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="text"
                  value={currentDayPlan.focus}
                  onChange={(e) => updateDayFocus(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-orange-500 text-xl font-extrabold text-neutral-900 dark:text-white focus:outline-none py-0.5"
                  title="Click to rename workout focus"
                />
              </div>
            </div>
            {!selectedDay.includes('Sunday') && (
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {isAdding ? 'Cancel' : 'Add Exercise'}
              </button>
            )}
          </div>

          {/* Add Exercise Form */}
          {isAdding && (
            <form onSubmit={handleAddExercise} className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Exercise Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Incline Bench Press"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-750 px-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Sets</label>
                <input
                  type="number"
                  required
                  value={addFormData.sets}
                  onChange={(e) => setAddFormData({...addFormData, sets: e.target.value})}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-750 px-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none text-center"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Reps</label>
                <input
                  type="text"
                  required
                  value={addFormData.reps}
                  onChange={(e) => setAddFormData({...addFormData, reps: e.target.value})}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-750 px-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none text-center"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">Muscle Group</label>
                <select
                  value={addFormData.muscleGroup}
                  onChange={(e) => setAddFormData({...addFormData, muscleGroup: e.target.value})}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-750 px-2 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none"
                >
                  {["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Forearms", "Core", "Full Body", "Cardio"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {/* Exercises list */}
          {selectedDay.includes('Sunday') ? (
            <div className="p-8 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/20 rounded-2xl text-center text-xs text-neutral-550 transition-colors duration-200">
              🛌 Sunday is rest, recovery, and check-in day! No gym sessions scheduled.
            </div>
          ) : currentDayPlan.exercises.length === 0 ? (
            <p className="text-xs text-neutral-500 italic text-center py-6">
              No exercises logged for this workout day. Add one using the button.
            </p>
          ) : (
            <div className="space-y-2">
              {currentDayPlan.exercises.map((ex) => {
                const isEditing = editingExId === ex.id;
                
                if (isEditing) {
                  return (
                    <div key={ex.id} className="bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 p-3.5 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center transition-colors">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 px-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          value={editFormData.sets}
                          onChange={(e) => setEditFormData({...editFormData, sets: e.target.value})}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 px-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none text-center"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={editFormData.reps}
                          onChange={(e) => setEditFormData({...editFormData, reps: e.target.value})}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 px-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none text-center"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={editFormData.muscleGroup}
                          onChange={(e) => setEditFormData({...editFormData, muscleGroup: e.target.value})}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 px-2 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none"
                        >
                          {["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Forearms", "Core", "Full Body", "Cardio"].map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2 flex gap-1 justify-end">
                        <button
                          onClick={() => saveEdit(ex.id)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-xl transition"
                          title="Save changes"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 hover:border-neutral-400 text-neutral-500 rounded-xl transition"
                          title="Cancel editing"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={ex.id}
                    className="flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-950/20 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl hover:border-neutral-350 dark:hover:border-neutral-750 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-orange-500 dark:text-orange-400">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">{ex.name}</span>
                        <span className="text-[10px] text-neutral-450 dark:text-neutral-500 uppercase tracking-widest font-semibold block">{ex.muscleGroup}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right text-xs">
                        <span className="font-bold text-neutral-700 dark:text-neutral-350 block">{ex.sets} Sets</span>
                        <span className="text-neutral-450 dark:text-neutral-500 block">{ex.reps} Reps</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(ex)}
                          className="p-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 text-neutral-550 hover:text-neutral-900 dark:hover:text-white rounded-lg transition"
                          title="Edit Exercise"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteExercise(ex.id)}
                          className="p-1.5 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-250 dark:border-neutral-800/80 text-neutral-400 hover:text-red-500 rounded-lg transition"
                          title="Delete Exercise"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
