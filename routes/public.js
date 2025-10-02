const express = require("express");
const LifeUpdate = require("../models/lifeUpdates");
const router = express.Router();
const crypto = require("crypto");
const storage = require("node-persist");
const initializeStorage = require("../config/storage-config");

/**
 * @use {node-persist} for caching
 * @function {initializeStorage}
 * @description Initialize persistent storage for caching
 */
initializeStorage();

router.get("/life-updates", async (req, res) => {
  try {
    /**
     * @etag {caching mechanism both in client and server side}
     * @use ETag and If-None-Match headers for efficient caching
     * @description Reduce database load and improve response times
     * @flow
     * 1. Client sends request with If-None-Match header
     * 2. Server checks cached ETag
     * 3. If match, return 304 Not Modified - 0 database call
     * 4. If no match, fetch from DB, generate new ETag, cache it, and send data to client
     * 5. Client caches response with new ETag
     * 6. Subsequent requests use If-None-Match to validate cache
     * @benefits
     * - Reduces database load
     * - Improves response times for clients
     * - Saves bandwidth by avoiding sending unchanged data
     * @note ETag is based on content hash and last update time
     */
    
    const clientETag = req.headers["if-none-match"];
    
    const cachedETag = await storage.getItem("lifeUpdates:etag");

    if (cachedETag && clientETag === cachedETag) {
      return res.status(304).end();
    }

    const updates = await LifeUpdate.find().sort({ updateNumber: 1 });
    const formattedUpdates = updates.map((update) => ({
      id: update.updateNumber,
      text: update.text,
      updatedAt: update.updatedAt,
    }));

    const contentString = JSON.stringify(formattedUpdates);
    const newEtag = `"${crypto
      .createHash("md5")
      .update(contentString)
      .digest("hex")}"`;

    await storage.setItem("lifeUpdates:etag", newEtag);
    await storage.setItem("lifeUpdates:lastUpdated", new Date().toISOString());

    res.set({
      ETag: newEtag,
      "Cache-Control": "private, must-revalidate",
      "Access-Control-Expose-Headers": "ETag",
    });
    res.json(formattedUpdates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch life updates" });
  }
});

const invalidateLifeUpdatesCache = async () => {
  await storage.removeItem("lifeUpdates:etag");
  await storage.removeItem("lifeUpdates:lastUpdated");
};

router.invalidateLifeUpdatesCache = invalidateLifeUpdatesCache;

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment:
      process.env.PRODUCTION === "true" ? "Production" : "Development",
  });
});

module.exports = router;
