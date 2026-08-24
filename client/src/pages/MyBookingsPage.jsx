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
  Sparkles,
  ArrowRight,
  User,
} from 'lucide-react';
import {
  formatTimeRange,
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
    if (
      !window.confirm(
        `Are you sure you want to cancel your reservation for "${booking.resource_name}"? This will immediately free up the time slot for other campus members.`
      )
    ) {
      return;
    }

    setCancellingId(booking.id);
    try {
      await api.cancelBooking(booking.id, 'Cancelled by user');
      addToast({
        title: 'Booking Cancelled',
        message: `Reservation for "${booking.resource_name}" cancelled. Time slot is now open.`,
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

  const statusTabs = [
    { id: 'all', label: 'All Reservations' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'checked-in', label: 'In-Use' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Personal Booking Ledger</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-white font-heading">
            My Resource Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Logged in as <strong className="text-white">{user?.name || 'Campus Member'}</strong> ({user?.role}) • Manage upcoming slots and digital entry passes.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto shadow-inner">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-3.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-3xl glass-card animate-pulse bg-slate-900/60 p-5"></div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 p-8 glass-panel rounded-3xl border border-slate-800">
          <BookmarkCheck className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-white">No Reservations Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'all'
              ? 'You have not booked any campus facilities yet. Explore the catalogue to reserve a spot.'
              : `No reservations currently marked as "${statusFilter}".`}
          </p>
          <button
            onClick={onNavigateCatalogue}
            className="mt-5 px-6 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition flex items-center gap-2 mx-auto active:scale-95"
          >
            <span>Explore Catalogue</span>
            <ArrowRight className="w-3.5 h-3.5" />
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
                className="glass-card rounded-3xl p-5 sm:p-6 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-700"
              >
                {/* Left info */}
                <div className="flex items-start gap-4">
                  <img
                    src={
                      b.image_url ||
                      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={b.resource_name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-700/80 shrink-0 hidden sm:block shadow-sm"
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg border glass-badge ${getCategoryBadgeStyle(
                          b.category
                        )}`}
                      >
                        {b.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg border glass-badge capitalize ${getStatusBadgeStyle(
                          b.status
                        )}`}
                      >
                        {b.status}
                      </span>
                      {countdown && (
                        <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg animate-pulse">
                          Starts {countdown}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white truncate">
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
                      className="px-4 py-2.5 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="View Digital Scannable Pass"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Digital Pass</span>
                    </button>
                  )}

                  {isUpcoming && (
                    <button
                      onClick={() => onOpenQrModal(b, 'scan')}
                      className="px-4 py-2.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition flex items-center gap-1.5 active:scale-95"
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
                      className="px-4 py-2.5 text-xs font-semibold bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 rounded-xl transition flex items-center gap-1.5 active:scale-95"
                      title="Cancel reservation & free slot"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{cancellingId === b.id ? 'Releasing...' : 'Cancel'}</span>
                    </button>
                  )}

                  {isCancelled && (
                    <span className="text-xs text-slate-500 italic px-2">Slot Released</span>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-emerald-400 font-medium px-2 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Completed
                    </span>
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
