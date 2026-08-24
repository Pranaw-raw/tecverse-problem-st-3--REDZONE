const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { checkConflict } = require('../services/conflictDetector');
const {
  sendBookingCreatedNotification,
  sendBookingCancelledNotification,
  sendCheckInNotification
} = require('../services/notificationService');

// POST /api/bookings - Create a new booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { resourceId, title, purpose, startTime, endTime } = req.body;
    const userId = req.user.id;

    if (!resourceId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Resource, start time, and end time are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date/time format.' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after Start time.' });
    }

    // Min 15 mins, max 12 hours booking window
    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < 15) {
      return res.status(400).json({ error: 'Minimum booking duration is 15 minutes.' });
    }
    if (durationMinutes > 720) {
      return res.status(400).json({ error: 'Maximum booking duration is 12 hours.' });
    }

    // Atomic Conflict Detection Check
    const conflictResult = await checkConflict(resourceId, start.toISOString(), end.toISOString());
    if (conflictResult.hasConflict) {
      return res.status(409).json({
        error: conflictResult.reason,
        conflicts: conflictResult.conflicts || []
      });
    }

    const resource = conflictResult.resource;
    const bookingId = uuidv4();
    const qrToken = `RH-${Buffer.from(bookingId).toString('base64').substring(0, 10).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    await dbRun(
      `INSERT INTO bookings (id, user_id, resource_id, title, purpose, start_time, end_time, status, qr_code_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming', ?)`,
      [
        bookingId,
        userId,
        resourceId,
        title ? title.trim() : `Booking for ${resource.name}`,
        purpose ? purpose.trim() : '',
        start.toISOString(),
        end.toISOString(),
        qrToken
      ]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'BOOKING_CREATED', 'BOOKING', ?, ?)`,
      [
        uuidv4(),
        userId,
        bookingId,
        `User ${req.user.name} (${req.user.email}) booked ${resource.name} from ${start.toISOString()} to ${end.toISOString()}`
      ]
    );

    const createdBooking = await dbGet(
      `SELECT b.*, r.name as resource_name, r.location, r.category, r.image_url, u.name as user_name, u.email as user_email
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [bookingId]
    );

    // Broadcast live WebSocket event for real-time calendar refresh
    const io = req.app.get('io');
    if (io) {
      io.emit('booking_created', {
        booking: createdBooking,
        resourceId,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
    }

    // Trigger persistent DB notification, admin notification stream, and instant phone push alerts
    sendBookingCreatedNotification({
      booking: createdBooking,
      user: req.user,
      resource,
      io
    }).catch((err) => console.error('[Async Notification Dispatch Error]:', err));

    res.status(201).json({
      message: 'Booking created successfully.',
      booking: createdBooking
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Server error creating booking.' });
  }
});

// GET /api/bookings/my - Get current user's booking history
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT b.*, r.name as resource_name, r.location, r.category, r.image_url, r.capacity
      FROM bookings b
      JOIN resources r ON b.resource_id = r.id
      WHERE b.user_id = ?
    `;
    const params = [req.user.id];

    if (status && status !== 'all') {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY b.start_time DESC`;

    const bookings = await dbAll(query, params);
    res.json({ bookings });
  } catch (err) {
    console.error('Error fetching my bookings:', err);
    res.status(500).json({ error: 'Server error fetching bookings.' });
  }
});

// GET /api/bookings/all - Admin view of all bookings across campus
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, resourceId, userId, startDate, endDate, search } = req.query;

    let query = `
      SELECT b.*, r.name as resource_name, r.location, r.category, u.name as user_name, u.email as user_email, u.department
      FROM bookings b
      JOIN resources r ON b.resource_id = r.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    if (resourceId) {
      query += ` AND b.resource_id = ?`;
      params.push(resourceId);
    }

    if (userId) {
      query += ` AND b.user_id = ?`;
      params.push(userId);
    }

    if (startDate) {
      query += ` AND datetime(b.start_time) >= datetime(?)`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND datetime(b.end_time) <= datetime(?)`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (r.name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR b.title LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY b.start_time DESC LIMIT 100`;

    const bookings = await dbAll(query, params);
    res.json({ bookings });
  } catch (err) {
    console.error('Error fetching all bookings:', err);
    res.status(500).json({ error: 'Server error fetching all bookings.' });
  }
});

// GET /api/bookings/:id - Single booking details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await dbGet(
      `SELECT b.*, r.name as resource_name, r.location, r.category, r.image_url, r.capacity,
              u.name as user_name, u.email as user_email, u.department
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Only owner or admin can view
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ booking });
  } catch (err) {
    console.error('Error fetching booking details:', err);
    res.status(500).json({ error: 'Server error fetching booking.' });
  }
});

// POST /api/bookings/:id/cancel - Cancel booking
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const booking = await dbGet(
      `SELECT b.*, r.name as resource_name, u.name as user_name, u.email as user_email
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Owner or admin only
    const isAdmin = req.user.role === 'admin';
    if (booking.user_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to cancel this booking.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Completed bookings cannot be cancelled.' });
    }

    await dbRun(
      `UPDATE bookings 
       SET status = 'cancelled', cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [reason, id]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'BOOKING_CANCELLED', 'BOOKING', ?, ?)`,
      [uuidv4(), req.user.id, id, `Cancelled booking for "${booking.resource_name}". Reason: ${reason}`]
    );

    // Broadcast live WebSocket event so all users' calendars immediately show the freed slot
    const io = req.app.get('io');
    if (io) {
      io.emit('booking_cancelled', {
        bookingId: id,
        resourceId: booking.resource_id,
        startTime: booking.start_time,
        endTime: booking.end_time
      });

      io.to(`user_${booking.user_id}`).emit('booking_status_updated', {
        bookingId: id,
        status: 'cancelled'
      });
    }

    // Trigger persistent cancellation notification and phone push
    sendBookingCancelledNotification({
      booking,
      user: { name: booking.user_name, email: booking.user_email },
      resource: { name: booking.resource_name },
      cancelledBy: req.user.name,
      reason,
      io
    }).catch((err) => console.error('[Async Cancellation Notification Error]:', err));

    res.json({
      message: 'Booking cancelled successfully. Time slot has been freed up.',
      bookingId: id,
      status: 'cancelled'
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Server error cancelling booking.' });
  }
});

// POST /api/bookings/qr-checkin - QR scanner check-in endpoint (FR8)
router.post('/qr-checkin', authenticateToken, async (req, res) => {
  try {
    const { qrToken, bookingId } = req.body;

    let query = `
      SELECT b.*, r.name as resource_name, r.location, u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN resources r ON b.resource_id = r.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (qrToken) {
      query += ` AND b.qr_code_token = ?`;
      params.push(qrToken.trim());
    } else if (bookingId) {
      query += ` AND b.id = ?`;
      params.push(bookingId);
    } else {
      return res.status(400).json({ error: 'QR token or Booking ID is required.' });
    }

    const booking = await dbGet(query, params);

    if (!booking) {
      return res.status(404).json({ error: 'Invalid QR Code or Booking token not found.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'This booking was cancelled and cannot be checked into.' });
    }

    if (booking.status === 'checked-in') {
      return res.json({
        message: 'Already checked in!',
        booking,
        alreadyCheckedIn: true
      });
    }

    // Verify user ownership or admin
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This booking belongs to another user.' });
    }

    const checkInTime = new Date().toISOString();
    await dbRun(
      `UPDATE bookings 
       SET status = 'checked-in', checked_in_at = ? 
       WHERE id = ?`,
      [checkInTime, booking.id]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'QR_CHECKIN', 'BOOKING', ?, ?)`,
      [uuidv4(), req.user.id, booking.id, `Checked in at ${checkInTime} for resource ${booking.resource_name}`]
    );

    // Broadcast live event
    const io = req.app.get('io');
    if (io) {
      io.emit('booking_checked_in', {
        bookingId: booking.id,
        resourceId: booking.resource_id,
        checkedInAt: checkInTime
      });
    }

    sendCheckInNotification({
      booking,
      user: req.user,
      resource: { name: booking.resource_name },
      io
    }).catch((err) => console.error('[Async Check-In Notification Error]:', err));

    res.json({
      message: `Check-in successful! Welcome to ${booking.resource_name}.`,
      booking: {
        ...booking,
        status: 'checked-in',
        checked_in_at: checkInTime
      }
    });
  } catch (err) {
    console.error('Error processing QR check-in:', err);
    res.status(500).json({ error: 'Server error processing check-in.' });
  }
});

module.exports = router;
