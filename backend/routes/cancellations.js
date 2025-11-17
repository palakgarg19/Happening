const express = require("express");
const Razorpay = require("razorpay");
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * NEW REUSABLE FUNCTION: processRefund
 *
 * This function handles the logic for refunding a single booking.
 * It's designed to be called from within a database transaction.
 *
 * @param {string} booking_id - The ID of the booking to refund.
 * @param {object} client - The pg client from a transaction.
 * @returns {object} - An object with { success, message, refund_status }
 */
const processRefund = async (booking_id, client) => {
  console.log(`Processing refund for booking: ${booking_id}`);

  // 1. Get payment information
  const paymentResult = await client.query(
    `SELECT payment_intent_id, amount, status
     FROM payments 
     WHERE booking_id = $1 AND (status = 'succeeded' OR status = 'refunded')
     FOR UPDATE`,
    [booking_id]
  );

  const payment = paymentResult.rows.length > 0 ? paymentResult.rows[0] : null;

  if (!payment || !payment.payment_intent_id) {
    console.log(`No payment found for booking ${booking_id}. Skipping refund.`);
    return {
      success: true,
      message: "No payment found, booking cancelled.",
      refund_status: "no_payment",
    };
  }

  if (payment.status === "refunded") {
    console.log(`Booking ${booking_id} is already refunded.`);
    return {
      success: true,
      message: "Booking already refunded.",
      refund_status: "already_refunded",
    };
  }

  // 2. Process refund via Razorpay
  let refund_id = null;
  let refund_status = "pending";

  try {
    const paymentDetails = await razorpay.payments.fetch(
      payment.payment_intent_id
    );

    if (
      paymentDetails.status === "refunded" ||
      paymentDetails.amount_refunded > 0
    ) {
      refund_status = "already_refunded";
      await client.query(
        "UPDATE payments SET status = $1 WHERE payment_intent_id = $2",
        ["refunded", payment.payment_intent_id]
      );
    } else if (paymentDetails.captured) {
      const refund = await razorpay.payments.refund(payment.payment_intent_id, {
        amount: Math.round(payment.amount * 100),
        speed: "normal",
        notes: { booking_id: booking_id, reason: "event_cancellation" },
      });
      refund_id = refund.id;
      refund_status = refund.status || "processed";

      await client.query(
        "UPDATE payments SET status = $1, refund_id = $2 WHERE payment_intent_id = $3",
        ["refunded", refund_id, payment.payment_intent_id]
      );
    } else {
      refund_status = "not_captured";
    }
  } catch (refundError) {
    console.error(
      "❌ Refund processing error:",
      refundError.error?.description || refundError.message
    );
    refund_status = "failed";
    // We throw an error to force the entire transaction to ROLLBACK
    throw new Error(
      `Refund failed for payment ${payment.payment_intent_id}: ${refundError.error?.description}`
    );
  }

  return { success: true, message: "Refund processed.", refund_status, refund_id };
};

// Cancel a booking (This is the route for a USER cancelling their OWN booking)
router.post("/:booking_id/cancel", authenticateToken, async (req, res) => {
  const { booking_id } = req.params;
  const user_id = req.user.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT b.*, e.date_time as event_date
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'confirmed'
       FOR UPDATE`,
      [booking_id, user_id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Booking not found or already cancelled." });
    }

    const booking = bookingResult.rows[0];

    // Check cancellation policy (24-hour rule)
    const eventDate = new Date(booking.event_date);
    const now = new Date();
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Cannot cancel within 24 hours of the event." });
    }

    // Process the refund
    const refundResult = await processRefund(booking_id, client);

    // Update booking status
    await client.query("UPDATE bookings SET status = $1 WHERE id = $2", [
      "cancelled",
      booking_id,
    ]);

    // Return tickets to event
    await client.query(
      "UPDATE events SET available_tickets = available_tickets + $1 WHERE id = $2",
      [booking.ticket_count, booking.event_id]
    );

    await client.query("COMMIT");

    res.json({
      message: `Booking cancelled successfully. ${refundResult.message}`,
      refund_id: refundResult.refund_id,
      refund_status: refundResult.refund_status,
    });
  } catch (transactionError) {
    await client.query("ROLLBACK");
    console.error("❌ Cancellation transaction error:", transactionError);
    res.status(500).json({
      error: "Failed to process cancellation",
      details: transactionError.message,
    });
  } finally {
    client.release();
  }
});

// GET the status of a specific refund
router.get("/refund-status/:refund_id", authenticateToken, async (req, res) => {
  const { refund_id } = req.params;
  const user_id = req.user.id;

  try {
    // First, check if this user is allowed to see this refund
    const paymentResult = await pool.query(
      `SELECT p.status, p.refund_id FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.refund_id = $1 AND b.user_id = $2`,
      [refund_id, user_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Refund not found or access denied." });
    }

    // Fetch the latest status from Razorpay
    const refundDetails = await razorpay.refunds.fetch(refund_id);
    const currentStatus = refundDetails.status; // e.g., 'pending', 'processed', 'failed'

    // If the status in our DB is different, update it
    if (paymentResult.rows[0].status !== currentStatus) {
      // Note: We map Razorpay 'processed' to our 'refunded'
      const newStatus = currentStatus === "processed" ? "refunded" : currentStatus;
      await pool.query(
        "UPDATE payments SET status = $1 WHERE refund_id = $2",
        [newStatus, refund_id]
      );
    }

    res.json({
      refund_id: refund_id,
      status: currentStatus,
    });

  } catch (error) {
    console.error("Get refund status error:", error);
    res.status(500).json({ error: "Failed to fetch refund status." });
  }
});

// GET all bookings for the user that are currently cancellable
router.get("/my-cancellable", authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  
  try {
    // Find all bookings that are confirmed AND whose event is more than 24 hours away
    const result = await pool.query(
      `SELECT b.id, b.event_id, e.title as event_title, e.date_time as event_date
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.user_id = $1
         AND b.status = 'confirmed'
         AND e.date_time > NOW() + interval '24 hours'
       ORDER BY e.date_time ASC`,
      [user_id]
    );

    res.json({
      cancellableBookings: result.rows,
    });

  } catch (error) {
    console.error("Get cancellable bookings error:", error);
    res.status(500).json({ error: "Failed to fetch cancellable bookings." });
  }
});

module.exports = { router, processRefund };