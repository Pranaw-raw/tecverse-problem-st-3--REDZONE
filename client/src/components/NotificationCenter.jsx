import React from 'react';
import { useNotification } from '../context/NotificationContext';
import { formatDateTime } from '../utils/formatters';
import { Bell, CheckCheck, Clock, CalendarCheck, AlertTriangle, X, Sparkles } from 'lucide-react';

export const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    setIsDrawerOpen,
    markAsRead,
    markAllAsRead,
    triggerTestReminder,
  } = useNotification();

  if (!isDrawerOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'confirmation':
        return <CalendarCheck className="w-4 h-4 text-emerald-400" />;
      case 'cancellation':
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Notifications & Reminders
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-indigo-500 text-white font-semibold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">Real-time alerts and schedule reminders</p>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Demo Trigger for Evaluators */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent border-b border-slate-800/80 flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> FR9 Demo Trigger
              </span>
              Simulate 30-min auto-reminder
            </div>
            <button
              onClick={triggerTestReminder}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition active:scale-95"
            >
              Dispatch Alert ⚡
            </button>
          </div>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/50 flex justify-between items-center text-xs">
              <span className="text-slate-400">{notifications.length} total events</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Bell className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  You'll be alerted when bookings are confirmed or upcoming sessions start.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    n.is_read
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
                      : 'bg-slate-800/70 border-indigo-500/40 shadow-lg shadow-indigo-950/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-white truncate">{n.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatDateTime(n.created_at || n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                      {!n.is_read && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Unread • Click to dismiss
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
