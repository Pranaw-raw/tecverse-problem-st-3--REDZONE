import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { QuickLoginSwitcher } from './QuickLoginSwitcher';
import {
  Layers,
  Calendar,
  BookmarkCheck,
  ShieldCheck,
  BarChart3,
  Bell,
  QrCode,
  Sparkles,
  User,
  LogIn,
  LogOut,
  ChevronDown,
  UserPlus,
  Building,
} from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenQrScanner, onOpenAuthModal }) => {
  const { user, isAdmin, logout, isAuthenticated } = useAuth();
  const { isConnected } = useSocket();
  const { unreadCount, setIsDrawerOpen, addToast } = useNotification();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'catalogue', label: 'Explore Resources', icon: Layers },
    { id: 'calendar', label: 'Timeline Schedule', icon: Calendar },
    { id: 'my-bookings', label: 'My Bookings', icon: BookmarkCheck },
    { id: 'admin', label: 'Admin Management', icon: ShieldCheck, adminOnly: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  ];

  const handleSignOut = () => {
    logout();
    setIsUserMenuOpen(false);
    addToast({
      title: 'Signed Out',
      message: 'You have been signed out of your session.',
      type: 'info',
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Brand Logo & Live Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('catalogue')}
              className="flex items-center gap-2.5 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-transform duration-200">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-white font-heading">
                    Reserve<span className="text-indigo-400">Hub</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Sync
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Connecting...
                    </span>
                  )}
                  <span>•</span>
                  <span>Campus Portal</span>
                </div>
              </div>
            </button>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-900/70 border border-slate-800/80 rounded-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.adminOnly && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                        isAdmin
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1-Click Role Switcher */}
            <QuickLoginSwitcher />

            {/* QR Check-In Scanner Quick Trigger */}
            <button
              onClick={onOpenQrScanner}
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-slate-800/80 transition-all shadow-sm active:scale-95"
              title="Open QR Scanner / Check-in Kiosk"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
            </button>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-slate-800/80 transition-all shadow-sm active:scale-95"
              title="Notifications & Schedule Reminders"
            >
              <Bell className="w-4 h-4 text-indigo-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-slate-950 animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Account / Profile Dropdown & Login Trigger */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-sm group"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs group-hover:scale-105 transition">
                    {user.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div className="text-left leading-tight hidden xl:block">
                    <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {user.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-3xl glass-dropdown p-2 z-50 border border-slate-800 shadow-2xl animate-slide-up">
                    <div className="p-3 border-b border-slate-800/80 mb-1">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{user.email}</div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {user.role}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">{user.department}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenAuthModal) onOpenAuthModal('login');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition text-left"
                      >
                        <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Sign In with another ID / Password</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenAuthModal) onOpenAuthModal('register');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition text-left"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Register New Account</span>
                      </button>

                      <div className="pt-1 border-t border-slate-800/60 mt-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 rounded-xl transition text-left"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-800/60 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition ${
                  isActive
                    ? 'text-white bg-indigo-600 shadow-md shadow-indigo-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
