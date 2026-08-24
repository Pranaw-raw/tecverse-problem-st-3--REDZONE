const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { dispatchPhonePush, sendTelegramPhonePush } = require('../services/notificationService');

// GET /api/notifications - Get current user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await dbAll(
      `SELECT n.*, b.resource_id, b.start_time, b.end_time, r.name as resource_name, r.location
       FROM notifications n
       LEFT JOIN bookings b ON n.booking_id = b.id
       LEFT JOIN resources r ON b.resource_id = r.id
       WHERE n.user_id = ? 
       ORDER BY n.created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ error: 'Server error fetching notifications.' });
  }
});

// GET /api/notifications/admin - Get all campus notifications for Admin Hub (Admin only)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const notifications = await dbAll(
      `SELECT n.*, 
              u.name as user_name, u.email as user_email, u.role as user_role, u.department as user_department,
              b.resource_id, b.start_time, b.end_time, b.purpose, b.status as booking_status,
              r.name as resource_name, r.location as resource_location, r.category as resource_category
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       LEFT JOIN bookings b ON n.booking_id = b.id
       LEFT JOIN resources r ON b.resource_id = r.id
       WHERE n.user_id = ? OR n.type IN ('new_booking', 'cancellation', 'alert')
       ORDER BY n.created_at DESC 
       LIMIT 100`,
      [req.user.id]
    );

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    // Fetch registered device count and push channel status
    const subscriptions = await dbAll(`SELECT COUNT(*) as count FROM device_subscriptions`);
    const dbBotToken = await dbGet("SELECT value FROM system_settings WHERE key = 'telegram_bot_token'");
    const dbChatId = await dbGet("SELECT value FROM system_settings WHERE key = 'telegram_chat_id'");

    const telegramConfigured = Boolean(
      (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) ||
      (dbBotToken?.value && dbChatId?.value)
    );

    res.json({
      notifications,
      unreadCount,
      totalCount: notifications.length,
      pushSettings: {
        registeredDevices: subscriptions[0]?.count || 0,
        telegramConfigured,
        fcmConfigured: Boolean(process.env.FCM_SERVER_KEY || process.env.FIREBASE_PROJECT_ID)
      }
    });
  } catch (err) {
    console.error('Error fetching admin notifications:', err);
    res.status(500).json({ error: 'Server error fetching admin notifications.' });
  }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      await dbRun(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    } else {
      await dbRun(
        `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
      );
    }
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Server error updating notification.' });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read for current user
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    if (isAdmin) {
      await dbRun(`UPDATE notifications SET is_read = 1`);
    } else {
      await dbRun(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user.id]);
    }
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ error: 'Server error updating notifications.' });
  }
});

// POST /api/notifications/device-token - Register device for Push Notifications (FCM / Web Push)
router.post('/device-token', authenticateToken, async (req, res) => {
  try {
    const { token, endpoint, subscription, platform = 'web', deviceInfo = 'Browser Device' } = req.body;

    if (!token && !endpoint && !subscription) {
      return res.status(400).json({ error: 'Device token or WebPush subscription is required.' });
    }

    const subId = uuidv4();
    const tokenVal = token || (subscription ? JSON.stringify(subscription) : endpoint);
    const subJson = subscription ? JSON.stringify(subscription) : '';

    // Check if token is already registered for this user
    const existing = await dbGet(
      `SELECT id FROM device_subscriptions WHERE user_id = ? AND (fcm_token = ? OR endpoint = ?)`,
      [req.user.id, tokenVal, endpoint || '']
    );

    if (!existing) {
      await dbRun(
        `INSERT INTO device_subscriptions (id, user_id, endpoint, fcm_token, subscription_json, device_info, platform)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [subId, req.user.id, endpoint || '', tokenVal, subJson, deviceInfo, platform]
      );
    }

    res.json({
      message: 'Device registered for push notifications successfully.',
      subscriptionId: subId
    });
  } catch (err) {
    console.error('Error registering device token:', err);
    res.status(500).json({ error: 'Server error registering push device.' });
  }
});

// POST /api/notifications/test-phone-push - Trigger test push notification to phone & admin
router.post('/test-phone-push', authenticateToken, async (req, res) => {
  try {
    const title = '📱 Campus Booking Alert (Test)';
    const message = `Test Alert: Instant phone push notification test from ReserveHub. System timestamp: ${new Date().toLocaleTimeString()}.`;

    const notificationId = uuidv4();
    await dbRun(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read)
       VALUES (?, ?, ?, ?, 'alert', 0)`,
      [notificationId, req.user.id, title, message]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('new_admin_notification', {
        id: notificationId,
        title,
        message,
        type: 'alert',
        createdAt: new Date().toISOString()
      });
    }

    // Attempt Telegram Push
    const telegramResult = await sendTelegramPhonePush({
      title,
      message,
      user: req.user,
      resource: { name: 'Indoor Badminton Arena', location: 'Indoor Sports Complex' }
    });

    res.json({
      message: 'Test notification created and phone push dispatched!',
      notificationId,
      telegram: telegramResult
    });
  } catch (err) {
    console.error('Error sending test push notification:', err);
    res.status(500).json({ error: 'Server error sending test notification.' });
  }
});

// POST /api/notifications/configure-telegram - Save Telegram bot token & chat ID for phone alerts
router.post('/configure-telegram', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { botToken, chatId } = req.body;

    if (!botToken || !chatId) {
      return res.status(400).json({ error: 'Bot Token and Chat ID are required.' });
    }

    // Upsert into system_settings
    await dbRun(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('telegram_bot_token', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [botToken.trim()]
    );

    await dbRun(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('telegram_chat_id', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [chatId.trim()]
    );

    // Test sending welcome message to phone
    const testResult = await sendTelegramPhonePush({
      title: 'Phone Notifications Activated',
      message: 'ReserveHub phone alerts are now linked to this Telegram device! You will receive instant notifications whenever students reserve campus facilities.',
      user: req.user
    });

    res.json({
      message: 'Telegram phone push configured successfully!',
      testResult
    });
  } catch (err) {
    console.error('Error configuring Telegram push:', err);
    res.status(500).json({ error: 'Server error configuring Telegram push.' });
  }
});

module.exports = router;
