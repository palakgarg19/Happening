const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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