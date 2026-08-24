const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../config/database');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { suggestAlternativeSlots } = require('../services/conflictDetector');

// GET /api/resources - Browse catalogue with search & filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, category, location, minCapacity, status } = req.query;

    let query = `SELECT * FROM resources WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ? OR location LIKE ? OR amenities LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (category && category !== 'All') {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (location && location !== 'All') {
      query += ` AND location LIKE ?`;
      params.push(`%${location.trim()}%`);
    }

    if (minCapacity) {
      query += ` AND capacity >= ?`;
      params.push(parseInt(minCapacity, 10));
    }

    if (status && status !== 'All') {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY name ASC`;

    const resources = await dbAll(query, params);

    // Parse JSON fields (amenities, rules)
    const formattedResources = await Promise.all(
      resources.map(async (r) => {
        let amenities = [];
        let rules = [];
        try {
          amenities = r.amenities ? JSON.parse(r.amenities) : [];
        } catch {
          amenities = r.amenities ? r.amenities.split(',').map((s) => s.trim()) : [];
        }

        try {
          rules = r.rules ? JSON.parse(r.rules) : [];
        } catch {
          rules = r.rules ? r.rules.split(',').map((s) => s.trim()) : [];
        }

        // Count today's active bookings
        const today = new Date().toISOString().split('T')[0];
        const todayStart = `${today}T00:00:00.000Z`;
        const todayEnd = `${today}T23:59:59.999Z`;

        const activeToday = await dbGet(
          `SELECT COUNT(*) as count FROM bookings 
           WHERE resource_id = ? 
             AND status IN ('upcoming', 'checked-in')
             AND datetime(start_time) < datetime(?) 
             AND datetime(end_time) > datetime(?)`,
          [r.id, todayEnd, todayStart]
        );

        return {
          ...r,
          amenities,
          rules,
          bookingsTodayCount: activeToday ? activeToday.count : 0
        };
      })
    );

    res.json({ resources: formattedResources });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ error: 'Server error fetching resources catalogue.' });
  }
});

// GET /api/resources/categories - Get distinct categories & locations
router.get('/meta/filters', async (req, res) => {
  try {
    const categories = await dbAll('SELECT DISTINCT category FROM resources ORDER BY category ASC');
    const locations = await dbAll('SELECT DISTINCT location FROM resources ORDER BY location ASC');

    res.json({
      categories: categories.map((c) => c.category),
      locations: locations.map((l) => l.location)
    });
  } catch (err) {
    console.error('Error fetching filters:', err);
    res.status(500).json({ error: 'Server error fetching filter options.' });
  }
});

// GET /api/resources/:id - Get resource details + timeline
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await dbGet('SELECT * FROM resources WHERE id = ?', [id]);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    let amenities = [];
    let rules = [];
    try {
      amenities = resource.amenities ? JSON.parse(resource.amenities) : [];
    } catch {
      amenities = resource.amenities ? resource.amenities.split(',').map((s) => s.trim()) : [];
    }

    try {
      rules = resource.rules ? JSON.parse(resource.rules) : [];
    } catch {
      rules = resource.rules ? resource.rules.split(',').map((s) => s.trim()) : [];
    }

    // Get upcoming bookings for this resource
    const upcomingBookings = await dbAll(
      `SELECT b.id, b.title, b.start_time, b.end_time, b.status, b.user_id, u.name as user_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.resource_id = ? 
         AND b.status IN ('upcoming', 'checked-in')
         AND datetime(b.end_time) >= datetime('now')
       ORDER BY b.start_time ASC
       LIMIT 20`,
      [id]
    );

    res.json({
      resource: {
        ...resource,
        amenities,
        rules,
        upcomingBookings
      }
    });
  } catch (err) {
    console.error('Error fetching resource details:', err);
    res.status(500).json({ error: 'Server error fetching resource details.' });
  }
});

// GET /api/resources/:id/availability?date=YYYY-MM-DD - Get day availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const resource = await dbGet('SELECT * FROM resources WHERE id = ?', [id]);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const dayBookings = await dbAll(
      `SELECT b.id, b.title, b.start_time, b.end_time, b.status, u.name as user_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.resource_id = ? 
         AND b.status IN ('upcoming', 'checked-in')
         AND datetime(b.start_time) < datetime(?)
         AND datetime(b.end_time) > datetime(?)
       ORDER BY b.start_time ASC`,
      [id, dayEnd, dayStart]
    );

    const alternativeSlots = await suggestAlternativeSlots(id, date, 60);

    res.json({
      resourceId: id,
      resourceName: resource.name,
      status: resource.status,
      date,
      bookedSlots: dayBookings,
      recommendedAvailableSlots: alternativeSlots
    });
  } catch (err) {
    console.error('Error checking availability:', err);
    res.status(500).json({ error: 'Server error checking availability.' });
  }
});

// POST /api/resources - Add Resource (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, location, capacity, description, imageUrl, amenities, rules, status = 'available' } = req.body;

    if (!name || !category || !location) {
      return res.status(400).json({ error: 'Resource name, category, and location are required.' });
    }

    const resourceId = uuidv4();
    const amenitiesJson = Array.isArray(amenities) ? JSON.stringify(amenities) : JSON.stringify(amenities ? [amenities] : []);
    const rulesJson = Array.isArray(rules) ? JSON.stringify(rules) : JSON.stringify(rules ? [rules] : []);

    await dbRun(
      `INSERT INTO resources (id, name, category, location, capacity, description, image_url, amenities, rules, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resourceId,
        name.trim(),
        category,
        location.trim(),
        parseInt(capacity || 1, 10),
        description || '',
        imageUrl || '',
        amenitiesJson,
        rulesJson,
        status
      ]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'CREATE', 'RESOURCE', ?, ?)`,
      [uuidv4(), req.user.id, resourceId, `Created resource "${name}" in category "${category}"`]
    );

    const newResource = await dbGet('SELECT * FROM resources WHERE id = ?', [resourceId]);
    
    // Broadcast live event
    const io = req.app.get('io');
    if (io) {
      io.emit('resource_updated', { action: 'created', resource: newResource });
    }

    res.status(201).json({
      message: 'Resource created successfully.',
      resource: {
        ...newResource,
        amenities: JSON.parse(newResource.amenities || '[]'),
        rules: JSON.parse(newResource.rules || '[]')
      }
    });
  } catch (err) {
    console.error('Error creating resource:', err);
    res.status(500).json({ error: 'Server error creating resource.' });
  }
});

// PUT /api/resources/:id - Update Resource (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, location, capacity, description, imageUrl, amenities, rules, status } = req.body;

    const existing = await dbGet('SELECT * FROM resources WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    const amenitiesJson = Array.isArray(amenities) ? JSON.stringify(amenities) : existing.amenities;
    const rulesJson = Array.isArray(rules) ? JSON.stringify(rules) : existing.rules;

    await dbRun(
      `UPDATE resources 
       SET name = ?, category = ?, location = ?, capacity = ?, description = ?, image_url = ?, 
           amenities = ?, rules = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name ? name.trim() : existing.name,
        category || existing.category,
        location ? location.trim() : existing.location,
        capacity !== undefined ? parseInt(capacity, 10) : existing.capacity,
        description !== undefined ? description : existing.description,
        imageUrl !== undefined ? imageUrl : existing.image_url,
        amenitiesJson,
        rulesJson,
        status || existing.status,
        id
      ]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'UPDATE', 'RESOURCE', ?, ?)`,
      [uuidv4(), req.user.id, id, `Updated resource details for "${name || existing.name}"`]
    );

    const updated = await dbGet('SELECT * FROM resources WHERE id = ?', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('resource_updated', { action: 'updated', resource: updated });
    }

    res.json({
      message: 'Resource updated successfully.',
      resource: {
        ...updated,
        amenities: JSON.parse(updated.amenities || '[]'),
        rules: JSON.parse(updated.rules || '[]')
      }
    });
  } catch (err) {
    console.error('Error updating resource:', err);
    res.status(500).json({ error: 'Server error updating resource.' });
  }
});

// PATCH /api/resources/:id/status - Quick Toggle Status (Admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'available', 'maintenance', 'inactive'

    if (!['available', 'maintenance', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const existing = await dbGet('SELECT * FROM resources WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    await dbRun(
      `UPDATE resources SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'STATUS_CHANGE', 'RESOURCE', ?, ?)`,
      [uuidv4(), req.user.id, id, `Changed status of "${existing.name}" to ${status}`]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('resource_status_changed', { id, status, name: existing.name });
    }

    res.json({ message: `Resource status changed to ${status}.`, id, status });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Server error updating status.' });
  }
});

// DELETE /api/resources/:id - Delete Resource (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbGet('SELECT * FROM resources WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    // Cancel all active upcoming bookings for this resource with notification
    const activeBookings = await dbAll(
      `SELECT b.id, b.user_id, u.name as user_name, u.email
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.resource_id = ? AND b.status IN ('upcoming', 'checked-in')`,
      [id]
    );

    for (const b of activeBookings) {
      await dbRun(
        `UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Resource removed by administrator', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [b.id]
      );
      await dbRun(
        `INSERT INTO notifications (id, user_id, booking_id, title, message, type)
         VALUES (?, ?, ?, 'Booking Cancelled', ?, 'cancellation')`,
        [
          uuidv4(),
          b.user_id,
          b.id,
          `Your booking for "${existing.name}" was cancelled because the resource has been decommissioned by administrators.`
        ]
      );
    }

    await dbRun('DELETE FROM resources WHERE id = ?', [id]);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'DELETE', 'RESOURCE', ?, ?)`,
      [uuidv4(), req.user.id, id, `Deleted resource "${existing.name}"`]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('resource_updated', { action: 'deleted', resourceId: id });
    }

    res.json({ message: 'Resource and associated records deleted successfully.' });
  } catch (err) {
    console.error('Error deleting resource:', err);
    res.status(500).json({ error: 'Server error deleting resource.' });
  }
});

module.exports = router;
