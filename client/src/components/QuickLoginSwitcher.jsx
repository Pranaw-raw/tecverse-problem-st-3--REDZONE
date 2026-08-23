import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, GraduationCap, Briefcase, Zap } from 'lucide-react';

export const QuickLoginSwitcher = () => {
  const { user, switchRole, isLoading } = useAuth();

  const roles = [
    {
      id: 'admin',
      label: 'Admin / Manager',
      email: 'admin@campus.edu',
      icon: ShieldCheck,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:border-rose-500',
      activeColor: 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/40',
    },
    {
      id: 'student',
      label: 'Student',
      email: 'student@campus.edu',
      icon: GraduationCap,
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:border-indigo-500',
      activeColor: 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/40',
    },
    {
      id: 'faculty',
      label: 'Faculty / Staff',
      email: 'faculty@campus.edu',
      icon: Briefcase,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500',
      activeColor: 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40',
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
      <div className="hidden lg:flex items-center gap-1 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden xl:inline">Demo Switcher:</span>
      </div>
      <div className="flex items-center gap-1">
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = user?.role === r.id;
          return (
            <button
              key={r.id}
              onClick={() => switchRole(r.id)}
              disabled={isLoading || isActive}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${
                isActive
                  ? r.activeColor
                  : `${r.color} opacity-80 hover:opacity-100 hover:scale-105 active:scale-95`
              }`}
              title={`Switch session to ${r.label} (${r.email})`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="capitalize">{r.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
