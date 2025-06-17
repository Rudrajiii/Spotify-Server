const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN; 

// console.log('Client ID:', clientId);
// console.log('Client Secret:', clientSecret);
// console.log('Refresh Token:', refreshToken);

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

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

router.get('/now-playing', async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || !response.data) {
      return res.json({ isPlaying: false });
    }

    const { item, is_playing } = response.data;

    res.json({
      isPlaying: is_playing,
      title: item.name,
      artist: item.artists.map(a => a.name).join(', '),
      albumImageUrl: item.album.images[0].url,
      songUrl: item.external_urls.spotify,
    });
  } catch (error) {
    console.error('Spotify error:', error.message);
    res.status(500).json({ error: 'Failed to fetch currently playing track' });
  }
});

module.exports = router;
