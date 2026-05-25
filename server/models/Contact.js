const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    enum: ['spouse', 'child', 'parent', 'sibling', 'friend', 'other'],
    default: 'other'
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  notifyMethods: {
    sms: {
      type: Boolean,
      default: true
    },
    call: {
      type: Boolean,
      default: false
    },
    wechat: {
      type: Boolean,
      default: false
    }
  },
  enabled: {
    type: Boolean,
    default: true
  },
  notificationCount: {
    type: Number,
    default: 0
  },
  lastNotified: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

contactSchema.index({ userId: 1, priority: -1 });
contactSchema.index({ phone: 1 });

module.exports = mongoose.model('Contact', contactSchema);
