import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, GraduationCap, UserCheck, Zap, Sparkles } from 'lucide-react';

export const QuickLoginSwitcher = () => {
  const { user, switchRole, isLoading } = useAuth();

  const personas = [
    {
      id: 'student',
      name: 'Pranaw kumar',
      roleLabel: 'Student',
      email: 'student@campus.edu',
      icon: GraduationCap,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-400',
      activeColor: 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30',
      tag: 'CS Dept',
    },
    {
      id: 'faculty',
      name: 'ajeet kumar',
      roleLabel: 'Faculty',
      email: 'faculty@campus.edu',
      icon: UserCheck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400',
      activeColor: 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30',
      tag: 'Robotics',
    },
    {
      id: 'admin',
      name: 'REDZONE',
      roleLabel: 'Admin',
      email: 'admin@campus.edu',
      icon: ShieldCheck,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:border-rose-400',
      activeColor: 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30',
      tag: 'Facilities',
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl shadow-inner">
      <div className="hidden xl:flex items-center gap-1.5 px-2.5 text-[11px] font-semibold text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Switch Demo User:</span>
      </div>
      <div className="flex items-center gap-1">
        {personas.map((p) => {
          const Icon = p.icon;
          const isActive = user?.role === p.id;
          return (
            <button
              key={p.id}
              onClick={() => switchRole(p.id)}
              disabled={isLoading || isActive}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                isActive
                  ? p.activeColor
                  : `${p.color} opacity-80 hover:opacity-100 hover:scale-[1.02] active:scale-95`
              }`}
              title={`Switch session to ${p.name} (${p.roleLabel} • ${p.email})`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">{p.name}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded-md font-medium hidden sm:inline ${
                isActive ? 'bg-black/25 text-white' : 'bg-slate-800/80 text-slate-400'
              }`}>
                {p.roleLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
