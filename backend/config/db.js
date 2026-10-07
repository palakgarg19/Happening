const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
});

// Test the connection
pool.on('connect', () => {
  console.log(`✅ Connected to ${process.env.NODE_ENV || 'development'} database`);
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Export the pool for transactions
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};