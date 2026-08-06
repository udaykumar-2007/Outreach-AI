import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC<{ message?: string; onComplete?: () => void }> = ({ 
  message = 'Loading AI OS System...', 
  onComplete 
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          if (onComplete) onComplete();
          return 100;
        }
        return prev + 5;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F14] flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Background HUD Grid */}
      <div className="absolute inset-0 hud-grid opacity-[0.15] pointer-events-none" />
      
      {/* Volumetric glow circle */}
      <div className="absolute w-[400px] h-[400px] bg-[#EACEAA]/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 relative z-10"
      >
        {/* Rotating Gradient Ring Container */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Rotating Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#EACEAA] border-r-[#D39858] animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full border border-white/5" />

          {/* Glowing OA Logo Core */}
          <div className="w-14 h-14 rounded-full bg-[#EACEAA]/10 border border-[#EACEAA]/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <span className="font-mono font-black text-sm text-[#EACEAA] tracking-widest">OA</span>
          </div>
        </div>

        {/* Status Message & Percentage Counter */}
        <div className="text-center space-y-2">
          <h3 className="font-mono text-xs text-[#EACEAA] tracking-[0.2em] uppercase font-bold">{message}</h3>
          <div className="flex items-center justify-center gap-2">
            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-[#D39858] to-[#EACEAA] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-400 font-bold w-8">{progress}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
