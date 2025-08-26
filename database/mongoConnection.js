const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('> Connected to MongoDB'))
.catch((err) => console.error('> MongoDB connection error:', err));

// Life Updates Schema
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

module.exports = {
  LifeUpdate,
  mongoose
};