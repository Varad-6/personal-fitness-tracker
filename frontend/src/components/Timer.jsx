import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export default function Timer() {
  const [duration, setDuration] = useState(60); // in seconds
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            triggerAlert();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const triggerAlert = () => {
    if (soundEnabled) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          
          // Sound 1 (Low beep)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          gain1.gain.setValueAtTime(0.15, ctx.currentTime);
          osc1.start(ctx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc1.stop(ctx.currentTime + 0.2);

          // Sound 2 (High beep)
          setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
            gain2.gain.setValueAtTime(0.15, ctx.currentTime);
            osc2.start(ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc2.stop(ctx.currentTime + 0.3);
          }, 150);

          // Sound 3 (Higher beep)
          setTimeout(() => {
            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.connect(gain3);
            gain3.connect(ctx.destination);
            osc3.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
            gain3.gain.setValueAtTime(0.15, ctx.currentTime);
            osc3.start(ctx.currentTime);
            gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc3.stop(ctx.currentTime + 0.4);
          }, 300);
        }
      } catch (err) {
        console.error("Web Audio API failed", err);
      }
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  };

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const selectPreset = (secs) => {
    setIsRunning(false);
    setDuration(secs);
    setTimeLeft(secs);
  };

  // Format time display
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Calculate percentage for progress circle
  const progressPercent = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center space-y-4">
      <div className="w-full flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-400 tracking-wide uppercase">Rest Timer</h3>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1.5 rounded-lg border transition ${
            soundEnabled 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-neutral-800 border-neutral-700 text-neutral-500'
          }`}
          title={soundEnabled ? "Mute Timer Sound" : "Unmute Timer Sound"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Circle Countdown visual */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="absolute w-full h-full -rotate-90">
          <circle
            cx="72"
            cy="72"
            r="64"
            className="stroke-neutral-800 fill-none"
            strokeWidth="8"
          />
          <circle
            cx="72"
            cy="72"
            r="64"
            className="stroke-orange-500 fill-none transition-all duration-1000 ease-linear"
            strokeWidth="8"
            strokeDasharray={402}
            strokeDashoffset={402 - (402 * progressPercent) / 100}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <span className="text-3xl font-mono font-bold text-white block">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
            {isRunning ? 'Resting' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Preset select options */}
      <div className="flex gap-2 w-full justify-center">
        {[45, 60, 90, 120].map((secs) => (
          <button
            key={secs}
            onClick={() => selectPreset(secs)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              duration === secs && !isRunning
                ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            {secs}s
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={handleReset}
          className="flex-1 py-2 px-3 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button
          onClick={handleStartStop}
          className={`flex-1 py-2 px-3 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 text-neutral-950 ${
            isRunning 
              ? 'bg-neutral-300 hover:bg-neutral-400' 
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-neutral-950" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-neutral-950" /> Start
            </>
          )}
        </button>
      </div>
    </div>
  );
}
