import React, { useEffect } from 'react';
import { useFilterStore } from '../store/filterStore.js';
import { useAuthStore } from '../store/authStore.js';


export const Navbar: React.FC = () => {
  const { persona, setPersona, platform, setPlatform } = useFilterStore();
  const { profile } = useAuthStore();

  // Keep persona in sync with profile role initially
  useEffect(() => {
    if (profile?.role) {
      setPersona(profile.role);
    }
  }, [profile, setPersona]);

  return (
    <header className="h-20 border-b border-slate-800 bg-slate-950/45 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
      {/* Persona Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Persona</span>
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setPersona('student')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              persona === 'student'
                ? 'bg-blue-600 text-white shadow shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Student Mode
          </button>
          <button
            onClick={() => setPersona('freelancer')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              persona === 'freelancer'
                ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Freelancer Mode
          </button>
        </div>
      </div>

      {/* Platform Filters */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Platform Filter</span>
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1">
          {(['all', 'linkedin', 'twitter', 'upwork', 'devto'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                platform === p
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p === 'devto' ? 'dev.to' : p}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
