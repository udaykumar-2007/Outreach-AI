import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFilterStore } from '../store/filterStore.js';
import { useAuthStore } from '../store/authStore.js';

export const Navbar: React.FC = () => {
  const { persona, setPersona, platform, setPlatform } = useFilterStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile?.role) {
      setPersona(profile.role);
    }
  }, [profile, setPersona]);

  return (
    <motion.header 
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="h-16 border-b border-[#EACEAA]/10 bg-[#0B0F14]/70 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-40"
    >
      {/* Persona Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Active Mode</span>
        <div className="bg-[#34150F]/20 border border-[#EACEAA]/10 p-0.5 rounded-xl flex gap-0.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPersona('student')}
            className={`px-3.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-300 ${
              persona === 'student'
                ? 'bg-[#EACEAA]/15 text-[#EACEAA] border border-[#EACEAA]/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Student Mode
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPersona('freelancer')}
            className={`px-3.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-300 ${
              persona === 'freelancer'
                ? 'bg-[#EACEAA]/15 text-[#EACEAA] border border-[#EACEAA]/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Freelancer Mode
          </motion.button>
        </div>
      </div>

      {/* Platform Filters */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono hidden sm:inline">Platform Filter</span>
        <div className="bg-[#34150F]/20 border border-[#EACEAA]/10 p-0.5 rounded-xl flex gap-0.5">
          {(['all', 'linkedin', 'twitter', 'upwork', 'devto'] as const).map((p) => (
            <motion.button
              key={p}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${
                platform === p
                  ? 'bg-[#EACEAA]/15 border-[#EACEAA]/30 text-[#EACEAA] shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {p === 'devto' ? 'dev.to' : p === 'all' ? 'All Channels' : p}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.header>
  );
};
