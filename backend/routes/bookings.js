const express = require("express");
const { pool } = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// POST a new booking (create)
router.post("/", authenticateToken, async (req, res) => {
  const { event_id, ticket_count } = req.body;
  const user_id = req.user.id;

  // Get the RabbitMQ channel from our app object
  const channel = req.app.get("amqpChannel");
  const queue = req.app.get("amqpQueue");

  if (!event_id || !ticket_count || ticket_count <= 0) {
    return res.status(400).json({ error: "Invalid event ID or ticket count" });
  }

  try {
    // Check if worker is explicitly disabled
    const disableWorker = process.env.DISABLE_WORKER === "true";

    // Use RabbitMQ ONLY if it's available AND not explicitly disabled
    if (channel && queue && !disableWorker) {
      const job = {
        event_id,
        user_id,
        ticket_count: parseInt(ticket_count),
      };
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(job)), {
        persistent: true,
      });
      return res.status(202).json({
        success: true,
        message: "Booking request received! We are processing your tickets.",
      });
    } else {
      // 🆕 FALLBACK: Process booking immediately without RabbitMQ
      console.log('⚠️  Processing booking immediately (no RabbitMQ)');

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // 1. Lock the event row and check tickets
        const eventResult = await client.query(
          "SELECT price, available_tickets FROM events WHERE id = $1 FOR UPDATE",
          [event_id]
        );

        if (eventResult.rows.length === 0) {
          throw new Error(`Event not found: ${event_id}`);
        }

        const event = eventResult.rows[0];
        if (event.available_tickets < ticket_count) {
          throw new Error(`Not enough tickets available for event: ${event_id}`);
        }

        // 2. Update available tickets
        const newAvailableTickets = event.available_tickets - ticket_count;
        const totalAmount = event.price * ticket_count;

        await client.query(
          "UPDATE events SET available_tickets = $1 WHERE id = $2",
          [newAvailableTickets, event_id]
        );

        // 3. Create the booking
        const bookingResult = await client.query(
          `INSERT INTO bookings (user_id, event_id, ticket_count, total_amount, status)
           VALUES ($1, $2, $3, $4, 'pending')
           RETURNING *`,
          [user_id, event_id, ticket_count, totalAmount]
        );

        await client.query("COMMIT");

        return res.status(200).json({
          success: true,
          message: "Booking created successfully!",
          booking: bookingResult.rows[0]
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({ error: "Failed to process booking: " + error.message });
  }
});

// GET all bookings for the currently logged-in user
router.get("/my-bookings", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    // This query joins bookings, events, and payments to get all info
    const result = await pool.query(
      `SELECT 
         b.id, b.status, b.ticket_count, b.total_amount, b.event_id,
         e.title AS event_title,
         e.date_time AS event_date,
         e.image_url,
         e.category,
         e.description as event_description,
         p.status AS payment_status
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.user_id = $1
       ORDER BY e.date_time DESC`,
      [user_id]
    );
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error("Get my-bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Cancel a PENDING booking (no refund)
router.post("/:id/cancel-pending", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(
      "SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'pending' FOR UPDATE",
      [id, user_id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Pending booking not found or already processed." });
    }

    const booking = bookingResult.rows[0];

    await client.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1",
      [id]
    );

    await client.query(
      "UPDATE events SET available_tickets = available_tickets + $1 WHERE id = $2",
      [booking.ticket_count, booking.event_id]
    );

    await client.query("COMMIT");
    res.json({
      message: "Booking successfully cancelled and tickets restocked.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cancel pending booking error:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  } finally {
    client.release();
  }
});

// GET all bookings for a specific event (FOR HOSTS/ADMIN)
router.get("/event/:id", authenticateToken, async (req, res) => {
  const { id: event_id } = req.params;
  const host_id = req.user.id;

  try {
    const eventResult = await pool.query(
      "SELECT created_by FROM events WHERE id = $1",
      [event_id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (
      eventResult.rows[0].created_by !== host_id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "You do not have permission to view these bookings." });
    }

    const result = await pool.query(
      `SELECT 
         b.id, b.status, b.ticket_count, b.total_amount,
         u.name as user_name, u.email as user_email,
         p.status as payment_status, p.refund_id
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.event_id = $1 AND b.status IN ('confirmed', 'cancelled')
       ORDER BY u.name ASC`,
      [event_id]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error("Failed to fetch event bookings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
