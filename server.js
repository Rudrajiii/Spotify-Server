const express = require('express');
const cors = require('cors');
const spotifyRoutes = require('./routes/spotify');
require('dotenv').config();

const app = express();
app.use(cors());
app.use('/api', spotifyRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`==> Server running on http://localhost:${PORT}`));
