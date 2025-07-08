const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Import routes
const { router: spotifyRouter, setupSpotifyWebSocket } = require('./routes/spotify');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', spotifyRouter);

// Setup WebSocket namespaces
setupSpotifyWebSocket(io);

// Your existing LeetCode WebSocket setup...

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
