import React, { useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  MapPin,
  X,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { formatTimeRange } from '../utils/formatters';

export const BookingModal = ({ bookingData, onClose, onSuccess }) => {
  const { resource, startTime: initialStart, endTime: initialEnd } = bookingData;
  const { user } = useAuth();
  const { addToast } = useNotification();

  // Convert initial start/end to datetime-local values or time pickers
  const formatForInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const [title, setTitle] = useState(`Session: ${resource?.name}`);
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState(formatForInput(initialStart));
  const [endTime, setEndTime] = useState(formatForInput(initialEnd));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const startIso = new Date(startTime).toISOString();
      const endIso = new Date(endTime).toISOString();

      if (new Date(startIso) >= new Date(endIso)) {
        setErrorMsg('End time must be after Start time.');
        setIsSubmitting(false);
        return;
      }

      const res = await api.createBooking({
        resourceId: resource.id,
        title,
        purpose,
        startTime: startIso,
        endTime: endIso,
      });

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#10b981', '#38bdf8'],
        });
      } catch (err) {
        // Confetti fallback
      }

      addToast({
        title: '🎉 Reservation Confirmed!',
        message: `Successfully booked "${resource.name}". Check your QR pass in My Bookings.`,
        type: 'confirmation',
      });

      onSuccess(res.booking);
    } catch (err) {
      console.error('Booking failed:', err);
      setErrorMsg(err.message || 'Booking conflict or server error. Please choose another time.');
      addToast({
        title: 'Booking Conflict / Error',
        message: err.message,
        type: 'alert',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Resource Reservation</h3>
              <p className="text-xs text-slate-400">Atomic conflict detection pre-check enabled</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Resource Summary Box */}
        <div className="p-5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-4">
          <img
            src={resource.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'}
            alt={resource.name}
            className="w-16 h-16 rounded-xl object-cover border border-slate-700/60 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{resource.name}</h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{resource.location}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-300">
              <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {resource.category}
              </span>
              <span>Capacity: {resource.capacity}</span>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Booking Failed:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* Session Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reservation Title / Topic *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. AI Research Workshop / Final Year Project"
            />
          </div>

          {/* Time Slot Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> End Time *
              </label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Purpose & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Purpose & Equipment Requirements (Optional)
            </label>
            <textarea
              rows="2"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="Describe equipment needed, software setup, or team attendance details..."
            />
          </div>

          {/* Booked By Pill */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>
                Booking as: <strong className="text-white">{user?.name}</strong> ({user?.role})
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Instant Lock
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 rounded-xl shadow-lg shadow-indigo-900/40 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Validating Conflicts...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm & Reserve
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
