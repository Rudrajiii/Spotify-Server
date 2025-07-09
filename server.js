const express = require('express');
const cors = require('cors');
const spotifyRoutes = require('./routes/spotify');
require('dotenv').config();

const app = express();
app.use(cors());
app.use('/api', spotifyRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`==> Server running on http://localhost:${port}`));
