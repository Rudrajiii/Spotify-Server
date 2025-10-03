const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();
const { SpotifyError } = require("../ErrorTypes/AppErrors");

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
const isProduction = process.env.PRODUCTION === "true";

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

// Store connected clients for SSE
const clients = new Map();
//for testing purpose add 300 clients limit in production

async function getAccessToken() {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (err) {
    console.error(
      "Access token refresh failed:",
      err.response?.data || err.message
    );
    throw new SpotifyError("Failed to refresh Spotify access token");
  }
}

// Function to fetch current playing track
async function getCurrentPlayingTrack() {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 204 || !response.data) {
      return { isPlaying: false };
    }

    const { item, is_playing } = response.data;

    return {
      isPlaying: is_playing,
      title: item.name,
      artist: item.artists.map((a) => a.name).join(", "),
      albumImageUrl: item.album.images[0].url,
      songUrl: item.external_urls.spotify,
    };
  } catch (error) {
    console.error("Spotify error:", error.message);
    throw new SpotifyError("Failed to fetch currently playing track");
  }
}

// Function to broadcast to all connected clients
function broadcastToClients(data) {
  const disconnectedClients = [];

  clients.forEach((clientInfo, client) => {
    try {
      // Check if response is still writable
      if (!client.writableEnded && !client.destroyed) {
        client.write(`data: ${JSON.stringify(data)}\n\n`); // ✅ This is correct for SSE
        clientInfo.lastActivity = Date.now();
      } else {
        disconnectedClients.push(client);
      }
    } catch (error) {
      console.error("Broadcast error to client:", error.message);
      disconnectedClients.push(client);

      // Create custom error for broadcast failures
      const broadcastError = new SpotifyError(
        "Failed to broadcast to SSE client",
        {
          reason: "Write operation failed",
          clientIP: clientInfo.ip,
          connectionDuration: Date.now() - clientInfo.connectedAt,
          activeClients: clients.size - 1,
          error: error.code || error.message,
        }
      );
      console.error("Broadcast Error Details:", {
        message: isProduction ? "Broadcast failed" : broadcastError.message,
        code: broadcastError.code,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Clean up disconnected clients
  disconnectedClients.forEach((client) => {
    clients.delete(client);
  });

  console.log(
    `📡 Broadcasted to ${clients.size - disconnectedClients.length} clients`
  );
}

// Store last known track info to avoid unnecessary broadcasts
let lastTrackInfo = null;

// Periodic check for Spotify updates (every 30 seconds)
setInterval(async () => {
  if (clients.size > 0) {
    // Only fetch if there are connected clients
    try {
      const currentTrack = await getCurrentPlayingTrack();

      // Only broadcast if track info has changed
      const currentTrackString = JSON.stringify(currentTrack);
      if (currentTrackString !== lastTrackInfo) {
        lastTrackInfo = currentTrackString;
        broadcastToClients(currentTrack);
      }
    } catch (error) {
      console.error("Error during periodic Spotify check");
      // Broadcast error to clients
      const errorMessage = {
        error: isProduction ? "Service temporarily unavailable" : error.message,
        timestamp: new Date().toISOString(),
        retryIn: 30,
      };

      broadcastToClients(errorMessage);
    }
  }
}, 30000); // 30 seconds

// SSE endpoint for real-time updates
router.get("/now-playing-stream", async (req, res, next) => {
  const clientIP = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  const connectionId = `${clientIP}-${Date.now()}`;
  try {
    
    if (clients.size >= 300) {
      return next(
        new SpotifyError("Max SSE connections reached, try again later", {
          details: {
            reason: "MAX_SSE_CONNECTIONS",
            MAX_SAFE_SSE_CONNECTIONS: 300,
            currentConnections: clients.size,
            clientIP,
          },
          status: 503,
        })
      );
    }

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": isProduction ? "https://rudyy.tech" : "*",
      "Access-Control-Allow-Headers": "Cache-Control , Content-Type",
      "X-Accel-Buffering": "no",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.spotify.com https://accounts.spotify.com; frame-ancestors 'none';",
    });

    const clientInfo = {
      ip: clientIP,
      id: connectionId,
      userAgent,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Add client to the set
    clients.set(res, clientInfo);
    console.log(
      `Client connected: ${connectionId} | Total clients: ${clients.size}`
    );

    try {
      // Send initial data
      const initialData = await getCurrentPlayingTrack();
      res.write(`data: ${JSON.stringify(initialData)}\n\n`);
    } catch (err) {
      const errorData = {
        error: isProduction ? "Service initializing" : err.message,
        timestamp: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }

    // Send keep-alive ping every 15 seconds
    const keepAlive = setInterval(() => {
      try {
        if (res.writableEnded || res.destroyed) {
          clearInterval(keepAlive);
          clients.delete(res);
          console.log(
            `Client disconnected: ${connectionId} | Total clients: ${clients.size}`
          );
          return;
        }
        res.write(`: keep-alive\n\n`);
        clientInfo.lastActivity = Date.now();
      } catch (error) {
        clearInterval(keepAlive);
        clients.delete(res);
        console.log(
          `Client disconnected due to error: ${connectionId} | Total clients: ${clients.size}`
        );

        const keepAliveError = new SpotifyError(
          "SSE keep-alive failed",
          {
            details: {
              reason: "SSE_KEEP_ALIVE_FAILED",
              clientIP,
              connectionDuration: Date.now() - clientInfo.connectedAt,
              error: error.code || error.message,
            },
          },
          499
        );

        next(keepAliveError);
      }
    }, 15000);

    // Handle client disconnect
    req.on("close", () => {
      clients.delete(res);
      clearInterval(keepAlive);
    });

    req.on("error", (err) => {
      // console.error('SSE connection error:', err);
      clients.delete(res);
      clearInterval(keepAlive);

      next(
        new SpotifyError("SSE connection error", {
          details: {
            connectionId: connectionId,
          },
        })
      );
    });

    // Production: Auto-cleanup stale connections (every 5 minutes)
    if (isProduction) {
      const cleanupInterval = setInterval(() => {
        const now = Date.now();
        const staleClients = [];

        clients.forEach((clientInfo, client) => {
          // Remove clients inactive for more than 10 minutes
          if (now - clientInfo.lastActivity > 10 * 60 * 1000) {
            staleClients.push(client);
          }
        });

        staleClients.forEach((client) => {
          console.log("🧹 Cleaning up stale SSE connection");
          client.end();
          clients.delete(client);
        });

        // Clear interval if no clients
        if (clients.size === 0) {
          clearInterval(cleanupInterval);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    }
  } catch (error) {
    console.error("💥 Unexpected error in SSE:");
    next(error);
  }
});

// Keep the original endpoint for backward compatibility
router.get("/now-playing", async (req, res, next) => {
  try {
    const trackData = await getCurrentPlayingTrack();
    res.json(trackData);
  } catch (error) {
    console.error("Spotify error:", error.message);
    next(
      new SpotifyError(error.message, {
        details: isProduction ? null : "endpoint - /now-playing",
      })
    );
  }
});

router.get("/get-token", async (req, res, next) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing authorization code");

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    res.json({
      access_token,
      refresh_token,
      expires_in,
    });
  } catch (err) {
    console.error("Token exchange failed:", err.response?.data || err.message);
    next(
      new SpotifyError("Failed to exchange token", {
        details: isProduction
          ? null
          : {
              endpoint: "/get-token",
            },
      })
    );
  }
});

module.exports = router;
