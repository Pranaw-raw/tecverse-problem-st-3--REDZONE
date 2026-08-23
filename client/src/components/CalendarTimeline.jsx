import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';

export const CalendarTimeline = ({ resource, onSelectSlot, onQuickBook }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [recommendedSlots, setRecommendedSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { socket } = useSocket();

  // Hourly slots from 08:00 to 20:00
  const timeSlots = [
    { start: '08:00', end: '09:00', hour: 8 },
    { start: '09:00', end: '10:00', hour: 9 },
    { start: '10:00', end: '11:00', hour: 10 },
    { start: '11:00', end: '12:00', hour: 11 },
    { start: '12:00', end: '13:00', hour: 12 },
    { start: '13:00', end: '14:00', hour: 13 },
    { start: '14:00', end: '15:00', hour: 14 },
    { start: '15:00', end: '16:00', hour: 15 },
    { start: '16:00', end: '17:00', hour: 16 },
    { start: '17:00', end: '18:00', hour: 17 },
    { start: '18:00', end: '19:00', hour: 18 },
    { start: '19:00', end: '20:00', hour: 19 },
  ];

  const fetchAvailability = async () => {
    if (!resource?.id) return;
    setIsLoading(true);
    try {
      const res = await api.getResourceAvailability(resource.id, selectedDate);
      setBookedSlots(res.bookedSlots || []);
      setRecommendedSlots(res.recommendedAvailableSlots || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [resource?.id, selectedDate]);

  // Real-time calendar refresh on live booking/cancellation
  useEffect(() => {
    if (!socket) return;

    const handleRefresh = (data) => {
      if (data.resourceId === resource?.id) {
        fetchAvailability();
      }
    };

    socket.on('booking_created', handleRefresh);
    socket.on('booking_cancelled', handleRefresh);
    socket.on('booking_checked_in', handleRefresh);

    return () => {
      socket.off('booking_created', handleRefresh);
      socket.off('booking_cancelled', handleRefresh);
      socket.off('booking_checked_in', handleRefresh);
    };
  }, [socket, resource?.id]);

  const changeDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Check if a time slot is booked
  const getSlotStatus = (slot) => {
    if (resource.status === 'maintenance') {
      return { status: 'maintenance', label: 'Under Maintenance' };
    }

    const slotStart = new Date(`${selectedDate}T${slot.start}:00.000Z`);
    const slotEnd = new Date(`${selectedDate}T${slot.end}:00.000Z`);

    const booking = bookedSlots.find((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return slotStart < bEnd && slotEnd > bStart;
    });

    if (booking) {
      return {
        status: booking.status === 'checked-in' ? 'checked-in' : 'booked',
        booking,
        label: `${booking.title || 'Reserved'} (${booking.user_name || 'Booked'})`,
      };
    }

    // Check if slot has already passed today
    const now = new Date();
    const isToday = new Date(selectedDate).toDateString() === now.toDateString();
    if (isToday && slot.hour <= now.getHours()) {
      return { status: 'past', label: 'Past Slot' };
    }

    return { status: 'available', label: 'Available for Booking' };
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800">
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            Interactive Availability Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any open green slot to initiate an instant, conflict-free reservation.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white px-2 py-1 focus:outline-none cursor-pointer"
          />

          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1 text-xs font-medium bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg border border-indigo-500/30 transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 py-3 text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/50"></span>
          <span>Available (Clickable)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/50"></span>
          <span>Booked / Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/50"></span>
          <span>Checked-In / In-Use</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700"></span>
          <span>Past / Inactive</span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-2">
        {timeSlots.map((slot) => {
          const slotInfo = getSlotStatus(slot);
          const isAvailable = slotInfo.status === 'available';
          const isBooked = slotInfo.status === 'booked';
          const isCheckedIn = slotInfo.status === 'checked-in';
          const isMaintenance = slotInfo.status === 'maintenance';
          const isPast = slotInfo.status === 'past';

          let cardStyle = 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-60 cursor-not-allowed';

          if (isAvailable) {
            cardStyle =
              'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-950/40 hover:scale-105 cursor-pointer shadow-sm';
          } else if (isBooked) {
            cardStyle =
              'bg-rose-950/30 border-rose-500/40 text-rose-300 shadow-sm cursor-not-allowed';
          } else if (isCheckedIn) {
            cardStyle =
              'bg-amber-950/30 border-amber-500/40 text-amber-300 shadow-sm cursor-not-allowed';
          } else if (isMaintenance) {
            cardStyle = 'bg-slate-900 border-rose-900/50 text-slate-500 cursor-not-allowed';
          }

          return (
            <div
              key={slot.start}
              onClick={() => {
                if (isAvailable) {
                  onSelectSlot({
                    resource,
                    date: selectedDate,
                    startTime: `${selectedDate}T${slot.start}:00`,
                    endTime: `${selectedDate}T${slot.end}:00`,
                  });
                }
              }}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all duration-200 min-h-[90px] ${cardStyle}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono">
                  {slot.start} – {slot.end}
                </span>
                {isAvailable && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                {(isBooked || isCheckedIn) && <Clock className="w-3.5 h-3.5 text-rose-400" />}
              </div>

              <div className="mt-2">
                <span className="text-[11px] font-medium line-clamp-2 leading-tight">
                  {slotInfo.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Slots AI Recommendation Banner */}
      {recommendedSlots.length > 0 && resource.status === 'available' && (
        <div className="mt-5 p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Recommended Available Open Windows</h4>
              <p className="text-[11px] text-slate-400">
                {recommendedSlots.length} open blocks detected today for conflict-free booking.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {recommendedSlots.slice(0, 3).map((slot, idx) => (
              <button
                key={idx}
                onClick={() =>
                  onSelectSlot({
                    resource,
                    date: selectedDate,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                  })
                }
                className="px-2.5 py-1 text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-lg transition"
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
