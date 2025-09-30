const express = require('express');
const LifeUpdate  = require('../models/lifeUpdates');
const router = express.Router();
const crypto = require('crypto');

router.get('/life-updates' , async(req , res) => {
  try {
      const updates = await LifeUpdate.find().sort({ updateNumber: 1 });
      const formattedUpdates = updates.map(update => ({
        id: update.updateNumber,
        text: update.text,
        updatedAt: update.updatedAt
      }));
      
      // Generate ETag based on content and last update time
    const contentString = JSON.stringify(formattedUpdates);
    const etag = `"${crypto.createHash('md5').update(contentString).digest('hex')}"`;
    console.log("etag:" , etag);
    
    // Check if client has the same version
    const clientETag = req.headers['if-none-match'];
    console.log("clientETag:" , clientETag);
    
    if (clientETag === etag) {
      // Content hasn't changed
      console.log("ETags match - returning 304");
      return res.status(304).end();
    }
    
    // Set headers before sending response
    res.set({
      'ETag': etag,
      'Cache-Control': 'private, must-revalidate',
      'Access-Control-Expose-Headers': 'ETag' 
    });
    res.json(formattedUpdates);
    } catch (error) {
      console.error('Error fetching life updates:', error);
      res.status(500).json({ error: 'Failed to fetch life updates' });
    }
});

router.get('/health' , (req , res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.PRODUCTION === 'true' ? 'production' : 'development'
  });
});

module.exports = router;