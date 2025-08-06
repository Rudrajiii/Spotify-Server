const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const spotifyRoutes = require('./routes/spotify');
const adminRoutes = require('./routes/admin');
const { initializeDefaultUpdates } = require('./database/defaultUpdates');
require('dotenv').config();

const app = express();

// Middleware
// Enhanced CORS configuration to expose ETag header
const corsOptions = {
  origin: ['http://localhost:5173', 'https://rudyy.vercel.app'], // Add your frontend URLs
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match'],
  exposedHeaders: ['ETag', 'Cache-Control'], // Important: Expose ETag header
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json()); 

// Call initialization after connection
mongoose.connection.once('open', initializeDefaultUpdates);
// Spotify routes
app.use('/api', spotifyRoutes);
// Admin routes
app.use('/admin', adminRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`==> Server running on http://localhost:${port}`));
