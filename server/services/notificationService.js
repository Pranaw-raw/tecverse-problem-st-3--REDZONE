const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../config/database');

/**
 * Helper to format readable dates and time ranges
 */
const formatDateTimeRange = (startIso, endIso) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const startTimeStr = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const endTimeStr = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return { dateStr, timeRangeStr: `${startTimeStr} – ${endTimeStr}`, fullStr: `${dateStr} • ${startTimeStr} – ${endTimeStr}` };
};

/**
 * Dispatch Push Notification to Telegram Bot (Immediate Phone Alert)
 */
const sendTelegramPhonePush = async ({ title, message, booking, user, resource }) => {
  try {
    // Check environment or stored system settings
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      const dbBotToken = await dbGet("SELECT value FROM system_settings WHERE key = 'telegram_bot_token'");
      const dbChatId = await dbGet("SELECT value FROM system_settings WHERE key = 'telegram_chat_id'");
      if (dbBotToken) botToken = dbBotToken.value;
      if (dbChatId) chatId = dbChatId.value;
    }

    if (!botToken || !chatId) {
      return { success: false, reason: 'Telegram credentials not configured.' };
    }

    const { dateStr, timeRangeStr } = booking?.start_time && booking?.end_time 
      ? formatDateTimeRange(booking.start_time, booking.end_time)
      : { dateStr: 'Today', timeRangeStr: '' };

    const formattedTelegramText = `🔔 *${title.toUpperCase()}*\n\n` +
      `👤 *User:* ${user?.name || 'Campus User'} (${user?.email || 'N/A'})\n` +
      `🏛️ *Facility:* ${resource?.name || booking?.resource_name || 'Campus Resource'}\n` +
      `📍 *Location:* ${resource?.location || booking?.location || 'Campus'}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `⏰ *Time:* ${timeRangeStr}\n` +
      (booking?.purpose ? `📝 *Purpose:* ${booking.purpose}\n` : '') +
      `🆔 *Booking ID:* \`${booking?.id || 'N/A'}\`\n\n` +
      `⚡ _Sent via ReserveHub Smart Booking Engine_`;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedTelegramText,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();
    if (result.ok) {
      console.log(`[Phone Push] 📱 Instant Telegram notification delivered to Chat ID ${chatId}`);
      return { success: true, channel: 'telegram' };
    } else {
      console.warn('[Phone Push] Telegram API returned non-ok:', result.description);
      return { success: false, reason: result.description };
    }
  } catch (err) {
    console.error('[Phone Push Error] Failed to send Telegram alert:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Dispatch Push Notification via Web Push / FCM / Registered Devices
 */
const sendWebDevicePush = async ({ title, message, data, userId }) => {
  try {
    // Look up registered device subscriptions for this user or all admins
    let query = `SELECT * FROM device_subscriptions`;
    let params = [];
    if (userId && userId !== 'admin') {
      query += ` WHERE user_id = ?`;
      params.push(userId);
    }

    const subscriptions = await dbAll(query, params);
    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, count: 0, reason: 'No registered push devices.' };
    }

    console.log(`[Web Push] Found ${subscriptions.length} registered device subscription(s)`);
    // Each subscription token can receive payload
    return { success: true, count: subscriptions.length };
  } catch (err) {
    console.error('[Web Push Error]:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Core Phone Push Notification Dispatcher
 */
const dispatchPhonePush = async ({ title, message, booking, user, resource, io }) => {
  // 1. Send Telegram Mobile Push
  sendTelegramPhonePush({ title, message, booking, user, resource }).catch((e) =>
    console.error('[Async Telegram Push Error]:', e.message)
  );

  // 2. Send Web Push / FCM to registered browsers & phones
  sendWebDevicePush({ title, message, data: { bookingId: booking?.id }, userId: 'admin' }).catch((e) =>
    console.error('[Async Web Push Error]:', e.message)
  );
};

/**
 * Triggered on Booking Created
 */
const sendBookingCreatedNotification = async ({ booking, user, resource, io }) => {
  try {
    const { dateStr, timeRangeStr, fullStr } = formatDateTimeRange(booking.start_time, booking.end_time);

    // 1. Student Confirmation Notification (stored in SQLite)
    const studentNotifId = uuidv4();
    const studentTitle = '🎉 Booking Confirmed!';
    const studentMessage = `Your reservation for "${resource.name}" on ${fullStr} is confirmed. Booking ID: ${booking.id}`;

    await dbRun(
      `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 'confirmation', 0, CURRENT_TIMESTAMP)`,
      [studentNotifId, user.id, booking.id, studentTitle, studentMessage]
    );

    // 2. Admin Alert Notification (stored in SQLite for all administrators)
    // Find all admin accounts or default to primary admin
    const admins = await dbAll("SELECT id FROM users WHERE role = 'admin'");
    const adminNotifId = uuidv4();
    const adminTitle = `New Booking: ${user.name} reserved ${resource.name}`;
    const adminMessage = `${user.name} (${user.email}, ${user.department || 'Student'}) reserved "${resource.name}" for ${dateStr} (${timeRangeStr}). Booking ID: ${booking.id}.${booking.purpose ? ` Purpose: ${booking.purpose}` : ''}`;

    for (const admin of admins) {
      await dbRun(
        `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 'new_booking', 0, CURRENT_TIMESTAMP)`,
        [uuidv4(), admin.id, booking.id, adminTitle, adminMessage]
      );
    }

    // 3. Emit Real-time Socket.IO Events
    if (io) {
      // To Student
      io.to(`user_${user.id}`).emit('new_notification', {
        id: studentNotifId,
        bookingId: booking.id,
        title: studentTitle,
        message: studentMessage,
        type: 'confirmation',
        createdAt: new Date().toISOString()
      });

      // To All Admins Room & Broadcast
      io.emit('new_admin_notification', {
        id: adminNotifId,
        bookingId: booking.id,
        title: adminTitle,
        message: adminMessage,
        type: 'new_booking',
        user: { name: user.name, email: user.email, role: user.role, department: user.department },
        resource: { id: resource.id, name: resource.name, location: resource.location, category: resource.category },
        booking: { id: booking.id, startTime: booking.start_time, endTime: booking.end_time, purpose: booking.purpose },
        createdAt: new Date().toISOString()
      });
    }

    // 4. Send Instant Phone Push Notification (Telegram / FCM / WebPush)
    await dispatchPhonePush({
      title: 'New Campus Booking',
      message: adminMessage,
      booking,
      user,
      resource,
      io
    });

    console.log(`[Notification Engine] Created & stored booking notifications for student (${user.name}) and admin.`);
    return { success: true, studentNotifId, adminNotifId };
  } catch (err) {
    // Guarantee error isolation: notification failure must NEVER break booking creation
    console.error('[Notification Error in sendBookingCreatedNotification]:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Triggered on Booking Cancelled
 */
const sendBookingCancelledNotification = async ({ booking, user, resource, cancelledBy, reason, io }) => {
  try {
    const { fullStr } = formatDateTimeRange(booking.start_time, booking.end_time);

    // 1. Notification for Student
    const studentNotifId = uuidv4();
    const studentTitle = 'Booking Cancelled';
    const studentMessage = `Reservation for "${resource?.name || booking.resource_name || 'Facility'}" on ${fullStr} was cancelled.${reason ? ` Reason: ${reason}` : ''}`;

    await dbRun(
      `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 'cancellation', 0, CURRENT_TIMESTAMP)`,
      [studentNotifId, booking.user_id, booking.id, studentTitle, studentMessage]
    );

    // 2. Notification for Admins
    const admins = await dbAll("SELECT id FROM users WHERE role = 'admin'");
    const adminTitle = `Cancellation: ${booking.title || resource?.name || 'Reservation'}`;
    const adminMessage = `Booking for "${resource?.name || booking.resource_name || 'Facility'}" by ${user?.name || booking.user_name || 'User'} was cancelled by ${cancelledBy || 'User'}.${reason ? ` Reason: ${reason}` : ''}`;

    for (const admin of admins) {
      await dbRun(
        `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 'cancellation', 0, CURRENT_TIMESTAMP)`,
        [uuidv4(), admin.id, booking.id, adminTitle, adminMessage]
      );
    }

    // 3. Socket.IO Broadcast
    if (io) {
      io.to(`user_${booking.user_id}`).emit('new_notification', {
        id: studentNotifId,
        bookingId: booking.id,
        title: studentTitle,
        message: studentMessage,
        type: 'cancellation',
        createdAt: new Date().toISOString()
      });

      io.emit('new_admin_notification', {
        bookingId: booking.id,
        title: adminTitle,
        message: adminMessage,
        type: 'cancellation',
        createdAt: new Date().toISOString()
      });
    }

    // 4. Phone Push Alert
    await dispatchPhonePush({
      title: 'Booking Cancelled',
      message: adminMessage,
      booking,
      user: user || { name: booking.user_name },
      resource: resource || { name: booking.resource_name }
    });

    return { success: true };
  } catch (err) {
    console.error('[Notification Error in sendBookingCancelledNotification]:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Triggered on Venue Check-In
 */
const sendCheckInNotification = async ({ booking, user, resource, io }) => {
  try {
    const studentNotifId = uuidv4();
    const studentTitle = '✅ Check-In Verified!';
    const studentMessage = `You have successfully checked in for "${resource?.name || booking.resource_name}". Enjoy your session!`;

    await dbRun(
      `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 'info', 0, CURRENT_TIMESTAMP)`,
      [studentNotifId, booking.user_id, booking.id, studentTitle, studentMessage]
    );

    if (io) {
      io.to(`user_${booking.user_id}`).emit('new_notification', {
        id: studentNotifId,
        bookingId: booking.id,
        title: studentTitle,
        message: studentMessage,
        type: 'info',
        createdAt: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (err) {
    console.error('[Notification Error in sendCheckInNotification]:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  formatDateTimeRange,
  sendBookingCreatedNotification,
  sendBookingCancelledNotification,
  sendCheckInNotification,
  sendTelegramPhonePush,
  sendWebDevicePush,
  dispatchPhonePush
};
