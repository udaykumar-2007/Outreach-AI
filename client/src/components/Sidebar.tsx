import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { 
  LayoutDashboard, 
  Inbox, 
  GitMerge, 
  Globe, 
  Settings, 
  LogOut
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { profile, user, logout } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Handoff Inbox', to: '/inbox', icon: Inbox },
    { name: 'CRM Pipeline', to: '/pipeline', icon: GitMerge },
    { name: 'Web Presence', to: '/portfolio', icon: Globe },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-[#0B0F14]/70 border-r border-[#EACEAA]/10 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-xl z-20">
      {/* Top Section / Logo */}
      <div>
        <div className="p-6 border-b border-[#EACEAA]/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#EACEAA] to-[#D39858] flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
            <span className="font-black text-sm text-[#0B0F14] font-mono">OA</span>
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5 font-mono">
              <span>Outreach AI</span>
              <span className="text-[9px] bg-[#EACEAA]/10 border border-[#EACEAA]/20 text-[#EACEAA] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">BETA</span>
            </h1>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Agent Portal</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group border font-medium text-xs tracking-wide ${
                  isActive
                    ? 'bg-white/[0.04] border-[#EACEAA]/30 text-white shadow-lg shadow-black/20'
                    : 'text-slate-400 border-transparent hover:bg-white/[0.02] hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'text-[#EACEAA]' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-[#EACEAA]/10 bg-[#34150F]/20">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-white/5 bg-white/[0.01]">
          <div className="w-8 h-8 rounded-full bg-[#34150F] border border-[#EACEAA]/20 flex items-center justify-center font-bold text-[#EACEAA] text-xs shrink-0 font-mono">
            {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden flex-1">
            <h4 className="font-bold text-xs text-slate-200 truncate">{profile?.full_name || 'Active User'}</h4>
            <p className="text-[9px] text-slate-500 truncate mt-0.5 font-mono">{user?.email}</p>
          </div>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 font-mono ${
            profile?.role === 'freelancer' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[#EACEAA]/10 text-[#EACEAA] border border-[#EACEAA]/20'
          }`}>
            {profile?.role || 'student'}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-300 font-bold text-xs font-mono"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
