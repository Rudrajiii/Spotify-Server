const express = require('express');
const { initializeDefaultUpdates } = require('../database/defaultUpdates');
const LifeUpdate  = require('../models/lifeUpdates');
const Admin = require('../models/adminModel');
const router = express.Router();
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { createAdminToken , getAdmin } = require("../services/authService")
const { checkForAuthentication } = require("../middlewares/auth-middleware");
//endpoints to update life updates (admin only)

router.post("/" , async (req , res) => {
    const adminData = req.body;
    if (!adminData) return res.status(404).json({msg : "provide your username and admin id"});

    const {username ,adminId, role} = adminData;

    if (!username || !adminId || !role) return res.status(404).json({msg : "missing credes.."});
    if (role !== "ADMIN") return res.status(401).json({msg:"Only Admins Can Log in"});

    const admin = await Admin.findOne({adminId , username});

    if(!admin) return res.status(404).json({msg:"Invalid Creds..."})
    
    const adminPayload = {username , role};

    const token = createAdminToken(adminPayload);
    return res.status(201).json({
      token:token,
      type:"Bearer"
    }
    );
});  

router.get('/life-updates' , checkForAuthentication, async(req , res) => {
  try {
      const updates = await LifeUpdate.find().sort({ updateNumber: 1 });
      const formattedUpdates = updates.map(update => ({
        id: update.updateNumber,
        text: update.text,
        updatedAt: update.updatedAt
      }));

      res.json(formattedUpdates);
    } catch (error) {
      console.error('Error fetching life updates:', error);
      res.status(500).json({ error: 'Failed to fetch life updates' });
    }
});

router.put('/life-updates' ,checkForAuthentication , async (req , res) => {
  try {
    const { updates } = req.body;
    // Validate that at least one update is provided and not empty
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }
    
    // Filter out empty updates and validate structure
    const validUpdates = updates.filter(update => 
      update && 
      typeof update.id === 'number' && 
      update.id >= 1 && 
      update.id <= 3 && 
      typeof update.text === 'string' && 
      update.text.trim().length > 0
    );
    
    if (validUpdates.length === 0) {
      return res.status(400).json({ error: 'At least one valid update is required' });
    }
    
    // Update only the provided updates
    const updatePromises = validUpdates.map(async (update) => {
      return await LifeUpdate.findOneAndUpdate(
        { updateNumber: update.id },
        { 
          text: update.text.trim(),
          updatedAt: new Date()
        },
        { 
          new: true, 
          upsert: true // Create if doesn't exist
        }
      );
    });
    
    const updatedDocs = await Promise.all(updatePromises);
    
    // Return all updates (including unchanged ones)
    const allUpdates = await LifeUpdate.find().sort({ updateNumber: 1 });
    const formattedUpdates = allUpdates.map(update => ({
      id: update.updateNumber,
      text: update.text,
      updatedAt: update.updatedAt
    }));
    
    // Generate new ETag for updated content
    const contentString = JSON.stringify(formattedUpdates);
    const etag = `"${crypto.createHash('md5').update(contentString).digest('hex')}"`;
    
    res.set('ETag', etag);
    res.json({
      message: `Successfully updated ${validUpdates.length} life update(s)`,
      updates: formattedUpdates
    });
    
  } catch (error) {
    console.error('Error updating life updates:', error);
    res.status(500).json({ error: 'Failed to update life updates' });
  }
});

router.delete('/life-updates' , checkForAuthentication , async(req , res) => {
  try {
    // Delete all existing updates
    await LifeUpdate.deleteMany({});
    
    // Reinitialize default updates
    await initializeDefaultUpdates();
    
    // Return the default updates
    const updates = await LifeUpdate.find().sort({ updateNumber: 1 });
    const formattedUpdates = updates.map(update => ({
      id: update.updateNumber,
      text: update.text,
      updatedAt: update.updatedAt
    }));
    
    res.json({
      message: 'Life updates reset to defaults',
      updates: formattedUpdates
    });
    
  } catch (error) {
    console.error('Error resetting life updates:', error);
    res.status(500).json({ error: 'Failed to reset life updates' });
  }
});

module.exports = router;