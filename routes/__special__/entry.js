const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "Backend is running fine",
    message: "Welcome to the Portfolio Server API",
    timestamp: new Date().toISOString(),
    description: "This is a backend server built with Express.js primarily to interact with the Spotify API , but also handles admin functionalities.",
    poweredBy: "EXPRESS-&-MONGO",
    port: process.env.PORT || 4000,
    ip: req.ip,
    hostname: req.hostname,
    origin: req.headers.origin || "Not Provided",
    userAgent: req.get('User-Agent') || "Not Provided",
    madeBy: "vickyyy (Rudra Saha)",
  });
});

module.exports = router;
