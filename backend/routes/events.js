const express = require("express");
const { pool } = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { processRefund } = require("./cancellations");
const axios = require("axios");

const router = express.Router();

const geocodeVenue = async (venueAddress) => {
  if (!venueAddress) return null;

  try {
    // URL-encode the address
    const encodedAddress = encodeURIComponent(venueAddress);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "HappeningApp/1.0 (palakgarg2004@gmail.com)",
      },
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      };
    }
    return null;
  } catch (error) {
    console.error(
      `Geocoding error for address "${venueAddress}":`,
      error.message
    );
    return null;
  }
};

// Get upcoming events (Public)
router.get("/public/upcoming", async (req, res) => {
  const redisClient = req.app.get("redisClient");
  const cacheKey = "events:public:upcoming";

  try {
    // 1. TRY CACHE
    if (redisClient) {
      const cachedResults = await redisClient.get(cacheKey);
      if (cachedResults) {
        console.log("CACHE HIT: /public/upcoming");
        return res.json({
          message: "Upcoming events fetched successfully (from cache)",
          events: JSON.parse(cachedResults),
        });
      }
    }

    // 2. CACHE MISS
    const result = await pool.query(`
      SELECT 
        e.*,
        u.name as organizer_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.is_cancelled = false 
      AND e.approval_status = 'approved'
      AND e.date_time > NOW()
      ORDER BY e.date_time ASC
    `);
    const events = result.rows;

    // 3. SET CACHE (Expire in 5 minutes = 300 seconds)
    if (redisClient) {
      await redisClient.set(cacheKey, JSON.stringify(events), { EX: 300 });
    }
    console.log("DATABASE: /public/upcoming");
    res.json({
      message: "Upcoming events fetched successfully (from database)",
      events: events,
    });
  } catch (error) {
    console.error("Get upcoming events error:", error);
    res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
});

router.get("/public/search", async (req, res) => {
  const redisClient = req.app.get("redisClient");

  const cacheKey = `search:${req.originalUrl.split("?")[1] || "all"}`;

  try {
    // 1. === TRY THE CACHE FIRST ===
    if (redisClient) {
      const cachedResults = await redisClient.get(cacheKey);
      if (cachedResults) {
        // Cache HIT! Parse the JSON and return it instantly.
        return res.json({
          message: "Events fetched successfully (from cache)",
          events: JSON.parse(cachedResults),
        });
      }
    }

    // 2. === CACHE MISS: Run the original database logic ===
    const { query, category, min_price, max_price, location, radius, date } =
      req.query;

    let queryParams = [];
    let selectClauses = ["e.*", "u.name as organizer_name"];
    let whereClauses = [
      "e.is_cancelled = false",
      "e.approval_status = 'approved'",
      "e.date_time > NOW()",
    ];
    let orderBy = "e.date_time ASC";

    if (query) {
      queryParams.push(`%${query}%`);
      whereClauses.push(
        `(e.title ILIKE $${queryParams.length} OR e.description ILIKE $${queryParams.length})`
      );
    }
    if (category && category !== "all") {
      queryParams.push(category);
      whereClauses.push(`e.category = $${queryParams.length}`);
    }
    if (min_price) {
      queryParams.push(parseFloat(min_price));
      whereClauses.push(`e.price >= $${queryParams.length}`);
    }
    if (max_price) {
      queryParams.push(parseFloat(max_price));
      whereClauses.push(`e.price <= $${queryParams.length}`);
    }

    if (date) {
      switch (date) {
        case "today":
          whereClauses.push(`e.date_time::date = CURRENT_DATE`);
          break;
        case "tomorrow":
          whereClauses.push(
            `e.date_time::date = CURRENT_DATE + interval '1 day'`
          );
          break;
        case "weekend":
          whereClauses.push(
            `e.date_time::date BETWEEN date_trunc('week', CURRENT_DATE) + interval '5 days' AND date_trunc('week', CURRENT_DATE) + interval '6 days'`
          );
          break;
        case "week":
          whereClauses.push(
            `e.date_time::date <= CURRENT_DATE + interval '7 days'`
          );
          break;
      }
    }

    if (location && radius) {
      const searchCoords = await geocodeVenue(location);
      if (searchCoords) {
        queryParams.push(searchCoords.latitude, searchCoords.longitude);
        const latIndex = queryParams.length - 1;
        const lonIndex = queryParams.length;
        const haversineFormula = `( 3959 * acos( cos( radians($${latIndex}) ) * cos( radians( e.latitude ) ) * cos( radians( e.longitude ) - radians($${lonIndex}) ) + sin( radians($${latIndex}) ) * sin( radians( e.latitude ) ) ) )`;
        selectClauses.push(`${haversineFormula} AS distance`);
        queryParams.push(parseFloat(radius));
        whereClauses.push(`${haversineFormula} <= $${queryParams.length}`);
        orderBy = "distance ASC";
      }
    }

    const sqlQuery = `
      SELECT ${selectClauses.join(", ")}
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY ${orderBy}
    `;

    const result = await pool.query(sqlQuery, queryParams);
    const events = result.rows;

    // 3. === SAVE TO CACHE before returning ===
    if (redisClient) {
      // Set the result in Redis. 'EX: 600' means "expire in 600 seconds" (10 mins)
      await redisClient.set(cacheKey, JSON.stringify(events), { EX: 600 });
    }

    // 4. === RETURN the fresh data ===
    res.json({
      message: "Events fetched successfully (from database)",
      events: events,
    });
  } catch (error) {
    console.error("Search events error:", error);
    res.status(500).json({ error: "Failed to search events" });
  }
});

// Get all available categories from ENUM
router.get("/public/categories", async (req, res) => {
  const redisClient = req.app.get("redisClient");
  const cacheKey = "events:public:categories";

  try {
    // 1. TRY CACHE
    if (redisClient) {
      const cachedResults = await redisClient.get(cacheKey);
      if (cachedResults) {
        console.log("CACHE HIT: /public/categories");
        return res.json({
          message: "Categories fetched successfully (from cache)",
          categories: JSON.parse(cachedResults),
        });
      }
    }

    // 2. CACHE MISS
    const result = await pool.query(`
      SELECT unnest(enum_range(NULL::event_category)) as category
      ORDER BY category
    `);
    const categories = result.rows.map((row) => row.category);

    // 3. SET CACHE (Expire in 24 hours = 86400 seconds)
    if (redisClient) {
      await redisClient.set(cacheKey, JSON.stringify(categories), {
        EX: 86400,
      });
    }

    res.json({
      message: "Categories fetched successfully (from database)",
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.json({
      message: "Categories fetched successfully (fallback)",
      categories: [
        "music",
        "food",
        "sports",
        "tech",
        "arts",
        "health",
        "workshop",
      ],
    });
  }
});

// Get events by category (Public)
router.get("/public/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const result = await pool.query(
      `
      SELECT 
        e.*,
        u.name as organizer_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.is_cancelled = false 
      AND e.approval_status = 'approved'
      AND e.date_time > NOW()
      AND e.category = $1
      ORDER BY e.date_time ASC
    `,
      [category]
    );
    res.json({
      message: `Events in category ${category} fetched successfully`,
      events: result.rows,
    });
  } catch (error) {
    console.error("Get events by category error:", error);
    res.status(500).json({ error: "Failed to fetch events by category" });
  }
});

// GET My Created Events (for Hosts/Admins)
router.get("/my-events", authenticateToken, async (req, res) => {
  try {
    const host_id = req.user.id;
    const result = await pool.query(
      `SELECT 
        e.*, 
        (COALESCE(e.total_tickets, 0) - COALESCE(e.available_tickets, 0)) AS tickets_sold
       FROM events e
       WHERE e.created_by = $1
       ORDER BY e.date_time DESC`,
      [host_id]
    );
    res.json({
      events: result.rows,
    });
  } catch (error) {
    console.error("Get my-events error:", error);
    res.status(500).json({ error: "Failed to fetch your events" });
  }
});

// Get pending events (for Admin)
router.get(
  "/admin/pending",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT e.*, u.name as organizer_name, u.email as organizer_email
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.approval_status = 'pending'
       ORDER BY e.created_at DESC`
      );
      res.json({
        events: result.rows,
      });
    } catch (error) {
      console.error("Get pending events error:", error);
      res.status(500).json({ error: "Failed to get pending events" });
    }
  }
);

// GET all approved events (for admin)
router.get(
  "/admin/approved",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT e.*, u.name as organizer_name, u.email as organizer_email
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.approval_status = 'approved'
       ORDER BY e.created_at DESC`
      );
      res.json({ events: result.rows });
    } catch (error) {
      console.error("Get approved events error:", error);
      res.status(500).json({ error: "Failed to get approved events" });
    }
  }
);

// GET all rejected events (for admin)
router.get(
  "/admin/rejected",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT e.*, u.name as organizer_name, u.email as organizer_email
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.approval_status = 'rejected'
       ORDER BY e.created_at DESC`
      );
      res.json({ events: result.rows });
    } catch (error) {
      console.error("Get rejected events error:", error);
      res.status(500).json({ error: "Failed to get rejected events" });
    }
  }
);

// Review (approve/ reject) event (for Admin)
router.post(
  "/admin/:eventId/review",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { action, adminNotes } = req.body;
      const redisClient = req.app.get("redisClient");

      if (!["approve", "reject"].includes(action)) {
        return res
          .status(400)
          .json({ error: "Action must be 'approve' or 'reject'" });
      }
      const newStatus = action === "approve" ? "approved" : "rejected";

      await pool.query(
        `UPDATE events 
       SET approval_status = $1, 
           approved_by = $2, 
           approved_at = $3,
           admin_notes = $4
       WHERE id = $5`,
        [
          newStatus,
          req.user.id,
          new Date().toISOString(),
          adminNotes || null,
          eventId,
        ]
      );

      if (redisClient) {
        await redisClient.del(`event:${eventId}`); // Clear specific event
        await redisClient.del("events:public:upcoming"); // Clear upcoming list
        // Clear all search caches
        const keys = await redisClient.keys("search:*");
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }

      res.json({
        message: `Event ${action}d successfully`,
        status: newStatus,
      });
    } catch (error) {
      console.error("Review event error:", error);
      res.status(500).json({ error: "Failed to review event" });
    }
  }
);

// Get single event by ID (Public)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const redisClient = req.app.get("redisClient");
  const cacheKey = `event:${id}`;

  try {
    // 1. TRY CACHE
    if (redisClient) {
      const cachedResults = await redisClient.get(cacheKey);
      if (cachedResults) {
        console.log(`CACHE HIT: /events/${id}`);
        return res.json({
          message: "Event fetched successfully (from cache)",
          event: JSON.parse(cachedResults),
        });
      }
    }

    // 2. CACHE MISS
    const result = await pool.query(
      `
      SELECT 
        e.*,
        u.name as organizer_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1 AND e.is_cancelled = false
      AND e.approval_status = 'approved'
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found or not approved" });
    }
    const event = result.rows[0];

    // 3. SET CACHE (Expire in 10 minutes = 600 seconds)
    if (redisClient) {
      await redisClient.set(cacheKey, JSON.stringify(event), { EX: 600 });
    }

    res.json({
      message: "Event fetched successfully (from database)",
      event: event,
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Get all events (Public - no auth required)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        u.name as organizer_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.is_cancelled = false
      AND e.approval_status = 'approved'
      ORDER BY e.date_time ASC
    `);
    res.json({
      message: "Events fetched successfully",
      events: result.rows,
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      date_time,
      venue,
      total_tickets,
      price,
      category,
      image_url,
    } = req.body;

    if (
      !title ||
      !date_time ||
      !venue ||
      !total_tickets ||
      !price ||
      !category
    ) {
      return res.status(400).json({
        error:
          "Required fields: title, date_time, venue, total_tickets, price, category",
      });
    }

    const userCheck = await pool.query(
      "SELECT role, host_status FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = userCheck.rows[0];

    if (user.role !== "admin" && user.host_status !== "approved") {
      return res.status(403).json({
        error: "You need to be an approved host to create events.",
      });
    }

    const coords = await geocodeVenue(venue);
    const latitude = coords ? coords.latitude : null;
    const longitude = coords ? coords.longitude : null;

    const approvalStatus = user.role === "admin" ? "approved" : "pending";
    const approvedBy = user.role === "admin" ? req.user.id : null;
    const approvedAt = user.role === "admin" ? new Date().toISOString() : null;

    const result = await pool.query(
      `INSERT INTO events (
          title, description, date_time, venue, total_tickets, 
          available_tickets, price, category, image_url, created_by,
          approval_status, approved_by, approved_at,
          latitude, longitude 
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
        RETURNING *`,
      [
        title,
        description,
        date_time,
        venue,
        parseInt(total_tickets),
        parseInt(total_tickets),
        parseFloat(price),
        category,
        image_url,
        req.user.id,
        approvalStatus,
        approvedBy,
        approvedAt,
        latitude, // NEW
        longitude, // NEW
      ]
    );

    const message =
      user.role === "admin"
        ? "Event created and published successfully!"
        : "Event submitted for approval! We'll review it within 24 hours.";

    res.status(201).json({
      message: message,
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const redisClient = req.app.get("redisClient");
    const {
      title,
      description,
      date_time,
      venue,
      total_tickets,
      price,
      category,
      image_url,
    } = req.body;

    const existingEvent = await pool.query(
      "SELECT created_by, venue FROM events WHERE id = $1",
      [id]
    );

    if (existingEvent.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (
      existingEvent.rows[0].created_by !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    let latitude = null;
    let longitude = null;
    if (venue && venue !== existingEvent.rows[0].venue) {
      const coords = await geocodeVenue(venue);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    const result = await pool.query(
      `UPDATE events SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          date_time = COALESCE($3, date_time),
          venue = COALESCE($4, venue),
          total_tickets = COALESCE($5, total_tickets),
          price = COALESCE($6, price),
          category = COALESCE($7, category),
          image_url = COALESCE($8, image_url),
          latitude = COALESCE($9, latitude),
          longitude = COALESCE($10, longitude)
        WHERE id = $11
        RETURNING *`,
      [
        title,
        description,
        date_time,
        venue,
        total_tickets ? parseInt(total_tickets) : null,
        price ? parseFloat(price) : null,
        category,
        image_url,
        latitude, // NEW
        longitude, // NEW
        id,
      ]
    );
    if (redisClient) {
      console.log(`CACHE CLEAR: Deleting event:${id} and lists`);
      await redisClient.del(`event:${id}`); // Clear specific event
      await redisClient.del("events:public:upcoming"); // Clear upcoming list
      // We also clear all search caches. 'search:*' deletes all keys starting with 'search:'
      const keys = await redisClient.keys("search:*");
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }

    res.json({
      message: "Event updated successfully",
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Cancel event (Admin or host)
router.post("/:id/cancel", authenticateToken, async (req, res) => {
  const { id: event_id } = req.params;
  const redisClient = req.app.get("redisClient");
  const user_id = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get the event and check permissions
    const eventResult = await client.query(
      "SELECT * FROM events WHERE id = $1 FOR UPDATE",
      [event_id]
    );
    if (eventResult.rows.length === 0) {
      throw new Error("Event not found.");
    }

    const event = eventResult.rows[0];
    if (event.created_by !== user_id && req.user.role !== "admin") {
      throw new Error("You do not have permission to cancel this event.");
    }
    if (event.is_cancelled) {
      throw new Error("This event has already been cancelled.");
    }

    // 2. Find all confirmed bookings
    const bookingsResult = await client.query(
      "SELECT id, ticket_count FROM bookings WHERE event_id = $1 AND status = 'confirmed' FOR UPDATE",
      [event_id]
    );
    const confirmedBookings = bookingsResult.rows;

    let refundedCount = 0;
    let totalTicketsToReturn = 0;

    // 3. Loop and refund each booking
    for (const booking of confirmedBookings) {
      console.log(`Refunding booking ${booking.id} for event ${event_id}...`);
      await processRefund(booking.id, client);

      // Mark booking as cancelled
      await client.query(
        "UPDATE bookings SET status = 'cancelled' WHERE id = $1",
        [booking.id]
      );

      totalTicketsToReturn += booking.ticket_count;
      refundedCount++;
    }

    // 4. Mark the event as cancelled
    await client.query("UPDATE events SET is_cancelled = true WHERE id = $1", [
      event_id,
    ]);

    // 5. Return all tickets to the pool (sets available = total)
    await client.query(
      "UPDATE events SET available_tickets = total_tickets WHERE id = $1",
      [event_id]
    );

    await client.query("COMMIT");

    if (redisClient) {
      await redisClient.del(`event:${event_id}`); // Clear specific event
      await redisClient.del("events:public:upcoming"); // Clear upcoming list
      // Clear all search caches
      const keys = await redisClient.keys("search:*");
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }

    res.json({
      success: true,
      message: `Event cancelled successfully. ${refundedCount} bookings were refunded.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Event cancellation error:", error.message);
    res.status(500).json({ error: error.message || "Failed to cancel event." });
  } finally {
    client.release();
  }
});

module.exports = router;
