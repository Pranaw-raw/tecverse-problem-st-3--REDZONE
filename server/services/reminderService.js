const { dbAll, dbRun, dbGet } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Background Reminder Service:
 * - Scans for bookings starting in the next 15-60 minutes
 * - Creates in-app notifications if not already generated
 * - Emits real-time socket events
 * - Automatically marks past un-checked-in bookings as completed or no-show
 */
const initReminderService = (io) => {
  console.log('Automated Reminder & Lifecycle Service initialized.');

  const checkReminders = async () => {
    try {
      const now = new Date();
      const sixtyMinsLater = new Date(now.getTime() + 60 * 60000);

      // Find upcoming bookings in the next 60 minutes
      const upcomingBookings = await dbAll(
        `SELECT b.id, b.user_id, b.resource_id, b.title, b.start_time, b.end_time,
                r.name as resource_name, r.location, u.name as user_name, u.email as user_email
         FROM bookings b
         JOIN resources r ON b.resource_id = r.id
         JOIN users u ON b.user_id = u.id
         WHERE b.status = 'upcoming'
           AND datetime(b.start_time) > datetime(?)
           AND datetime(b.start_time) <= datetime(?)`,
        [now.toISOString(), sixtyMinsLater.toISOString()]
      );

      for (const booking of upcomingBookings) {
        const startDiffMins = Math.round((new Date(booking.start_time) - now) / 60000);

        // Check if reminder notification already sent for this booking
        const existingNotification = await dbGet(
          `SELECT id FROM notifications WHERE booking_id = ? AND type = 'reminder'`,
          [booking.id]
        );

        if (!existingNotification) {
          const notificationId = uuidv4();
          const title = `Reminder: "${booking.resource_name}" in ${startDiffMins} min`;
          const message = `Your booking for "${booking.title || booking.resource_name}" at ${booking.location} begins at ${new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please arrive on time and scan the QR code to check in.`;

          await dbRun(
            `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read)
             VALUES (?, ?, ?, ?, ?, 'reminder', 0)`,
            [notificationId, booking.user_id, booking.id, title, message]
          );

          // Emit live socket event to user
          if (io) {
            io.to(`user_${booking.user_id}`).emit('new_notification', {
              id: notificationId,
              bookingId: booking.id,
              title,
              message,
              type: 'reminder',
              createdAt: new Date().toISOString()
            });

            // Also broadcast a system alert
            io.emit('system_alert', {
              type: 'reminder',
              bookingId: booking.id,
              resourceName: booking.resource_name,
              userName: booking.user_name,
              startTime: booking.start_time
            });
          }

          console.log(`[Reminder Sent] For booking ${booking.id} to user ${booking.user_email} (${startDiffMins}m until start)`);
        }
      }

      // Auto-complete ended bookings
      await dbRun(
        `UPDATE bookings 
         SET status = 'completed' 
         WHERE status = 'checked-in' 
           AND datetime(end_time) <= datetime(?)`,
        [now.toISOString()]
      );

      // Auto-mark expired un-checked-in bookings as no-show (if end_time passed)
      await dbRun(
        `UPDATE bookings 
         SET status = 'no-show' 
         WHERE status = 'upcoming' 
           AND datetime(end_time) <= datetime(?)`,
        [now.toISOString()]
      );

    } catch (err) {
      console.error('Error in reminder service:', err.message);
    }
  };

  // Run immediately and every 30 seconds
  checkReminders();
  const interval = setInterval(checkReminders, 30000);

  return () => clearInterval(interval);
};

module.exports = {
  initReminderService
};
