const express = require("express");
const router = express.Router();

const handleSSEConnection = require("../controller/SpotifyController/spotify.SSEConnection.controller");
const handleGetCurrentSong  = require("../controller/SpotifyController/spotify.currentSong.controller");
const handleGetToken = require("../controller/SpotifyController/spotify.Token.controller");

// SSE endpoint for real-time updates
router.get("/now-playing-stream", handleSSEConnection);

router.get("/now-playing", handleGetCurrentSong);

router.get("/get-token", handleGetToken);

module.exports = router;
