// routes/locations.js
const express = require("express");
const axios = require("axios");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/locations/autocomplete
 *
 * Provides location suggestions based on a query string 'q'.
 * This now uses an in-memory cache to speed up common requests.
 */
router.get("/autocomplete", authenticateToken, async (req, res) => {
  const { q } = req.query;
  const redisClient = req.app.get("redisClient");

  if (!q || q.length < 3) {
    return res.json({ suggestions: [] });
  }

  const normalizedQuery = q.toLowerCase().trim();
  const cacheKey = `location:autocomplete:${normalizedQuery}`;

  try {
    // 1. Check if the result is in Redis
    if (redisClient?.isReady) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`CACHE HIT: ${cacheKey}`);
        return res.json({
          suggestions: JSON.parse(cachedData),
          fromCache: true,
        });
      }
    }

    console.log(`CACHE MISS: ${cacheKey} (Fetching from API)`);

    // 2. Cache miss, fetch from Nominatim API
    const encodedQuery = encodeURIComponent(normalizedQuery);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=5`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "HappeningApp/1.0 (vivek.garg@myemail.com)",
      },
    });

    let suggestions = [];
    if (response.data && response.data.length > 0) {
      suggestions = response.data.map((item) => ({
        id: item.osm_id,
        name: item.display_name,
      }));
    }

    // 3. Save the new result in Redis (Expire in 1 hour)
    if (redisClient?.isReady) {
      await redisClient.set(cacheKey, JSON.stringify(suggestions), {
        EX: 3600,
      });
      console.log(`CACHE SET: ${cacheKey}`);
    }

    // 4. Return the fresh result
    res.json({ suggestions: suggestions, fromCache: false });
  } catch (error) {
    console.error("Location autocomplete error:", error.message);
    res.status(500).json({ error: "Failed to fetch location suggestions" });
  }
});

module.exports = router;