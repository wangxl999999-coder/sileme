const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  checkInTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  ip: String,
  userAgent: String,
  deviceInfo: {
    model: String,
    platform: String,
    system: String
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: null
    }
  },
  status: {
    type: String,
    enum: ['success', 'auto'],
    default: 'success'
  },
  note: String
}, {
  timestamps: true
});

checkInSchema.index({ userId: 1, checkInTime: -1 });
checkInSchema.index({ checkInTime: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
