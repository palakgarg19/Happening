// This connects to the DB and RabbitMQ.
require("dotenv").config();
const amqp = require("amqplib");
const { pool } = require("./config/db");

const amqpUrl = process.env.AMQP_URL || "amqp://localhost:5672";
const QUEUE_NAME = "booking_jobs";

// This is your original, safe booking logic
async function processBookingJob(job) {
  const { event_id, user_id, ticket_count } = job;
  console.log(
    `[WORKER] Received job for user ${user_id}, event ${event_id}, tickets ${ticket_count}`
  );

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

    // 2. We have enough tickets. Update the event
    const newAvailableTickets = event.available_tickets - ticket_count;
    const totalAmount = event.price * ticket_count;

    await client.query(
      "UPDATE events SET available_tickets = $1 WHERE id = $2",
      [newAvailableTickets, event_id]
    );

    // 3. Create the booking (as 'pending' for payment)
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, event_id, ticket_count, total_amount, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [user_id, event_id, ticket_count, totalAmount]
    );

    await client.query("COMMIT");

    console.log(
      `[WORKER] ✅ Successfully processed booking ${bookingResult.rows[0].id}`
    );
    return true; // Success
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `[WORKER] ❌ FAILED to process job for event ${event_id}: ${error.message}`
    );
    return false;
  } finally {
    client.release();
  }
}

// The main worker function
async function startWorker() {
  try {
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // This tells RabbitMQ to only give this worker 1 message at a time.
    // This is a "rate limit" to protect your database.
    channel.prefetch(1);

    console.log(`[WORKER] Waiting for jobs in ${QUEUE_NAME}...`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const job = JSON.parse(msg.content.toString());

        // Process the job
        const success = await processBookingJob(job);

        if (success) {
          // Tell RabbitMQ the job is done
          channel.ack(msg);
        } else {
          // Tell RabbitMQ the job failed (it won't be retried)
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error("❌ Worker failed to start", error);
  }
}

startWorker();
