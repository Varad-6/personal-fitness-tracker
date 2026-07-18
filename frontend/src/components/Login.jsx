import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, Mail, User, Sparkles, AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load Google identity SDK dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          // Check for local Vite environment variable
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-mockclientid.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById('google-btn-container'),
          { 
            theme: 'outline', 
            size: 'large', 
            text: 'signin_with',
            shape: 'pill',
            width: '280'
          }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Handle real Google Login
  const handleGoogleCredentialResponse = async (response) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      
      if (res.status === 200) {
        const data = await res.json();
        onLoginSuccess(data.token, data.user);
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || "Google authentication failed. Use guest login.");
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Could not contact the backend. Ensure the FastAPI server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle guest bypass login
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() })
      });

      if (res.status === 200) {
        const data = await res.json();
        onLoginSuccess(data.token, data.user);
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || "Mock login failed.");
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Could not connect to FastAPI server. Please check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 py-12 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden text-neutral-800 dark:text-neutral-100">
        
        {/* Glow lights */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>

        {/* Logo and Greeting */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 dark:text-emerald-400 mb-1">
            <ShieldCheck className="w-8 h-8 stroke-[2.5px]" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Welcome to FitHabit</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Log your workouts, macros, water, habits, and weekly checkins securely.
          </p>
        </div>

        {/* Google sign-in container */}
        <div className="flex flex-col items-center justify-center space-y-3 pt-2 relative z-10">
          <div id="google-btn-container" className="min-h-10"></div>
        </div>

        <div className="relative flex py-2 items-center text-xs text-neutral-400 uppercase tracking-widest relative z-10">
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
          <span className="flex-shrink mx-4 font-bold text-neutral-450 dark:text-neutral-500">OR</span>
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
        </div>

        {/* Guest sign-in form */}
        <form onSubmit={handleGuestSubmit} className="space-y-4 relative z-10">
          <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 block text-center uppercase tracking-wider">Continue as guest</span>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. guest@fithabit.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">Your Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Varad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs font-semibold text-red-500 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-neutral-950 font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 fill-neutral-950" />
            <span>{isLoading ? 'Connecting...' : 'Start Guest Journal'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}
