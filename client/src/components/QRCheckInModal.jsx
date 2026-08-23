import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../utils/api';
import { useNotification } from '../context/NotificationContext';
import {
  QrCode,
  CheckCircle,
  X,
  Scan,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { formatTimeRange } from '../utils/formatters';

export const QRCheckInModal = ({ booking, initialMode = 'display', onClose, onCheckInSuccess }) => {
  const [mode, setMode] = useState(initialMode); // 'display' or 'scan'
  const [scannedToken, setScannedToken] = useState(booking?.qr_code_token || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);
  const { addToast } = useNotification();

  const handleVerifyCheckIn = async (tokenToUse) => {
    const token = tokenToUse || scannedToken;
    if (!token) {
      setResultMsg({ type: 'error', text: 'Please enter or scan a valid QR token.' });
      return;
    }

    setIsVerifying(true);
    setResultMsg(null);

    try {
      const res = await api.qrCheckIn(token, booking?.id);
      setCheckInResult(res.booking);
      setResultMsg({
        type: 'success',
        text: res.message || 'Check-in verified! Booking marked as In-Use.',
      });
      addToast({
        title: '✅ Check-In Confirmed',
        message: res.message,
        type: 'confirmation',
      });
      if (onCheckInSuccess) onCheckInSuccess(res.booking);
    } catch (err) {
      console.error('Check-in error:', err);
      setResultMsg({
        type: 'error',
        text: err.message || 'Invalid or expired QR token.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
        {/* Header with Mode Switcher */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'display' ? 'Digital Booking Pass' : 'Venue Check-In Scanner'}
              </h3>
              <p className="text-xs text-slate-400">FR8 QR-Based Utilization Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle (Pass vs Scanner) */}
        <div className="p-2 bg-slate-950 flex gap-1 border-b border-slate-800">
          <button
            onClick={() => setMode('display')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'display'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>My QR Pass</span>
          </button>

          <button
            onClick={() => setMode('scan')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'scan'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Kiosk Scanner</span>
          </button>
        </div>

        {/* MODE 1: DISPLAY QR PASS */}
        {mode === 'display' && (
          <div className="p-6 flex flex-col items-center text-center">
            {booking ? (
              <>
                <div className="p-4 bg-white rounded-2xl shadow-xl shadow-indigo-950/40 border-4 border-indigo-500/30 mb-4">
                  <QRCodeSVG
                    value={booking.qr_code_token || booking.id}
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="w-full bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-indigo-400 font-bold">
                      {booking.qr_code_token || 'TOKEN-ACTIVE'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        booking.status === 'checked-in'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate">
                    {booking.resource_name || booking.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{booking.location}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{formatTimeRange(booking.start_time, booking.end_time)}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    onClick={() => {
                      setMode('scan');
                      setScannedToken(booking.qr_code_token);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition flex items-center justify-center gap-2"
                  >
                    <Scan className="w-4 h-4" />
                    Test Check-In with this Pass
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 text-slate-400 text-xs">
                Select an upcoming reservation from "My Bookings" to view your QR Pass.
              </div>
            )}
          </div>
        )}

        {/* MODE 2: SCANNER & VERIFICATION KIOSK */}
        {mode === 'scan' && (
          <div className="p-6 space-y-4">
            <div className="relative rounded-2xl bg-slate-950 border-2 border-dashed border-indigo-500/40 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
              {/* Animated scan line */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse"></div>

              <Scan className="w-12 h-12 text-indigo-400 mb-2 animate-bounce" />
              <h4 className="text-sm font-bold text-white">Facility Kiosk Check-In</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Scan attendee QR badge upon arrival at laboratory or hall entrance.
              </p>
            </div>

            {resultMsg && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  resultMsg.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {resultMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{resultMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Enter or Paste QR Code Token *
              </label>
              <input
                type="text"
                value={scannedToken}
                onChange={(e) => setScannedToken(e.target.value)}
                placeholder="e.g. RH-GPULAB-001 or scan token..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Demo Fast-Buttons for seeded tokens */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Fast-Scan Demo Tokens:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['RH-GPULAB-001', 'RH-AUDIT-002', 'RH-ROBOT-003', 'RH-PRINT-004'].map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => {
                      setScannedToken(tok);
                      handleVerifyCheckIn(tok);
                    }}
                    className="px-2 py-1 text-[11px] font-mono bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg border border-slate-700 transition"
                  >
                    {tok}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleVerifyCheckIn()}
              disabled={isVerifying}
              className="w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Validating Token...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Validate & Check In
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
