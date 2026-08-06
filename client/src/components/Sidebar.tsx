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
    { name: 'Human Handoff Inbox', to: '/inbox', icon: Inbox },
    { name: 'CRM Pipeline', to: '/pipeline', icon: GitMerge },
    { name: 'Web Presence Generator', to: '/portfolio', icon: Globe },
    { name: 'Outreach Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-80 bg-slate-900/60 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-md">
      {/* Top Section / Logo */}
      <div>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-lg text-white font-sans">OA</span>
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white bg-gradient-to-r from-indigo-200 via-slate-100 to-indigo-100 bg-clip-text">
              Outreach AI
            </h1>
            <span className="text-xs text-indigo-400 font-medium tracking-widest uppercase">Autonomous Hub</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400">
            {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-sm text-slate-200 truncate">{profile?.full_name || 'Active User'}</h4>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                profile?.role === 'freelancer' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {profile?.role || 'student'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-200 font-semibold"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
