const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { pool, query } = require("./config/db");
const redis = require("redis");
const amqp = require("amqplib");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const swaggerDocument = YAML.load(path.join(__dirname, "./openapi.yaml"));

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const bookingRoutes = require("./routes/bookings");
const { router: cancellationRoutes } = require("./routes/cancellations");
const paymentRoutes = require("./routes/payments");
const hostRoutes = require("./routes/hosts");
const analyticsRoutes = require("./routes/analytics");
const locationRoutes = require("./routes/locations");
const { authenticateToken, requireAdmin } = require("./middleware/auth");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const amqpUrl = process.env.AMQP_URL || "amqp://localhost:5672";
const QUEUE_NAME = "booking_jobs";

const redisClient = redis.createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => console.error("❌ Redis Client Error", err));
redisClient.on("connect", () => console.log("✅ Connected to Redis"));

redisClient.connect();

async function setupDatabase() {
  try {
    console.log("🔄 Setting up database tables...");

    const initSQL = `
-- DROP existing tables
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS host_bank_accounts CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS event_category;

-- CREATE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CREATE ENUMS
CREATE TYPE event_category AS ENUM ('music', 'food', 'sports', 'tech', 'arts', 'health', 'workshop');

-- CREATE TABLES
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_host BOOLEAN DEFAULT false,
  host_status VARCHAR(20) DEFAULT 'not_requested',
  host_verification_data JSONB
);

CREATE TABLE host_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) DEFAULT 'savings',
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_payout_eligible BOOLEAN DEFAULT false
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  venue VARCHAR(255) NOT NULL,
  total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
  available_tickets INTEGER NOT NULL CHECK (available_tickets >= 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category event_category NOT NULL,
  image_url VARCHAR(500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_cancelled BOOLEAN DEFAULT false,
  approval_status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6)
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booking_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ticket_count INTEGER NOT NULL CHECK (ticket_count > 0),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  refund_id VARCHAR(255)
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  amount NUMERIC(10, 2) NOT NULL,
  razorpay_payout_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- CREATE INDEXES
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_search_query ON events(approval_status, is_cancelled, date_time);
CREATE INDEX idx_events_location ON events USING GIST (latitude, longitude);
CREATE INDEX idx_payouts_host_id ON payouts(host_id);
CREATE INDEX idx_payouts_event_id ON payouts(event_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payments_refund_id ON payments(refund_id);
    `;

    // Execute each SQL statement
    const statements = initSQL.split(";").filter((stmt) => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    console.log("✅ Database tables created successfully!");
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
  }
}

async function setupRabbitMQ() {
  try {
    if (!process.env.AMQP_URL) {
      console.log(
        "⚠️  RabbitMQ not configured - running without message queue"
      );
      app.set("amqpChannel", null);
      app.set("amqpQueue", null);
      return;
    }

    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();

    // This makes sure the queue exists. 'durable: true' means the queue
    // won't be lost if RabbitMQ restarts.
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log("✅ Connected to RabbitMQ");

    // Make the channel and queue name available to our routes
    app.set("amqpChannel", channel);
    app.set("amqpQueue", QUEUE_NAME);
  } catch (error) {
    console.error(
      "❌ Failed to connect to RabbitMQ, running without it",
      error
    );
    app.set("amqpChannel", null);
    app.set("amqpQueue", null);
  }
}
// Make the client available to other files (like events.js)
// We'll attach it to the 'app' object.
app.set("redisClient", redisClient);
// Middleware
app.use(
  cors({
    origin: [
      "https://happening.vercel.app", // Your Vercel frontend
      "http://localhost:5173", // Vite dev server
    ],
    credentials: true,
  })
);

app.use(express.json());
setupDatabase();
setupRabbitMQ();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/cancellations", cancellationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/hosts", hostRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/profile", authenticateToken, (req, res) => {
  res.json({
    message: "✅ This is your protected profile data!",
    user: req.user,
  });
});

app.get("/api/admin/dashboard", authenticateToken, requireAdmin, (req, res) => {
  res.json({
    message: "✅ Welcome to admin dashboard!",
    adminData: {
      totalUsers: "You would query this from DB",
      totalEvents: "In a real implementation",
    },
    user: req.user,
  });
});

// Test route
app.get("/api/health", async (req, res) => {
  try {
    // Test if our specific tables exist
    const result = await query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'events', 'bookings', 'payments')
    `);

    const tableCount = parseInt(result.rows[0].table_count);

    res.json({
      message: "✅ Happening API is running! 🎉",
      database: "✅ Connected successfully",
      tables: `Found ${tableCount}/4 core tables`,
      status:
        tableCount === 4 ? "✅ All tables ready" : "⚠️ Some tables missing",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      message: "❌ API is running but database connection failed",
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎯 Happening server running on http://localhost:${PORT}`);
});
