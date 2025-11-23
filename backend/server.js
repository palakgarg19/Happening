const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { query } = require("./config/db");
const redis = require('redis');
const amqp = require('amqplib');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const swaggerDocument = YAML.load(path.join(__dirname, "./openapi.yaml"));

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const { router: cancellationRoutes } = require("./routes/cancellations");
const paymentRoutes = require('./routes/payments');
const hostRoutes = require('./routes/hosts');
const analyticsRoutes = require('./routes/analytics');
const locationRoutes = require('./routes/locations');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'booking_jobs';

const redisClient = redis.createClient({
  url: redisUrl
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));

redisClient.connect();

async function setupRabbitMQ() {
  try {
    if (!process.env.AMQP_URL) {
      console.log('⚠️  RabbitMQ not configured - running without message queue');
      app.set('amqpChannel', null);
      app.set('amqpQueue', null);
      return;
    }

    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    
    // This makes sure the queue exists. 'durable: true' means the queue
    // won't be lost if RabbitMQ restarts.
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log('✅ Connected to RabbitMQ');
    
    // Make the channel and queue name available to our routes
    app.set('amqpChannel', channel);
    app.set('amqpQueue', QUEUE_NAME);

  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ, running without it', error);
    app.set('amqpChannel', null);
    app.set('amqpQueue', null);
  }
}
// Make the client available to other files (like events.js)
// We'll attach it to the 'app' object.
app.set('redisClient', redisClient);
// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
setupRabbitMQ();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({
    message: '✅ This is your protected profile data!',
    user: req.user
  });
});

app.get('/api/admin/dashboard', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    message: '✅ Welcome to admin dashboard!',
    adminData: {
      totalUsers: 'You would query this from DB',
      totalEvents: 'In a real implementation'
    },
    user: req.user
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
