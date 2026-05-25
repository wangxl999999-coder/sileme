const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true
  },
  type: {
    type: String,
    enum: ['inactivity_alert', 'sos_alert', 'test'],
    required: true
  },
  method: {
    type: String,
    enum: ['sms', 'call', 'wechat', 'push'],
    required: true
  },
  recipient: {
    name: String,
    phone: String,
    openid: String
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending'
  },
  sentAt: Date,
  deliveredAt: Date,
  failedReason: String,
  provider: String,
  providerResponse: mongoose.Schema.Types.Mixed,
  daysInactive: Number,
  sosRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SOSRecord'
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
