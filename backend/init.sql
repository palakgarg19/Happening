-- Creates the entire database schema, including tables,
-- extensions, enums, and performance indexes.
-- Run this file to set up a new database from scratch.
-- Example: psql -U your_user -d your_db -f init.sql

-- 1. DROP OLD OBJECTS (to make this script re-runnable)
-- ==========================================================
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS host_bank_accounts CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS event_category;


-- 2. CREATE EXTENSIONS
-- ==========================================================
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable GIST indexes (for geospatial location search)
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- 3. CREATE ENUMS
-- ==========================================================
CREATE TYPE event_category AS ENUM (
  'music',
  'food',
  'sports',
  'tech',
  'arts',
  'health',
  'workshop'
);


-- 4. CREATE TABLES
-- ==========================================================

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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Changed to UUID for consistency
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


-- 5. CREATE INDEXES
-- ==========================================================

-- For fetching a user's bookings and an event's bookings
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);

-- For fetching a host's events
CREATE INDEX idx_events_created_by ON events(created_by);

-- For high-performance public event searching (composite index)
CREATE INDEX idx_events_search_query ON events(approval_status, is_cancelled, date_time);

-- For high-performance geospatial (location) search
CREATE INDEX idx_events_location ON events USING GIST (latitude, longitude);

-- For fetching payouts
CREATE INDEX idx_payouts_host_id ON payouts(host_id);
CREATE INDEX idx_payouts_event_id ON payouts(event_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- For checking payment status
CREATE INDEX idx_payments_refund_id ON payments(refund_id);

-- End of script