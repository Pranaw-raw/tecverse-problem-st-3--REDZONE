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
  const { isAuthenticated, user } = useAuth();
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

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    playAlertChime();

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
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_cancelled', handleBookingCancelled);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_cancelled', handleBookingCancelled);
    };
  }, [socket]);

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
    setIsDrawerOpen,
    addToast,
    removeToast,
    markAsRead,
    markAllAsRead,
    triggerTestReminder,
    fetchNotifications,
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
