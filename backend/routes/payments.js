const express = require("express");
const Razorpay = require("razorpay");
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const axios = require("axios");
const crypto = require("crypto");

const router = express.Router();
const API_BASE = process.env.API_BASE || "http://localhost:5000/api";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post("/create-order", authenticateToken, async (req, res) => {
  try {
    const { booking_id } = req.body;
    const user_id = req.user.id;

    console.log("💳 Creating Razorpay order for booking:", booking_id);

    const bookingResult = await pool.query(
      `SELECT b.*, e.title as event_title, u.name as user_name, u.email as user_email
       FROM bookings b 
       JOIN events e ON b.event_id = e.id 
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'pending'`,
      [booking_id, user_id]
    );

    if (bookingResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Booking not found or already confirmed" });
    }

    const booking = bookingResult.rows[0];

    const options = {
      amount: Math.round(booking.total_amount * 100),
      currency: "INR",
      receipt: `happening_${Date.now()}`,
      notes: {
        booking_id: booking.id,
        user_id: user_id,
        event_title: booking.event_title,
        booking_receipt: `booking_${booking.id}`,
      },
    };

    const order = await razorpay.orders.create(options);
    console.log("✅ Razorpay order created:", order.id);

    await pool.query(
      `INSERT INTO payments (booking_id, payment_intent_id, amount, currency, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [booking_id, order.id, booking.total_amount, "INR", "pending"]
    );

    res.json({
      order_id: order.id,
      amount: booking.total_amount,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("💥 Create order error:", error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// Verify payment and confirm booking
router.post("/verify-payment", authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const user_id = req.user.id;

    console.log("🔍 Verifying payment:", {
      razorpay_order_id,
      razorpay_payment_id,
    });

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Update payment status
    await pool.query(
      "UPDATE payments SET status = $1, payment_intent_id = $2 WHERE payment_intent_id = $3",
      ["succeeded", razorpay_payment_id, razorpay_order_id]
    );

    const paymentResult = await pool.query(
      "SELECT booking_id FROM payments WHERE payment_intent_id = $1",
      [razorpay_payment_id]
    );

    if (paymentResult.rows.length > 0) {
      const booking_id = paymentResult.rows[0].booking_id;

      // Confirm booking
      await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [
        "confirmed",
        booking_id,
      ]);

      console.log("✅ Payment verified and booking confirmed");

      res.json({
        success: true,
        message: "Payment successful! Booking confirmed.",
        payment_id: razorpay_payment_id,
      });
    } else {
      throw new Error("Payment record not found");
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// Get payment status
router.get("/status/:booking_id", authenticateToken, async (req, res) => {
  try {
    const { booking_id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT p.*, b.status as booking_status 
       FROM payments p 
       JOIN bookings b ON p.booking_id = b.id 
       WHERE p.booking_id = $1 AND b.user_id = $2`,
      [booking_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({ error: "Failed to get payment status" });
  }
});

router.post("/resume-order", authenticateToken, async (req, res) => {
  try {
    const { booking_id } = req.body;
    const user_id = req.user.id;

    console.log("💳 Resuming Razorpay order for booking:", booking_id);

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT b.*, e.title as event_title
       FROM bookings b 
       JOIN events e ON b.event_id = e.id
       WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'pending'`,
      [booking_id, user_id]
    );

    if (bookingResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Pending booking not found or access denied." });
    }

    const booking = bookingResult.rows[0];

    // Create a NEW Razorpay order
    const options = {
      amount: Math.round(booking.total_amount * 100),
      currency: "INR",
      receipt: `resume_${Date.now()}`,
      notes: {
        booking_id: booking.id,
        user_id: user_id,
        event_title: booking.event_title,
      },
    };

    const order = await razorpay.orders.create(options);
    console.log("✅ New Razorpay order created for resume:", order.id);

    // Update the *existing* payment record with the *new* order ID
    // Or create one if it somehow doesn't exist
    await pool.query(
      `INSERT INTO payments (booking_id, payment_intent_id, amount, currency, status) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (booking_id) 
       DO UPDATE SET payment_intent_id = $2, status = 'pending'`,
      [booking_id, order.id, booking.total_amount, "INR", "pending"]
    );

    res.json({
      order_id: order.id,
      amount: booking.total_amount,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("💥 Resume order error:", error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

module.exports = router;
