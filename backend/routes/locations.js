// routes/locations.js
const express = require("express");
const axios = require("axios");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// === NEW: In-Memory Cache ===
// We use a Map to store results: { query -> { suggestions, timestamp } }
const locationCache = new Map();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/locations/autocomplete
 *
 * Provides location suggestions based on a query string 'q'.
 * This now uses an in-memory cache to speed up common requests.
 */
router.get("/autocomplete", authenticateToken, async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 3) {
    return res.json({ suggestions: [] });
  }

  const normalizedQuery = q.toLowerCase().trim();

  // 1. Check if the result is in our cache and is not expired
  if (locationCache.has(normalizedQuery)) {
    const cachedEntry = locationCache.get(normalizedQuery);
    const isCacheValid = (Date.now() - cachedEntry.timestamp) < CACHE_DURATION_MS;

    if (isCacheValid) {
      // Return the cached result instantly
      return res.json({ suggestions: cachedEntry.suggestions, fromCache: true });
    } else {
      // Cache is expired, delete it
      locationCache.delete(normalizedQuery);
    }
  }

  // 2. Not in cache or expired, so we must fetch from the API
  try {
    const encodedQuery = encodeURIComponent(normalizedQuery);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=5`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "HappeningApp/1.0 (vivek.garg@myemail.com)", // Your User-Agent
      },
    });

    let suggestions = [];
    if (response.data && response.data.length > 0) {
      suggestions = response.data.map((item) => ({
        id: item.osm_id,
        name: item.display_name,
      }));
    }
    
    // 3. Save the new result in our cache
    const newCacheEntry = {
      suggestions: suggestions,
      timestamp: Date.now()
    };
    locationCache.set(normalizedQuery, newCacheEntry);

    // 4. Return the fresh result
    res.json({ suggestions: suggestions, fromCache: false });

  } catch (error) {
    console.error("Location autocomplete error:", error.message);
    res.status(500).json({ error: "Failed to fetch location suggestions" });
  }
});

module.exports = router;