const { dbAll, dbGet } = require('../config/database');

/**
 * Check if a resource has overlapping confirmed/active bookings.
 * Overlap condition: (existing.start_time < requested.end_time) AND (existing.end_time > requested.start_time)
 * Active statuses: 'upcoming', 'checked-in'
 */
const checkConflict = async (resourceId, startTime, endTime, excludeBookingId = null) => {
  // Validate time format and order
  const start = new Date(startTime).toISOString();
  const end = new Date(endTime).toISOString();

  if (new Date(start) >= new Date(end)) {
    return {
      hasConflict: true,
      reason: 'Invalid time window: End time must be strictly after Start time.'
    };
  }

  // Check if resource is active and not under maintenance
  const resource = await dbGet('SELECT * FROM resources WHERE id = ?', [resourceId]);
  if (!resource) {
    return {
      hasConflict: true,
      reason: 'Resource not found.'
    };
  }

  if (resource.status === 'maintenance') {
    return {
      hasConflict: true,
      reason: `Resource "${resource.name}" is currently under maintenance and cannot be booked.`
    };
  }

  if (resource.status === 'inactive') {
    return {
      hasConflict: true,
      reason: `Resource "${resource.name}" is inactive.`
    };
  }

  let query = `
    SELECT b.id, b.title, b.start_time, b.end_time, b.status, u.name as booked_by
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.resource_id = ?
      AND b.status IN ('upcoming', 'checked-in')
      AND datetime(b.start_time) < datetime(?)
      AND datetime(b.end_time) > datetime(?)
  `;
  const params = [resourceId, end, start];

  if (excludeBookingId) {
    query += ` AND b.id != ?`;
    params.push(excludeBookingId);
  }

  const conflictingBookings = await dbAll(query, params);

  if (conflictingBookings.length > 0) {
    return {
      hasConflict: true,
      reason: `Scheduling Conflict Detected: Resource is already booked from ${new Date(conflictingBookings[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(conflictingBookings[0].end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${conflictingBookings[0].booked_by || 'another user'}.`,
      conflicts: conflictingBookings
    };
  }

  return {
    hasConflict: false,
    resource
  };
};

/**
 * Suggest next available 1-hour or custom slots on the same date for the resource.
 */
const suggestAlternativeSlots = async (resourceId, dateStr, durationMinutes = 60) => {
  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate.setHours(8, 0, 0, 0)).toISOString();
  const endOfDay = new Date(targetDate.setHours(20, 0, 0, 0)).toISOString();

  // Fetch all existing bookings on that date
  const bookings = await dbAll(
    `SELECT start_time, end_time FROM bookings 
     WHERE resource_id = ? 
       AND status IN ('upcoming', 'checked-in')
       AND datetime(start_time) < datetime(?)
       AND datetime(end_time) > datetime(?)
     ORDER BY start_time ASC`,
    [resourceId, endOfDay, startOfDay]
  );

  const availableSlots = [];
  let slotPointer = new Date(targetDate.setHours(8, 0, 0, 0));
  const dayEnd = new Date(targetDate.setHours(20, 0, 0, 0));

  while (new Date(slotPointer.getTime() + durationMinutes * 60000) <= dayEnd) {
    const slotStart = new Date(slotPointer);
    const slotEnd = new Date(slotPointer.getTime() + durationMinutes * 60000);

    const isBlocked = bookings.some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return slotStart < bEnd && slotEnd > bStart;
    });

    if (!isBlocked) {
      availableSlots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        label: `${slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });
    }

    // Step by 30 mins
    slotPointer = new Date(slotPointer.getTime() + 30 * 60000);
  }

  return availableSlots.slice(0, 6); // Return top available recommendations
};

module.exports = {
  checkConflict,
  suggestAlternativeSlots
};
