import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Lock, 
  Sparkles, 
  Eye, 
  EyeOff, 
  AlertCircle
} from 'lucide-react';

export const Login: React.FC = () => {
  const { session, login, signup, error, isMock } = useAuthStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'freelancer'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length > 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pass)) score += 25;
    return score;
  };

  const passStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      setAuthError('Email and Password are required');
      return;
    }

    if (isRegistering) {
      if (!fullName) {
        setAuthError('Full Name is required');
        return;
      }
      const success = await signup(email, password, fullName, role);
      if (!success) {
        setAuthError('Signup failed. Ensure credentials match requirements.');
      }
    } else {
      const success = await login(email, password);
      if (!success) {
        setAuthError('Invalid credentials or network failure.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Background Dot-Matrix & Ambient Lights */}
      <div className="absolute inset-0 hud-grid opacity-[0.15] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] ambient-circle-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] ambient-circle-2 pointer-events-none" />

      {/* Glass Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md hud-card p-8 border-[#EACEAA]/15 bg-[#34150F]/20 backdrop-blur-2xl relative z-10 shadow-2xl space-y-6"
      >
        
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EACEAA] to-[#D39858] flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <span className="font-mono font-black text-base text-[#0B0F14]">OA</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight gold-header">
            {isRegistering ? 'Create Operator Account' : 'Welcome to Outreach AI'}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {isRegistering 
              ? 'Enter details to provision your learning hub workspace' 
              : 'Sign in to access your autonomous AI operating system'}
          </p>
        </div>

        {/* Development Mode Notice Banner */}
        {isMock && (
          <div className="p-3 rounded-xl bg-[#EACEAA]/10 border border-[#EACEAA]/20 text-[10px] text-[#EACEAA] font-mono flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-[#EACEAA]" />
            <span>Development Mode Active: Any credentials will log in to test the Nothing OS hub.</span>
          </div>
        )}

        {/* Error Display */}
        {(authError || error) && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError || error}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isRegistering && (
            <>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      role === 'student'
                        ? 'bg-[#EACEAA]/15 border-[#EACEAA] text-[#EACEAA]'
                        : 'bg-white/[0.02] border-white/5 text-slate-400'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('freelancer')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      role === 'freelancer'
                        ? 'bg-[#EACEAA]/15 border-[#EACEAA] text-[#EACEAA]'
                        : 'bg-white/[0.02] border-white/5 text-slate-400'
                    }`}
                  >
                    Freelancer
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@domain.com"
                className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {isRegistering && password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-400 font-bold uppercase">
                  <span>Strength</span>
                  <span>{passStrength < 50 ? 'Weak' : passStrength < 100 ? 'Good' : 'Strong'}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#D39858] to-[#EACEAA] transition-all duration-300"
                    style={{ width: `${passStrength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            className="w-full btn-hud-primary py-3 rounded-xl text-xs uppercase tracking-widest font-black transition-all shadow-lg shadow-amber-500/10 mt-2"
          >
            {isRegistering ? 'Register Account' : 'Authenticate Operator'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/5 w-full" />
          <span className="bg-[#0B0F14] px-3 text-[9px] font-mono text-slate-500 uppercase tracking-widest absolute">OR</span>
        </div>

        {/* Google Sign In (UI Only) */}
        <button
          type="button"
          onClick={() => login('mock_google@user.com', 'password')}
          className="w-full py-2.5 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-slate-300 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.8 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.4 0 10.6 0 13s.6 4.6 1.6 6.6l3.7-4.9z" />
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.4-6.7-5.3L1.6 18C3.5 21.4 7.4 23 12 23z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Toggle between Login and Signup */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setAuthError(null);
            }}
            className="text-xs text-slate-400 hover:text-[#EACEAA] font-bold transition-colors"
          >
            {isRegistering 
              ? 'Already registered? Sign in here' 
              : "Don't have an account? Register now"}
          </button>
        </div>

      </motion.div>

    </div>
  );
};
