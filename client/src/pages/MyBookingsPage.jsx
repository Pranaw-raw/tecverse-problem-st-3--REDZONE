import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import {
  BookmarkCheck,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  XCircle,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  formatTimeRange,
  formatDateTime,
  getStatusBadgeStyle,
  getCategoryBadgeStyle,
  getCountdown,
} from '../utils/formatters';

export const MyBookingsPage = ({ onOpenQrModal, onNavigateCatalogue }) => {
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useNotification();

  const fetchMyBookings = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyBookings(statusFilter);
      setBookings(res.bookings || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, [statusFilter, user?.id]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchMyBookings();
    };

    socket.on('booking_created', handleUpdate);
    socket.on('booking_cancelled', handleUpdate);
    socket.on('booking_checked_in', handleUpdate);

    return () => {
      socket.off('booking_created', handleUpdate);
      socket.off('booking_cancelled', handleUpdate);
      socket.off('booking_checked_in', handleUpdate);
    };
  }, [socket]);

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel your reservation for "${booking.resource_name}"? This will immediately free up the time slot.`)) {
      return;
    }

    setCancellingId(booking.id);
    try {
      await api.cancelBooking(booking.id, 'Cancelled by user');
      addToast({
        title: 'Booking Cancelled',
        message: `Reservation for "${booking.resource_name}" cancelled. Time slot freed.`,
        type: 'info',
      });
      await fetchMyBookings();
    } catch (err) {
      console.error('Cancellation failed:', err);
      addToast({
        title: 'Cancellation Failed',
        message: err.message,
        type: 'alert',
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>FR4 Booking History</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            My Resource Reservations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track upcoming slots, view QR entry passes, and manage your campus reservations.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'checked-in', label: 'In-Use' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-2xl glass-card animate-pulse bg-slate-900/60 p-4"></div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 p-8 glass-panel rounded-3xl border border-slate-800">
          <BookmarkCheck className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-white">No Reservations Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'all'
              ? 'You have not made any bookings yet. Browse the catalogue to book a lab or equipment.'
              : `No bookings currently in "${statusFilter}" state.`}
          </p>
          <button
            onClick={onNavigateCatalogue}
            className="mt-4 px-5 py-2.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white rounded-xl shadow-lg transition"
          >
            Browse Resource Catalogue
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {bookings.map((b) => {
            const isUpcoming = b.status === 'upcoming';
            const isCheckedIn = b.status === 'checked-in';
            const isCancelled = b.status === 'cancelled';
            const isCompleted = b.status === 'completed';
            const countdown = isUpcoming ? getCountdown(b.start_time) : null;

            return (
              <div
                key={b.id}
                className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left info */}
                <div className="flex items-start gap-4">
                  <img
                    src={b.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'}
                    alt={b.resource_name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-700 shrink-0 hidden sm:block"
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${getCategoryBadgeStyle(
                          b.category
                        )}`}
                      >
                        {b.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border capitalize ${getStatusBadgeStyle(
                          b.status
                        )}`}
                      >
                        {b.status}
                      </span>
                      {countdown && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md animate-pulse">
                          ⚡ Starts {countdown}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {b.title || b.resource_name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{b.resource_name} • {b.location}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{formatTimeRange(b.start_time, b.end_time)}</span>
                      </span>
                    </div>

                    {b.purpose && (
                      <p className="text-xs text-slate-400 italic line-clamp-1">
                        Purpose: "{b.purpose}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80 justify-end">
                  {(isUpcoming || isCheckedIn) && (
                    <button
                      onClick={() => onOpenQrModal(b, 'display')}
                      className="px-3.5 py-2 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                      title="View Scannable QR Pass"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR Pass</span>
                    </button>
                  )}

                  {isUpcoming && (
                    <button
                      onClick={() => onOpenQrModal(b, 'scan')}
                      className="px-3.5 py-2 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition flex items-center gap-1.5"
                      title="Check-in at Venue"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Check In</span>
                    </button>
                  )}

                  {isUpcoming && (
                    <button
                      onClick={() => handleCancelBooking(b)}
                      disabled={cancellingId === b.id}
                      className="px-3.5 py-2 text-xs font-semibold bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 rounded-xl transition flex items-center gap-1.5"
                      title="Cancel reservation & free slot"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{cancellingId === b.id ? 'Releasing...' : 'Cancel'}</span>
                    </button>
                  )}

                  {isCancelled && (
                    <span className="text-xs text-slate-500 italic">Slot Liberated</span>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-emerald-400 font-medium">Session Finished</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
