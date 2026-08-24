import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const { isAuthenticated, user, isAdmin } = useAuth();
  const { socket } = useSocket();

  // Play subtle pleasant chime using Web Audio API
  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Audio context might be restricted before first gesture
    }
  };

  const showBrowserNotification = (title, body) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/vite.svg',
          badge: '/vite.svg',
          tag: 'reservehub-booking-alert'
        });
      } catch (err) {
        console.warn('Native notification error:', err);
      }
    }
  };

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    playAlertChime();
    showBrowserNotification(toast.title, toast.message);

    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isAuthenticated, user?.id]);

  // Request browser and device push notification permission
  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Push notifications are not supported in this browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermissionStatus(permission);

      if (permission === 'granted') {
        // Register service worker if available
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[ServiceWorker] Push worker registered:', reg.scope);
          } catch (e) {
            console.warn('[ServiceWorker] Failed to register sw:', e);
          }
        }

        // Register dummy/device token on backend
        const simulatedToken = `DEVICE-WEB-${user?.id || 'admin'}-${Date.now().toString(36)}`;
        await api.registerDeviceToken({
          token: simulatedToken,
          deviceInfo: navigator.userAgent || 'Web Browser',
          platform: 'web'
        });

        addToast({
          title: '📱 Phone & Browser Push Enabled',
          message: 'You will now receive instant push alerts whenever a resource is booked.',
          type: 'confirmation'
        });
        return true;
      } else {
        addToast({
          title: 'Push Permission Denied',
          message: 'Please enable notifications in your browser settings to receive alerts.',
          type: 'alert'
        });
        return false;
      }
    } catch (err) {
      console.error('Push permission error:', err);
      return false;
    }
  };

  // Listen to Socket.io notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      addToast({
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
      });
    };

    const handleNewAdminNotification = (adminNotif) => {
      if (isAdmin) {
        addToast({
          title: `🔔 ${adminNotif.title}`,
          message: adminNotif.message,
          type: adminNotif.type === 'cancellation' ? 'alert' : 'confirmation',
        });
      }
    };

    const handleBookingCreated = (data) => {
      addToast({
        title: '⚡ Live Calendar Sync',
        message: `Resource has a newly confirmed booking. Calendar refreshed.`,
        type: 'info',
      });
    };

    const handleBookingCancelled = (data) => {
      addToast({
        title: '🔓 Slot Liberated',
        message: `A booking was cancelled. The time slot is now open for reservation!`,
        type: 'alert',
      });
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('new_admin_notification', handleNewAdminNotification);
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_cancelled', handleBookingCancelled);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('new_admin_notification', handleNewAdminNotification);
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_cancelled', handleBookingCancelled);
    };
  }, [socket, isAdmin]);

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const triggerTestReminder = async () => {
    try {
      const res = await api.triggerTestReminder();
      await fetchNotifications();
      addToast({
        title: '⚡ Simulated 30-Min Automated Reminder',
        message: 'Reminder notification dispatched for upcoming booking!',
        type: 'reminder',
      });
      return res;
    } catch (err) {
      console.error('Error triggering test reminder:', err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    toasts,
    isDrawerOpen,
    pushPermissionStatus,
    setIsDrawerOpen,
    addToast,
    removeToast,
    markAsRead,
    markAllAsRead,
    triggerTestReminder,
    fetchNotifications,
    requestPushPermission,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
