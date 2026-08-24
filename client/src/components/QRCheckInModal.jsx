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
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { formatTimeRange } from '../utils/formatters';

export const QRCheckInModal = ({ booking, initialMode = 'display', onClose, onCheckInSuccess }) => {
  const [mode, setMode] = useState(initialMode); // 'display' or 'scan'
  const [scannedToken, setScannedToken] = useState(booking?.qr_code_token || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);
  const { addToast } = useNotification();

  const handleCopyToken = () => {
    if (booking?.qr_code_token) {
      navigator.clipboard.writeText(booking.qr_code_token);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleVerifyCheckIn = async (tokenToUse) => {
    const token = tokenToUse || scannedToken;
    if (!token) {
      setResultMsg({ type: 'error', text: 'Please enter or scan a valid QR access token.' });
      return;
    }

    setIsVerifying(true);
    setResultMsg(null);

    try {
      const res = await api.qrCheckIn(token, booking?.id);
      setResultMsg({
        type: 'success',
        text: res.message || 'Check-in verified! Booking marked as In-Use.',
      });
      addToast({
        title: 'Check-In Confirmed',
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'display' ? 'Digital Access Pass' : 'Venue Check-In Scanner'}
              </h3>
              <p className="text-xs text-slate-400">Campus Facility Entry Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle (Pass vs Scanner) */}
        <div className="p-2 bg-slate-950 flex gap-1 border-b border-slate-800">
          <button
            onClick={() => setMode('display')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'display'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Digital QR Pass</span>
          </button>

          <button
            onClick={() => setMode('scan')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'scan'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
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
                <div className="p-4 bg-white rounded-2xl shadow-xl shadow-indigo-950/40 border-4 border-indigo-500/20 mb-4">
                  <QRCodeSVG
                    value={booking.qr_code_token || booking.id}
                    size={175}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="w-full bg-slate-950/90 p-4 rounded-2xl border border-slate-800 text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-400">
                      <span>{booking.qr_code_token || 'TOKEN-ACTIVE'}</span>
                      <button
                        onClick={handleCopyToken}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Copy Token"
                      >
                        {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-lg border ${
                        booking.status === 'checked-in'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
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

                <div className="mt-4 w-full">
                  <button
                    onClick={() => {
                      setMode('scan');
                      setScannedToken(booking.qr_code_token);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Scan className="w-4 h-4" />
                    <span>Simulate Scanner Check-In</span>
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
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse"></div>

              <Scan className="w-10 h-10 text-indigo-400 mb-2 animate-bounce" />
              <h4 className="text-sm font-bold text-white">Facility Kiosk Check-In</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Scan attendee digital pass token upon arrival at the venue.
              </p>
            </div>

            {resultMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter or Paste QR Code Token *
              </label>
              <input
                type="text"
                value={scannedToken}
                onChange={(e) => setScannedToken(e.target.value)}
                placeholder="e.g. RH-GPULAB-001..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Quick Demo Fast-Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Fast-Scan Demo Tokens:
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
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg border border-slate-700 transition active:scale-95"
                  >
                    {tok}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleVerifyCheckIn()}
              disabled={isVerifying}
              className="w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Validating Token...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Validate & Mark Checked-In
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
