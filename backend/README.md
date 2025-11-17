## Happening API — Technical Documentation

This document provides a deep dive into the backend architecture for the Happening platform. For a high-level project overview and frontend setup, please see the main project README.

### 🏛 System Architecture

#### 1. Database ER Diagram

```mermaid
erDiagram
    users {
        UUID id PK
        string email UK
        string password_hash
        string name
        string role "user, admin"
        timestamp created_at
        boolean is_host
        string host_status "pending, approved, rejected"
        jsonb host_verification_data
    }

    host_bank_accounts {
        UUID id PK
        UUID user_id FK "1-to-1"
        string account_holder_name
        string account_number
        string ifsc_code
        string bank_name
        string account_type
        boolean is_verified
        timestamp verified_at
        timestamp created_at
        timestamp updated_at
        boolean is_payout_eligible
    }

    events {
        UUID id PK
        UUID created_by FK "Host user"
        string title
        string description
        timestamp date_time
        string venue
        int total_tickets
        int available_tickets "Denormalized for performance"
        numeric price
        string category
        string image_url
        timestamp created_at
        boolean is_cancelled
        string approval_status "pending, approved, rejected"
        text admin_notes
        UUID approved_by FK
        timestamp approved_at
        numeric latitude
        numeric longitude
    }

    bookings {
        UUID id PK
        UUID user_id FK
        UUID event_id FK
        timestamp booking_date
        int ticket_count
        numeric total_amount
        string status "pending, confirmed, cancelled"
    }

    payments {
        UUID id PK
        UUID booking_id FK "1-to-1"
        string payment_intent_id UK
        numeric amount
        string currency
        string status "pending, succeeded, refunded, ..."
        timestamp created_at
        string refund_id
    }

    payouts {
        UUID id PK
        UUID host_id FK
        numeric amount
        string razorpay_payout_id
        string status "pending, processed, failed"
        text failure_reason
        timestamp created_at
        timestamp processed_at
        UUID event_id FK
        text notes
    }

    users ||--|| host_bank_accounts : "has"
    users ||--o{ events : "hosts"
    users ||--o{ bookings : "creates"
    users ||--o{ payouts : "receives"
    
    events ||--o{ bookings : "has"
    events ||--o{ payouts : "generates"
    
    bookings ||--|| payments : "has"
```

The schema is normalized for integrity, with a deliberate denormalization (available_tickets) for booking performance.

#### 2. Solving the Core System Design Challenges

  This system was built to solve four specific design problems:
  
  **1. Concurrency & Race Conditions (The "Overselling" Problem)**
  
  - Problem: If an event has 1 ticket left, 500 users could request it simultaneously. A simple SELECT check would see "1 ticket" 500 times, leading to 500 "successful" bookings.
  
  - Solution: Pessimistic Locking using SELECT ... FOR UPDATE inside a PostgreSQL transaction.
  
  - How it Works: When our worker.js processes a booking, it runs SELECT ... FROM events WHERE id = $1 FOR UPDATE. This tells PostgreSQL to lock that specific event row. The first worker process to acquire the lock checks available_tickets (1), subtracts 1, and COMMITs the change. The 499 other processes are forced to wait. By the time the second process acquires the lock, it reads the new data (available_tickets = 0), sees no tickets, and safely fails the booking with a ROLLBACK.
  
  **2. Write Scalability (The "Flash Sale" Problem)**
  
  - Problem: 5,000 users click "Book" at the same time. The database lock (from above) creates a single-file line, but the API server itself will crash trying to hold 4,999+ open HTTP connections.
  
  - Solution: Decoupling with a Message Queue (RabbitMQ).
  
  - How it Works: The POST /api/bookings endpoint was refactored to be "fast." It does zero database work. It just validates the request, publishes the job (e.g., { event_id, user_id, ... }) to the booking_jobs queue, and instantly returns a 202 Accepted status. A separate worker.js process pulls jobs from this queue one at a time (using channel.prefetch(1)) and runs the "slow and safe" database transaction.
  
  **3. Read Scalability (The "Homepage" Problem)**
  
  - Problem: 10,000 users browsing the site and using search filters will overwhelm the database with repetitive SELECT queries.
  
  - Solution: Distributed Caching with Redis.
  
  - How it Works: All public GET routes (/public/search, /public/upcoming, /events/:id) are wrapped in caching logic. A unique cache key (e.g., search:location=Bhopal&date=weekend) is generated.
  
    - Cache Hit: The result is returned from Redis in <10ms.
    
    - Cache Miss: The API runs the SQL query, saves the result to Redis with a 5-minute expiration, and then returns it.
    
    - Invalidation: When an event is updated or cancelled, all relevant keys (event:123, events:public:upcoming, and all search:* keys) are deleted from Redis.
    
    - Result: Load testing with autocannon showed this improved read throughput from ~40 req/s (DB-bound) to ~8,000 req/s (cache-bound).
  
  **4. Query Performance (The "Slow Search" Problem)**
  
  - Problem: Geospatial searches (find events "near me") and complex filtering are slow on large tables.
  
  - Solution: Database Indexing.
  
  - How it Works: We added indexes to the events table:
  
      * A GIST index on (latitude, longitude) to power fast 2D spatial queries.
      
      * A Composite index on (approval_status, is_cancelled, date_time) to make the default homepage query (/public/upcoming) instant.
      
      * Standard B-tree indexes on all foreign keys (created_by, event_id, user_id) to speed up JOIN operations.

### 🚀 Getting Started / Run Locally

**1. Prerequisites**

- Node.js (v16+)

- PostgreSQL (Running locally or on a server)

- Redis (Required for caching)

- RabbitMQ (Required for booking)

**Installing Services (Windows Non-Docker):**

- Redis: Download the portable .zip from the Microsoft-archived releases and run redis-server.exe.

- RabbitMQ:

  - Install Erlang (v26) from the official v26.2.5 release.
  
  - Install RabbitMQ (v3.13.3) from the official v3.13.3 release.
  
  - Run rabbitmq-plugins enable rabbitmq_management from the RabbitMQ Command Prompt.

**2. Install Dependencies**

##### From the /happening/backend directory

```bash
npm install
```

**3. Environment Variables**

Create a .env file in the backend/ directory and add the following:

```
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME

# Security
JWT_SECRET=YOUR_SUPER_SECRET_RANDOM_STRING

# Services
REDIS_URL=redis://localhost:6379
AMQP_URL=amqp://guest:guest@localhost:5672

# Payment Gateway
RAZORPAY_KEY_ID=YOUR_RAZORPAY_TEST_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_TEST_KEY_SECRET
```

**4. Setup Database**

Run the init.sql script (included in this folder) against your PostgreSQL database. This will create all necessary tables, enums, and indexes.

**5. Run the Application**

You must start two separate processes in two separate terminals.

**Terminal 1 (Start the API Server):**

  ##### From /happening/backend
  
  ```bash
  npm run dev
  ```
  
  (Server runs on http://localhost:5000)

**Terminal 2 (Start the Booking Worker):**

##### From /happening/backend

  ```bash
  node worker.js
  ```
  (Worker connects to RabbitMQ and waits for jobs)

### 📂 Project Structure

```
/backend
├── config/
│   └── db.js               # PostgreSQL connection pool
├── middleware/
│   └── auth.js             # JWT auth (authenticateToken, requireAdmin)
├── routes/
│   ├── analytics.js        
│   ├── auth.js             
│   ├── bookings.js         
│   ├── cancellations.js    
│   ├── events.js           
│   ├── hosts.js            
│   ├── locations.js        
│   └── payments.js         
├── init.sql                # Database schema and initial data
├── openapi.yaml            # Full API specification
├── package.json
├── server.js               # Main API entry point (Express, Redis, RabbitMQ setup)
└── worker.js               # Booking job consumer (DB transactions)
```

### 📖 API Reference

For a complete, interactive list of all endpoints, you can view the OpenAPI spec.

- The full [API Docs](./openapi.yaml) specification is included in this repository. You can use any OpenAPI viewer (like the Swagger Editor) to view it.
