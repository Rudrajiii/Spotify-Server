const { getCurrentPlayingTrack } = require("../../Utils/spotify.utility");
const { SpotifyError } = require("../../ErrorTypes/AppErrors");
require("dotenv").config();
const isProduction = process.env.PRODUCTION === "true";

async function handleGetCurrentSong(_, res, next) {
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
};

module.exports = handleGetCurrentSong;