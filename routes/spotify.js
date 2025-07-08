const express = require('express');
const axios = require('axios');
const router = express.Router();
const { Server } = require('socket.io');
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN; 

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

// Store last known track info to avoid unnecessary broadcasts
let lastTrackInfo = null;
let spotifyInterval = null;

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

// Function to setup Spotify WebSocket functionality
function setupSpotifyWebSocket(io) {
  const spotifyNamespace = io.of('/spotify');
  
  spotifyNamespace.on('connection', (socket) => {
    console.log('Client connected to Spotify WebSocket');
    
    // Send current track info immediately upon connection
    getCurrentPlayingTrack().then(trackData => {
      socket.emit('spotifyUpdate', trackData);
    });
    
    // Start monitoring if this is the first client
    if (spotifyNamespace.sockets.size === 1) {
      startSpotifyMonitoring(spotifyNamespace);
    }
    
    socket.on('disconnect', () => {
      console.log('Client disconnected from Spotify WebSocket');
      
      // Stop monitoring if no clients are connected
      if (spotifyNamespace.sockets.size === 0) {
        stopSpotifyMonitoring();
      }
    });
    
    socket.on('requestUpdate', async () => {
      const trackData = await getCurrentPlayingTrack();
      socket.emit('spotifyUpdate', trackData);
    });
  });
}

// Function to start Spotify monitoring
function startSpotifyMonitoring(namespace) {
  if (spotifyInterval) return; // Already running
  
  console.log('Starting Spotify monitoring...');
  
  spotifyInterval = setInterval(async () => {
    const currentTrack = await getCurrentPlayingTrack();
    
    // Only broadcast if track info has changed
    const currentTrackString = JSON.stringify(currentTrack);
    if (currentTrackString !== lastTrackInfo) {
      lastTrackInfo = currentTrackString;
      namespace.emit('spotifyUpdate', currentTrack);
      console.log('Spotify update broadcasted:', currentTrack.isPlaying ? currentTrack.title : 'Not playing');
    }
  }, 30000); // Check every 30 seconds
}

// Function to stop Spotify monitoring
function stopSpotifyMonitoring() {
  if (spotifyInterval) {
    clearInterval(spotifyInterval);
    spotifyInterval = null;
    console.log('Spotify monitoring stopped');
  }
}

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

// Export both router and setup function
module.exports = {
  router,
  setupSpotifyWebSocket
};
