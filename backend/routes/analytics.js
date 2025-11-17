const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard analytics for admin
 * @access  Private (Admin)
 */
router.get("/dashboard", [authenticateToken, requireAdmin], async (req, res) => {
  try {
    // 1. Get Key Stats (Revenue, Bookings, Hosts, Events)
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') AS total_confirmed_bookings,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'confirmed') AS total_revenue,
        (SELECT COUNT(*) FROM events WHERE approval_status = 'approved' AND is_cancelled = false AND date_time > NOW()) AS total_active_events,
        (SELECT COUNT(*) FROM users WHERE host_status = 'approved') AS total_approved_hosts
    `;

    // 2. Get Most Popular Events (Top 5)
    const popularEventsQuery = `
      SELECT
        e.id,
        e.title,
        COUNT(b.id) AS bookings_count
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE b.status = 'confirmed'
      GROUP BY e.id, e.title
      ORDER BY bookings_count DESC
      LIMIT 5
    `;

    // 3. Get Platform-Wide Capacity Utilization
    const capacityQuery = `
      SELECT
        COALESCE(SUM(total_tickets), 0) AS platform_total_capacity,
        COALESCE(SUM(total_tickets - available_tickets), 0) AS platform_total_sold
      FROM events
      WHERE approval_status = 'approved'
        AND is_cancelled = false
        AND date_time > NOW()
    `;

    // Run all queries in parallel
    const [statsResult, popularResult, capacityResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(popularEventsQuery),
      pool.query(capacityQuery),
    ]);

    // Format the data
    const stats = statsResult.rows[0];
    const popularEvents = popularResult.rows;
    const capacity = capacityResult.rows[0];

    const utilization =
      capacity.platform_total_capacity > 0
        ? (capacity.platform_total_sold / capacity.platform_total_capacity) * 100
        : 0;

    res.json({
      stats: {
        total_revenue: parseFloat(stats.total_revenue).toFixed(2),
        total_confirmed_bookings: parseInt(stats.total_confirmed_bookings, 10),
        total_active_events: parseInt(stats.total_active_events, 10),
        total_approved_hosts: parseInt(stats.total_approved_hosts, 10),
      },
      popularEvents,
      capacity: {
        ...capacity,
        utilization_percentage: utilization.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;