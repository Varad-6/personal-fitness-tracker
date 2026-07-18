import React from 'react';

export default function Logo({ className = "w-8 h-8" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoFlameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path 
        d="M50 90 C 35 90, 20 75, 20 55 C 20 40, 30 25, 45 10 C 47 8, 50 10, 50 13 C 50 25, 58 30, 62 38 C 66 45, 68 53, 68 60 C 68 76, 60 90, 50 90 Z M45 32 C 40 38, 35 46, 35 55 C 35 63, 42 70, 50 70 C 58 70, 60 62, 60 55 C 60 48, 52 42, 45 32 Z" 
        fill="url(#logoFlameGrad)" 
      />
    </svg>
  );
}
