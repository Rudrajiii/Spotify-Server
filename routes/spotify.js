const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN; 

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

// Store connected clients for SSE
const clients = new Set();

async function getAccessToken() {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }), {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data.access_token;
  } catch (err) {
    console.error("Access token refresh failed:", err.response?.data || err.message);
    throw new Error("Token refresh failed");
  }
}

// Function to fetch current playing track
async function getCurrentPlayingTrack() {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || !response.data) {
      return { isPlaying: false };
    }

    const { item, is_playing } = response.data;

    return {
      isPlaying: is_playing,
      title: item.name,
      artist: item.artists.map(a => a.name).join(', '),
      albumImageUrl: item.album.images[0].url,
      songUrl: item.external_urls.spotify,
    };
  } catch (error) {
    console.error('Spotify error:', error.message);
    return { error: 'Failed to fetch currently playing track' };
  }
}

// Function to broadcast to all connected clients
function broadcastToClients(data) {
  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } else {
      clients.delete(client);
    }
  });
}

// Store last known track info to avoid unnecessary broadcasts
let lastTrackInfo = null;

// Periodic check for Spotify updates (every 30 seconds)
setInterval(async () => {
  if (clients.size > 0) { // Only fetch if there are connected clients
    const currentTrack = await getCurrentPlayingTrack();
    
    // Only broadcast if track info has changed
    const currentTrackString = JSON.stringify(currentTrack);
    if (currentTrackString !== lastTrackInfo) {
      lastTrackInfo = currentTrackString;
      broadcastToClients(currentTrack);
    }
  }
}, 30000); // 30 seconds

// SSE endpoint for real-time updates
router.get('/now-playing-stream', async (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add client to the set
  clients.add(res);

  // Send initial data
  const initialData = await getCurrentPlayingTrack();
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Send keep-alive ping every 15 seconds
  const keepAlive = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(keepAlive);
      return;
    }
    res.write(`: keep-alive\n\n`);
  }, 15000);

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(res);
    clearInterval(keepAlive);
  });

  req.on('error', (err) => {
    console.error('SSE connection error:', err);
    clients.delete(res);
    clearInterval(keepAlive);
  });
});

// Keep the original endpoint for backward compatibility
router.get('/now-playing', async (req, res) => {
  try {
    const trackData = await getCurrentPlayingTrack();
    res.json(trackData);
  } catch (error) {
    console.error('Spotify error:', error.message);
    res.status(500).json({ error: 'Failed to fetch currently playing track' });
  }
});

router.get('/get-token', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing authorization code");

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    }), {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;

    res.json({
      access_token,
      refresh_token,
      expires_in,
    });
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data || err.message);
    res.status(500).send('Failed to exchange token');
  }
});

module.exports = router;
