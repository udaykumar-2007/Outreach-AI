import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const LoadingScreen: React.FC<{ message?: string; onComplete?: () => void }> = ({ 
  message = 'Initializing AI OS Framework', 
  onComplete 
}) => {
  const [progress, setProgress] = useState(0);
  const [subText, setSubText] = useState('ALLOCATING MEMORY...');

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          if (onComplete) onComplete();
          return 100;
        }
        const next = prev + 4;
        if (next < 30) setSubText('INITIALIZING HARDWARE HANDSHAKE...');
        else if (next < 60) setSubText('INDEXING CAMPAIGN SCANNERS...');
        else if (next < 90) setSubText('SYNCHRONIZING WEBSOCKET KERNEL...');
        else setSubText('SYSTEM ONLINE');
        return next;
      });
    }, 35);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Radius for SVG progress ring
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed inset-0 z-50 bg-[#0B0F14]/90 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden select-none"
      >
        {/* Subtle Background HUD Grid */}
        <div className="absolute inset-0 hud-grid opacity-[0.1] pointer-events-none" />
        
        {/* Soft Blue & Cyan Ambient Glow Orbs */}
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Glass Card Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-7 relative z-10 p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl max-w-sm w-full mx-4 shadow-2xl shadow-black/80"
        >
          {/* Animated Circular Progress Ring with Center AI Orb */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            
            {/* Ambient Cyan/Blue Glow Ring */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-[#EACEAA]/20 blur-xl animate-pulse" />

            {/* SVG Circular Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#EACEAA" />
                </linearGradient>
              </defs>

              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-white/5"
                strokeWidth="3"
                fill="transparent"
              />

              {/* Animated Progress Path */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                stroke="url(#ring-gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              />
            </svg>

            {/* Central Glowing AI Orb */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute w-20 h-20 rounded-full border border-cyan-500/30 bg-[#0B0F14]/90 backdrop-blur-md flex items-center justify-center shadow-xl shadow-cyan-500/10"
            >
              <motion.div 
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-[#EACEAA]/20 flex items-center justify-center border border-white/10"
              >
                <span className="font-mono font-black text-xs text-[#EACEAA] tracking-widest">OA</span>
              </motion.div>
            </motion.div>
          </div>

          {/* Status Message & Subtitle */}
          <div className="text-center space-y-2 w-full">
            <div className="flex items-center justify-center gap-1.5 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <h3 className="font-mono text-xs font-bold tracking-[0.2em] uppercase text-white">{message}</h3>
            </div>
            <p className="font-mono text-[9px] text-cyan-400/80 uppercase tracking-widest font-semibold h-4">{subText}</p>
          </div>

          {/* Sleek Percentage Counter */}
          <div className="w-full flex items-center justify-between font-mono text-[10px] text-slate-400 border-t border-white/5 pt-3">
            <span className="font-semibold uppercase tracking-wider">Loading Kernel</span>
            <span className="font-bold text-[#EACEAA]">{progress}%</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
