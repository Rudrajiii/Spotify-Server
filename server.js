const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const spotifyRoutes = require('./routes/spotify');
const adminRoutes = require('./routes/admin');
const { initializeDefaultUpdates } = require('./database/defaultUpdates');
require('dotenv').config();

const app = express();

/**
 * @all {middlewares}
 * @cors setup
 */
const corsOptions = {
  origin: [
          'http://localhost:5173',
          'https://rudyy.vercel.app',
          'https://rudyy.tech',    
          'https://www.rudyy.tech' 
        ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match'],
  exposedHeaders: ['ETag', 'Cache-Control'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json()); 

/**
 * @defaultUpdates {initializeDefaultUpdates}
 * @description Initializes default life updates if none exist
 */
mongoose.connection.once('open', initializeDefaultUpdates);


/**
 * @routes {all routers}
 * @spotify {spotifyRoutes}
 * @description Routes for Spotify-related functionality
 * @admin {adminRoutes}
 * @description Routes for Admin-related functionality
 */

app.use('/api', spotifyRoutes);
app.use('/admin', adminRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`==> Server running on http://localhost:${port}`));
