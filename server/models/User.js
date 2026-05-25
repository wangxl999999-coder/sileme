const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  openid: {
    type: String,
    unique: true,
    sparse: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  nickname: {
    type: String,
    required: true,
    default: '用户'
  },
  avatar: String,
  password: String,
  lastCheckIn: {
    type: Date,
    default: null
  },
  lastOnline: {
    type: Date,
    default: Date.now
  },
  checkInStreak: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'sos', 'timeout'],
    default: 'active'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  managedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ lastCheckIn: 1, status: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ openid: 1 });

module.exports = mongoose.model('User', userSchema);
