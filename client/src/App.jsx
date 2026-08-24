import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { NotificationCenter } from './components/NotificationCenter';
import { ResourceDetailsModal } from './components/ResourceDetailsModal';
import { BookingModal } from './components/BookingModal';
import { QRCheckInModal } from './components/QRCheckInModal';
import { AuthModal } from './components/AuthModal';

// Pages
import { CataloguePage } from './pages/CataloguePage';
import { CalendarViewPage } from './pages/CalendarViewPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

import {
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Zap,
  Sparkles,
} from 'lucide-react';

const ToastContainer = () => {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        let borderColor = 'border-indigo-500/40 bg-slate-900/95 text-indigo-300';
        let Icon = Info;

        if (t.type === 'confirmation') {
          borderColor = 'border-emerald-500/50 bg-slate-900/95 text-emerald-400';
          Icon = CheckCircle;
        } else if (t.type === 'reminder') {
          borderColor = 'border-amber-500/50 bg-slate-900/95 text-amber-400';
          Icon = Zap;
        } else if (t.type === 'alert' || t.type === 'cancellation') {
          borderColor = 'border-rose-500/50 bg-slate-900/95 text-rose-400';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-slide-up flex items-start gap-3 ${borderColor}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{t.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('catalogue');
  const [selectedResource, setSelectedResource] = useState(null);
  const [bookingModalData, setBookingModalData] = useState(null);
  const [qrModalData, setQrModalData] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const { user } = useAuth();

  const handleOpenAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleSelectResource = (resource) => {
    setSelectedResource(resource);
  };

  const handleQuickBook = (resource) => {
    const now = new Date();
    // Default next top-of-hour
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startIso = now.toISOString();
    const end = new Date(now.getTime() + 60 * 60000);
    const endIso = end.toISOString();

    setBookingModalData({
      resource,
      startTime: startIso,
      endTime: endIso,
    });
  };

  const handleSelectSlot = (slotData) => {
    setBookingModalData({
      resource: slotData.resource,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
    });
  };

  const handleOpenQrModal = (booking, mode = 'display') => {
    setQrModalData({ booking, mode });
  };

  const handleOpenQrScannerOnly = () => {
    setQrModalData({ booking: null, mode: 'scan' });
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQrScanner={handleOpenQrScannerOnly}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'catalogue' && (
          <CataloguePage
            onSelectResource={handleSelectResource}
            onQuickBook={handleQuickBook}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarViewPage
            onSelectSlot={handleSelectSlot}
            onQuickBook={handleQuickBook}
          />
        )}

        {activeTab === 'my-bookings' && (
          <MyBookingsPage
            onOpenQrModal={handleOpenQrModal}
            onNavigateCatalogue={() => setActiveTab('catalogue')}
          />
        )}

        {activeTab === 'admin' && <AdminDashboardPage />}

        {activeTab === 'analytics' && <AnalyticsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-8 px-4 text-center text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-heading text-sm">Reserve<span className="text-indigo-400">Hub</span></span>
            <span>•</span>
            <span>Smart Institutional Resource & Facility Management</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Session: <strong className="text-white">{user?.name || 'Guest'}</strong> ({user?.role || 'user'})</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">Real-Time Conflict Prevention</span>
          </div>
        </div>
      </footer>

      {/* Overlays & Modals */}
      <NotificationCenter />
      <ToastContainer />

      {selectedResource && (
        <ResourceDetailsModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onSelectSlot={handleSelectSlot}
          onQuickBook={handleQuickBook}
        />
      )}

      {bookingModalData && (
        <BookingModal
          bookingData={bookingModalData}
          onClose={() => setBookingModalData(null)}
          onSuccess={(newBooking) => {
            setBookingModalData(null);
            setQrModalData({ booking: newBooking, mode: 'display' });
          }}
        />
      )}

      {qrModalData && (
        <QRCheckInModal
          booking={qrModalData.booking}
          initialMode={qrModalData.mode}
          onClose={() => setQrModalData(null)}
          onCheckInSuccess={() => {}}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        defaultTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <MainLayout />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
