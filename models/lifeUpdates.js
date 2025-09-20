const mongoose = require("mongoose");

const lifeUpdateSchema = new mongoose.Schema({
  updateNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 3
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const LifeUpdate = mongoose.model('LifeUpdate', lifeUpdateSchema);

module.exports = LifeUpdate;