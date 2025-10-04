const axios = require("axios");
const {SpotifyError} = require("../../ErrorTypes/AppErrors");
require("dotenv").config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
const isProduction = process.env.PRODUCTION === "true";

async function handleGetToken(req, res , next){
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
}

module.exports = handleGetToken;