import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Calendar,
  Clock,
  X,
  Sparkles,
  Building,
  Users,
  Activity,
  CheckCircle2,
  Bell,
  Smartphone,
  Send,
  CheckCheck,
  Filter,
  Copy,
  Check,
  SendHorizontal,
  Info,
} from 'lucide-react';
import {
  formatTimeRange,
  formatDateTime,
  getStatusBadgeStyle,
  getCategoryBadgeStyle,
} from '../utils/formatters';

export const AdminDashboardPage = () => {
  const { user, isAdmin, switchRole } = useAuth();
  const { socket } = useSocket();
  const { addToast, requestPushPermission, pushPermissionStatus } = useNotification();

  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'bookings' | 'notifications'
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [pushSettings, setPushSettings] = useState({ registeredDevices: 0, telegramConfigured: false });
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread' | 'new_booking' | 'cancellation'
  const [isLoading, setIsLoading] = useState(true);

  // Telegram Config State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Resource Form Modal State
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Labs',
    location: '',
    capacity: 20,
    description: '',
    imageUrl: '',
    amenities: '',
    rules: '',
    status: 'available',
  });

  // Admin Override Modal
  const [overrideBooking, setOverrideBooking] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'resources') {
        const res = await api.getResources();
        setResources(res.resources || []);
      } else if (activeTab === 'bookings') {
        const res = await api.getAllBookings();
        setBookings(res.bookings || []);
      } else if (activeTab === 'notifications') {
        await fetchAdminNotifications();
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminNotifications = async () => {
    try {
      const res = await api.getAdminNotifications();
      setAdminNotifications(res.notifications || []);
      setUnreadNotifCount(res.unreadCount || 0);
      if (res.pushSettings) {
        setPushSettings(res.pushSettings);
      }
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
      fetchAdminNotifications();
    }
  }, [activeTab, isAdmin]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket || !isAdmin) return;

    const handleUpdate = () => {
      fetchAdminData();
      fetchAdminNotifications();
    };

    const handleAdminNotif = (notif) => {
      setAdminNotifications((prev) => [notif, ...prev]);
      setUnreadNotifCount((prev) => prev + 1);
    };

    socket.on('booking_created', handleUpdate);
    socket.on('booking_cancelled', handleUpdate);
    socket.on('resource_updated', handleUpdate);
    socket.on('resource_status_changed', handleUpdate);
    socket.on('new_admin_notification', handleAdminNotif);

    return () => {
      socket.off('booking_created', handleUpdate);
      socket.off('booking_cancelled', handleUpdate);
      socket.off('resource_updated', handleUpdate);
      socket.off('resource_status_changed', handleUpdate);
      socket.off('new_admin_notification', handleAdminNotif);
    };
  }, [socket, isAdmin, activeTab]);

  const handleOpenAddModal = () => {
    setEditingResource(null);
    setFormData({
      name: '',
      category: 'Labs',
      location: '',
      capacity: 25,
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=800&q=80',
      amenities: 'High-Speed WiFi, 4K HD Displays, Air Conditioned',
      rules: 'Campus ID required for entry, Keep workstations tidy',
      status: 'available',
    });
    setIsResourceModalOpen(true);
  };

  const handleOpenEditModal = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      category: resource.category,
      location: resource.location,
      capacity: resource.capacity,
      description: resource.description || '',
      imageUrl: resource.image_url || '',
      amenities: Array.isArray(resource.amenities)
        ? resource.amenities.join(', ')
        : resource.amenities || '',
      rules: Array.isArray(resource.rules) ? resource.rules.join(', ') : resource.rules || '',
      status: resource.status,
    });
    setIsResourceModalOpen(true);
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amenities: formData.amenities.split(',').map((s) => s.trim()).filter(Boolean),
        rules: formData.rules.split(',').map((s) => s.trim()).filter(Boolean),
      };

      if (editingResource) {
        await api.updateResource(editingResource.id, payload);
        addToast({
          title: 'Facility Updated',
          message: `"${formData.name}" details updated successfully.`,
          type: 'confirmation',
        });
      } else {
        await api.createResource(payload);
        addToast({
          title: 'Facility Added',
          message: `"${formData.name}" added to campus directory.`,
          type: 'confirmation',
        });
      }

      setIsResourceModalOpen(false);
      fetchAdminData();
    } catch (err) {
      console.error('Error saving resource:', err);
      addToast({
        title: 'Operation Failed',
        message: err.message || 'Could not save resource.',
        type: 'alert',
      });
    }
  };

  const handleToggleStatus = async (resource) => {
    const nextStatus = resource.status === 'available' ? 'maintenance' : 'available';
    try {
      await api.toggleResourceStatus(resource.id, nextStatus);
      addToast({
        title: 'Status Changed',
        message: `"${resource.name}" is now marked as ${nextStatus}.`,
        type: 'info',
      });
      fetchAdminData();
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const handleDeleteResource = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from campus resources?`)) {
      return;
    }

    try {
      await api.deleteResource(id);
      addToast({
        title: 'Facility Deleted',
        message: `"${name}" was removed.`,
        type: 'alert',
      });
      fetchAdminData();
    } catch (err) {
      console.error('Error deleting resource:', err);
    }
  };

  const handleExecuteOverride = async () => {
    if (!overrideBooking) return;
    try {
      await api.cancelBooking(overrideBooking.id, overrideReason || 'Administrative Schedule Override');
      addToast({
        title: 'Schedule Overridden',
        message: `Cancelled reservation #${overrideBooking.id}. Slot is now open.`,
        type: 'confirmation',
      });
      setOverrideBooking(null);
      fetchAdminData();
    } catch (err) {
      console.error('Error overriding booking:', err);
      addToast({
        title: 'Override Failed',
        message: err.message,
        type: 'alert',
      });
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadNotifCount(0);
      addToast({
        title: 'Notifications Cleared',
        message: 'All notifications marked as read.',
        type: 'info',
      });
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleTestPhonePush = async () => {
    setIsTestingPush(true);
    try {
      const res = await api.triggerTestPhonePush();
      await fetchAdminNotifications();
      addToast({
        title: '📱 Phone Notification Dispatched',
        message: res.message || 'Test push alert sent to connected phone and browser!',
        type: 'confirmation',
      });
    } catch (err) {
      console.error('Error testing push notification:', err);
      addToast({
        title: 'Push Test Failed',
        message: err.message,
        type: 'alert',
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleSaveTelegram = async (e) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    try {
      const res = await api.configureTelegramPush(telegramBotToken, telegramChatId);
      addToast({
        title: '📱 Telegram Alerts Activated',
        message: res.message || 'Phone notifications connected!',
        type: 'confirmation',
      });
      setIsTelegramModalOpen(false);
      fetchAdminNotifications();
    } catch (err) {
      console.error('Error saving telegram config:', err);
      addToast({
        title: 'Telegram Setup Failed',
        message: err.message,
        type: 'alert',
      });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered notifications
  const filteredNotifications = adminNotifications.filter((n) => {
    if (notifFilter === 'unread') return !n.is_read;
    if (notifFilter === 'new_booking') return n.type === 'new_booking' || n.title?.toLowerCase().includes('booking');
    if (notifFilter === 'cancellation') return n.type === 'cancellation' || n.title?.toLowerCase().includes('cancel');
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 p-8 max-w-lg mx-auto">
        <ShieldCheck className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400 mt-2">
          You are currently logged in as a <strong>{user?.role || 'student'}</strong>. Switch to the Administrator profile to manage campus facilities and notifications.
        </p>
        <button
          onClick={() => switchRole('admin')}
          className="mt-6 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-900/40 transition active:scale-95"
        >
          Switch to Admin Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Campus Infrastructure Control</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-white font-heading">
            Admin Management Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Logged in as <strong className="text-white">{user?.name}</strong> • Facilities Director & Operations
          </p>
        </div>

        {/* Action Tabs & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'resources'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Facility Catalogue ({resources.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'bookings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>All Reservations ({bookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 relative ${
                activeTab === 'notifications'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-indigo-400" />
              <span>Notifications & Alerts</span>
              {unreadNotifCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'resources' && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility</span>
            </button>
          )}

          {activeTab === 'notifications' && (
            <button
              onClick={handleTestPhonePush}
              disabled={isTestingPush}
              className="px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-950/40 transition flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>{isTestingPush ? 'Sending...' : 'Test Phone Alert 📱'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Total Facilities</div>
            <div className="text-lg font-bold text-white">{resources.length || '19'}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Total Bookings</div>
            <div className="text-lg font-bold text-white">{bookings.length || '—'}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Unread Alerts</div>
            <div className="text-lg font-bold text-white">{unreadNotifCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Phone Alerts</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{pushSettings.telegramConfigured ? 'Telegram Active' : 'Push Ready'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TAB 3: NOTIFICATIONS & PHONE ALERTS ================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-fade-in">
          {/* Phone Push Notification Setup & Status Bar */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900/90 via-indigo-950/30 to-slate-900/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading">
                  Instant Phone & Mobile Alerts Engine
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Active
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                  Every booking is permanently stored in the database and dispatches instant push alerts to registered mobile devices and Telegram.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={requestPushPermission}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5 active:scale-95"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span>{pushPermissionStatus === 'granted' ? 'Browser Push: Enabled' : 'Enable Device Push'}</span>
              </button>

              <button
                onClick={() => setIsTelegramModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-900/30 transition flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5 text-emerald-300" />
                <span>{pushSettings.telegramConfigured ? 'Telegram: Connected ✓' : 'Connect Telegram Phone 📱'}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & Notification Controls */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filter:
              </span>
              {[
                { id: 'all', label: `All Events (${adminNotifications.length})` },
                { id: 'unread', label: `Unread (${unreadNotifCount})` },
                { id: 'new_booking', label: '🎟️ New Bookings' },
                { id: 'cancellation', label: '❌ Cancellations' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setNotifFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium border transition ${
                    notifFilter === f.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {unreadNotifCount > 0 && (
              <button
                onClick={handleMarkAllNotifsRead}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-800 hover:border-indigo-500/40 rounded-xl transition flex items-center gap-1.5 font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>

          {/* Notifications Feed */}
          {filteredNotifications.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Notifications Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {notifFilter === 'unread'
                  ? 'All caught up! There are no unread notifications.'
                  : 'New booking and cancellation notifications will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => {
                const isNewBooking = notif.type === 'new_booking' || notif.title?.toLowerCase().includes('booking');
                const isCancel = notif.type === 'cancellation' || notif.title?.toLowerCase().includes('cancel');
                const isAlert = notif.type === 'alert';

                let borderClass = 'border-slate-800 bg-slate-900/70';
                let badgeClass = 'bg-slate-800 text-slate-300';
                let iconColor = 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30';

                if (!notif.is_read) {
                  borderClass = 'border-indigo-500/40 bg-slate-900/90 shadow-lg shadow-indigo-950/20';
                }

                if (isNewBooking) {
                  badgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                  iconColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
                } else if (isCancel) {
                  badgeClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                  iconColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
                }

                return (
                  <div
                    key={notif.id}
                    className={`glass-panel p-5 rounded-2xl border transition-all ${borderClass}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left info */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${iconColor}`}>
                          {isNewBooking ? (
                            <Calendar className="w-5 h-5" />
                          ) : isCancel ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <Bell className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-lg border ${badgeClass}`}>
                              {isNewBooking ? 'New Booking' : isCancel ? 'Cancellation' : notif.type || 'Alert'}
                            </span>
                            {!notif.is_read && (
                              <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                                New
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatDateTime(notif.created_at || notif.createdAt)}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white leading-snug">
                            {notif.title}
                          </h4>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {notif.message}
                          </p>

                          {/* Extra Booking Metadata Pills */}
                          {(notif.booking_id || notif.resource_name || notif.user_name) && (
                            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                              {notif.user_name && (
                                <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                                  👤 <strong>{notif.user_name}</strong> ({notif.user_email || 'Student'})
                                </div>
                              )}
                              {notif.resource_name && (
                                <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                                  🏛️ <strong>{notif.resource_name}</strong>
                                </div>
                              )}
                              {notif.booking_id && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(notif.booking_id, notif.id)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 hover:text-white flex items-center gap-1 font-mono transition"
                                  title="Copy Booking ID"
                                >
                                  <span>ID: {notif.booking_id.slice(0, 12)}...</span>
                                  {copiedId === notif.id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-400" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        {!notif.is_read ? (
                          <button
                            onClick={() => handleMarkNotifRead(notif.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl transition shadow-sm"
                          >
                            Mark Read
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5 text-slate-600" /> Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 1: FACILITY CATALOGUE ================= */}
      {activeTab === 'resources' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Facility / Resource</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {resources.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-xs sm:text-sm">{r.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{r.description}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold glass-badge ${getCategoryBadgeStyle(r.category)}`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{r.location}</td>
                    <td className="p-4 text-slate-300">{r.capacity} Persons</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold glass-badge capitalize ${getStatusBadgeStyle(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          className={`p-1.5 rounded-xl border transition ${
                            r.status === 'available'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          }`}
                          title="Toggle Maintenance Mode"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(r)}
                          className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition"
                          title="Edit Facility"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(r.id, r.name)}
                          className="p-1.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition"
                          title="Delete Facility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ALL RESERVATIONS ================= */}
      {activeTab === 'bookings' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Reservation Title</th>
                  <th className="p-4">Student / User</th>
                  <th className="p-4">Scheduled Slot</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-xs sm:text-sm">{b.title || b.resource_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.resource_name} • {b.location}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{b.user_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{b.user_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300 font-medium">{formatTimeRange(b.start_time, b.end_time)}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold glass-badge capitalize ${getStatusBadgeStyle(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {b.status === 'upcoming' && (
                        <button
                          onClick={() => {
                            setOverrideBooking(b);
                            setOverrideReason('Administrative schedule conflict resolution');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl transition"
                        >
                          Override Slot
                        </button>
                      )}
                      {b.status === 'checked-in' && (
                        <span className="text-xs text-amber-400 font-medium">In Session</span>
                      )}
                      {b.status === 'completed' && (
                        <span className="text-xs text-emerald-400 font-medium">Completed</span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="text-xs text-slate-500 italic">Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TELEGRAM PHONE NOTIFICATION SETUP MODAL */}
      {isTelegramModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    Connect Phone for Instant Alerts
                  </h3>
                  <p className="text-xs text-slate-400">Telegram Bot Push Integration</p>
                </div>
              </div>
              <button
                onClick={() => setIsTelegramModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTelegram} className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Simple 1-Minute Setup:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  <li>Open Telegram on your phone and search for <strong>@BotFather</strong>.</li>
                  <li>Type <code className="text-indigo-300">/newbot</code> to create your bot and copy the API Token.</li>
                  <li>Message your new bot or search <strong>@userinfobot</strong> to get your numerical Chat ID.</li>
                  <li>Paste both below to receive real-time push notifications!</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Telegram Bot API Token *
                </label>
                <input
                  type="text"
                  required
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="e.g. 7123456789:AAFlkjw9823kjs..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Telegram Chat ID *
                </label>
                <input
                  type="text"
                  required
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTelegramModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTelegram}
                  className="px-5 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>{isSavingTelegram ? 'Connecting...' : 'Save & Test Alert 📱'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOURCE ADD / EDIT MODAL */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-base font-bold text-white font-heading">
                {editingResource ? 'Edit Facility Details' : 'Add New Campus Facility'}
              </h3>
              <button
                onClick={() => setIsResourceModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Advanced AI Research Cluster"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Labs">Labs</option>
                    <option value="Seminar Halls">Seminar Halls</option>
                    <option value="Sports">Sports</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Capacity (Persons) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Location & Room *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Science Block, Room 204"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of hardware or capacity..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amenities (Comma separated)</label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  placeholder="WiFi, Projector, Smart Display..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResourceModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition"
                >
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERRIDE MODAL */}
      {overrideBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Emergency Override</h3>
              </div>
              <button
                onClick={() => setOverrideBooking(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                You are cancelling <strong>{overrideBooking.user_name}</strong>'s reservation for{' '}
                <strong>{overrideBooking.resource_name}</strong> on{' '}
                <strong>{formatTimeRange(overrideBooking.start_time, overrideBooking.end_time)}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Administrative Override Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Emergency maintenance or official university symposium..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideBooking(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteOverride}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/40 transition"
                >
                  Confirm Slot Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
