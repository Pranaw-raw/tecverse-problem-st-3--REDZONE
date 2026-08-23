const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/analytics/dashboard - Comprehensive Analytics KPIs
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 1. High-Level Summary Stats
    const totalResourcesRow = await dbGet('SELECT COUNT(*) as count FROM resources');
    const activeResourcesRow = await dbGet("SELECT COUNT(*) as count FROM resources WHERE status = 'available'");
    const totalBookingsRow = await dbGet('SELECT COUNT(*) as count FROM bookings');
    const confirmedBookingsRow = await dbGet("SELECT COUNT(*) as count FROM bookings WHERE status IN ('upcoming', 'checked-in', 'completed')");
    const completedBookingsRow = await dbGet("SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'");
    const cancelledBookingsRow = await dbGet("SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'");
    const noShowBookingsRow = await dbGet("SELECT COUNT(*) as count FROM bookings WHERE status = 'no-show'");
    const checkedInBookingsRow = await dbGet("SELECT COUNT(*) as count FROM bookings WHERE status = 'checked-in'");

    const totalBookings = totalBookingsRow.count || 0;
    const cancelledBookings = cancelledBookingsRow.count || 0;
    const noShows = noShowBookingsRow.count || 0;
    const checkedIn = checkedInBookingsRow.count || 0;
    const completed = completedBookingsRow.count || 0;
    const totalResources = totalResourcesRow.count || 0;

    // No-show rate = (noShows / (completed + checkedIn + noShows)) * 100
    const resolvedFinished = completed + checkedIn + noShows;
    const noShowRate = resolvedFinished > 0 ? ((noShows / resolvedFinished) * 100).toFixed(1) : 0;

    // 2. Resource Utilization & Ranking (Most vs Least Booked)
    const resourceRanking = await dbAll(`
      SELECT 
        r.id, 
        r.name, 
        r.category, 
        r.capacity,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancellations,
        SUM(CASE WHEN b.status IN ('completed', 'checked-in', 'upcoming') THEN 1 ELSE 0 END) as successful_bookings
      FROM resources r
      LEFT JOIN bookings b ON r.id = b.resource_id
      GROUP BY r.id
      ORDER BY total_bookings DESC
    `);

    // Calculate approximate utilization % assuming 12 operational hours per day
    const resourceUtilization = resourceRanking.map((r) => {
      // rough utilization score based on booking density
      const utilScore = Math.min(100, Math.round((r.successful_bookings * 2.5 * 100) / (30 * 12)));
      return {
        ...r,
        utilizationPercentage: Math.max(8, utilScore)
      };
    });

    // 3. Category Breakdown
    const categoryStats = await dbAll(`
      SELECT 
        r.category,
        COUNT(DISTINCT r.id) as resource_count,
        COUNT(b.id) as booking_count
      FROM resources r
      LEFT JOIN bookings b ON r.id = b.resource_id
      GROUP BY r.category
      ORDER BY booking_count DESC
    `);

    // 4. Peak Usage Hours Distribution (8 AM to 9 PM)
    const allActiveBookings = await dbAll(`
      SELECT start_time, end_time 
      FROM bookings 
      WHERE status != 'cancelled'
    `);

    const hourlyDistribution = {
      '08:00': 0, '09:00': 0, '10:00': 0, '11:00': 0,
      '12:00': 0, '13:00': 0, '14:00': 0, '15:00': 0,
      '16:00': 0, '17:00': 0, '18:00': 0, '19:00': 0,
      '20:00': 0
    };

    allActiveBookings.forEach((b) => {
      const d = new Date(b.start_time);
      const hour = d.getHours();
      const formattedHour = `${hour.toString().padStart(2, '0')}:00`;
      if (hourlyDistribution[formattedHour] !== undefined) {
        hourlyDistribution[formattedHour]++;
      }
    });

    // 5. Recent System Audit Activity
    const recentActivity = await dbAll(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 15
    `);

    res.json({
      metrics: {
        totalResources,
        activeResources: activeResourcesRow.count || 0,
        totalBookings,
        confirmedBookings: confirmedBookingsRow.count || 0,
        cancelledBookings,
        noShowBookings: noShows,
        noShowRate: `${noShowRate}%`,
        averageUtilization: `${Math.round(resourceUtilization.reduce((acc, curr) => acc + curr.utilizationPercentage, 0) / (resourceUtilization.length || 1))}%`
      },
      ranking: resourceUtilization,
      categoryStats,
      hourlyDistribution,
      recentActivity
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Server error generating analytics report.' });
  }
});

// GET /api/analytics/export - Export bookings data
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookings = await dbAll(`
      SELECT 
        b.id as Booking_ID,
        b.title as Title,
        r.name as Resource,
        r.category as Category,
        r.location as Location,
        u.name as User_Name,
        u.email as User_Email,
        u.department as Department,
        b.start_time as Start_Time,
        b.end_time as End_Time,
        b.status as Status,
        b.created_at as Booked_On
      FROM bookings b
      JOIN resources r ON b.resource_id = r.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.start_time DESC
    `);

    res.json({ bookings });
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Server error exporting bookings data.' });
  }
});

module.exports = router;
