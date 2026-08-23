const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbRun } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await dbAll(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 30`,
      [req.user.id]
    );

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error fetching notifications.' });
  }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Server error updating notification.' });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await dbRun(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ error: 'Server error updating notifications.' });
  }
});

// POST /api/notifications/test-reminder - Instant demo reminder trigger (FR9 evaluator helper)
router.post('/test-reminder', authenticateToken, async (req, res) => {
  try {
    const notificationId = uuidv4();
    const title = '⚡ Simulated 30-Min Automated Reminder';
    const message = 'Reminder: Your booked session for "Advanced AI & GPU Computing Lab" begins in 30 minutes at Tech Building, Room 402. Don\'t forget your QR Pass!';

    await dbRun(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read)
       VALUES (?, ?, ?, ?, 'reminder', 0)`,
      [notificationId, req.user.id, title, message]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('new_notification', {
        id: notificationId,
        title,
        message,
        type: 'reminder',
        createdAt: new Date().toISOString()
      });
    }

    res.json({ message: 'Test reminder dispatched!', notificationId });
  } catch (err) {
    console.error('Error sending test reminder:', err);
    res.status(500).json({ error: 'Server error sending reminder.' });
  }
});

module.exports = router;
