const mongoose = require('mongoose');

const sosRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  triggerTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedTime: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notifiedContacts: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    },
    name: String,
    phone: String,
    notified: Boolean,
    notifiedAt: Date,
    method: String,
    error: String
  }],
  ip: String,
  deviceInfo: {
    model: String,
    platform: String
  },
  note: String
}, {
  timestamps: true
});

sosRecordSchema.index({ userId: 1, triggerTime: -1 });
sosRecordSchema.index({ resolved: 1, triggerTime: -1 });

module.exports = mongoose.model('SOSRecord', sosRecordSchema);
