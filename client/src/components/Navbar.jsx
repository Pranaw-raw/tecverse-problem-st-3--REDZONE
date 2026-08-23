import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { QuickLoginSwitcher } from './QuickLoginSwitcher';
import {
  Layers,
  Calendar,
  BookmarkCheck,
  ShieldAlert,
  BarChart3,
  Bell,
  QrCode,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenQrScanner }) => {
  const { user, isAdmin } = useAuth();
  const { isConnected } = useSocket();
  const { unreadCount, setIsDrawerOpen } = useNotification();

  const navItems = [
    { id: 'catalogue', label: 'Catalogue', icon: Layers },
    { id: 'calendar', label: 'Timeline Calendar', icon: Calendar },
    { id: 'my-bookings', label: 'My Bookings', icon: BookmarkCheck },
    { id: 'admin', label: 'Admin Panel', icon: ShieldAlert, adminOnly: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('catalogue')}
              className="flex items-center gap-2.5 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-brand-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-white font-heading">
                    Reserve<span className="text-indigo-400">Hub</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                    PRO
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Sync
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Connecting
                    </span>
                  )}
                  <span>•</span>
                  <span>PS-3 SaaS</span>
                </div>
              </div>
            </button>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-800/80 rounded-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              // If item is admin-only and user is not admin, highlight with a badge or show tooltip
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.adminOnly && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                        isAdmin
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      Admin
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2.5">
            {/* 1-Click Role Switcher */}
            <QuickLoginSwitcher />

            {/* QR Check-In Scanner Quick Trigger */}
            <button
              onClick={onOpenQrScanner}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-slate-800/80 transition shadow-sm"
              title="Open QR Scanner / Check-in Kiosk"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
            </button>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-slate-800/80 transition shadow-sm"
              title="Notifications & Reminders"
            >
              <Bell className="w-4 h-4 text-indigo-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-slate-950 animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/60 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium rounded-lg ${
                  isActive ? 'text-indigo-400 bg-slate-900' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
