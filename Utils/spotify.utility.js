const axios = require("axios");
const {SpotifyError} = require("../ErrorTypes/AppErrors");
require("dotenv").config();

let lastTrackInfo = null;

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
const isProduction = process.env.PRODUCTION === "true";
const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

// Store connected clients for SSE
const clients = new Map();

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

function broadcastToClients(data) {
  const disconnectedClients = [];

  clients.forEach((clientInfo, client) => {
    try {
      // Check if response is still writable
      if (!client.writableEnded && !client.destroyed) {
        client.write(`data: ${JSON.stringify(data)}\n\n`); 
        clientInfo.lastActivity = Date.now();
      } else {
        disconnectedClients.push(client);
      }
    } catch (error) {
      // console.error("Broadcast error to client:", error.message);
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
      console.error("Error during periodic Spotify check" , error);
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

module.exports = {
    lastTrackInfo,
    clients,
    getAccessToken,
    getCurrentPlayingTrack,
    broadcastToClients
}