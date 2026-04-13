const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const PLANS = ['free', 'starter', 'growth', 'pro'];

const userSchema = new mongoose.Schema({
  /* ── Identity ─────────────────────────────────────── */
  name:         { type: String, required: true, trim: true, maxlength: 100 },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, select: false },
  phone:        { type: String, trim: true },
  avatar:       String,

  /* ── Business ─────────────────────────────────────── */
  businessName: { type: String, trim: true },
  gstin:        { type: String, trim: true, uppercase: true },

  /* ── Plan (denormalized for fast middleware checks) ── */
  plan: {
    type:    String,
    enum:    PLANS,
    default: 'free',
  },

  /* ── Connected platforms (array of slugs) ─────────── */
  platforms: [{
    type: String,
    enum: ['amazon', 'flipkart', 'meesho', 'myntra'],
  }],

  /* ── OAuth ────────────────────────────────────────── */
  googleId: { type: String, sparse: true },

  /* ── Label defaults ───────────────────────────────── */
  labelDefaults: {
    pageSize:        { type: String, default: 'A4' },
    labelsPerPage:   { type: Number, default: 4 },
    showProductName: { type: Boolean, default: true },
    showSKU:         { type: Boolean, default: true },
    showOrderId:     { type: Boolean, default: true },
    showAWB:         { type: Boolean, default: true },
    showBarcode:     { type: Boolean, default: true },
    returnName:      String,
    returnAddress:   String,
    returnPhone:     String,
    returnGstin:     String,
  },

  /* ── Notification preferences ─────────────────────── */
  notifications: {
    newOrder:     { type: Boolean, default: true  },
    labelDone:    { type: Boolean, default: true  },
    usageAlert:   { type: Boolean, default: true  },
    returns:      { type: Boolean, default: false },
    weeklyDigest: { type: Boolean, default: false },
  },

  /* ── Account state ────────────────────────────────── */
  isEmailVerified:      { type: Boolean, default: false },
  isActive:             { type: Boolean, default: true  },
  lastLoginAt:          Date,

  /* ── Secure tokens (select: false) ───────────────── */
  emailVerifyToken:     { type: String, select: false },
  emailVerifyExpires:   { type: Date,   select: false },
  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date,   select: false },
}, {
  timestamps: true,
  toJSON:     { virtuals: true },
  toObject:   { virtuals: true },
});

// All indexes are declared inline on their fields (unique, sparse).
// No additional schema.index() calls needed.

/* ── Password hashing hook ────────────────────────── */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ── Instance methods ─────────────────────────────── */
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.emailVerifyToken;
  delete obj.emailVerifyExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

/* ── Virtual: plan limits ─────────────────────────── */
const LIMITS = {
  free:    { orders: 500,      labels: 200,      users: 1,  platforms: 1, apiAccess: false },
  starter: { orders: 500,      labels: 200,      users: 1,  platforms: 1, apiAccess: false },
  growth:  { orders: 2000,     labels: 1000,     users: 3,  platforms: 3, apiAccess: false },
  pro:     { orders: Infinity, labels: Infinity, users: 20, platforms: 4, apiAccess: true  },
};

userSchema.virtual('planLimits').get(function () {
  return LIMITS[this.plan] || LIMITS.free;
});

module.exports = mongoose.model('User', userSchema);
