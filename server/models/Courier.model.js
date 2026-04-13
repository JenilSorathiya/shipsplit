const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encrypt.utils');

const COURIER_SLUGS = ['delhivery', 'shiprocket', 'bluedart', 'dtdc', 'ekart', 'xpressbees', 'other'];

const courierSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, enum: COURIER_SLUGS },

  /* ── Credentials (encrypted) ─────────────────────────── */
  _apiKey:    { type: String, select: false },
  _apiSecret: { type: String, select: false },

  /* ── State ────────────────────────────────────────────── */
  isActive:      { type: Boolean, default: true },
  isVerified:    { type: Boolean, default: false },
  lastVerifiedAt: Date,

  /* ── Settings ─────────────────────────────────────────── */
  settings: {
    accountCode:   String,
    warehouseCode: String,
    pickupPincode: String,
    defaultWeight: { type: Number, default: 500 },   // grams
  },

  notes: { type: String, trim: true },
}, { timestamps: true });

/* ── Compound unique: one config per user+slug ──────────── */
courierSchema.index({ userId: 1, slug: 1 }, { unique: true });
courierSchema.index({ userId: 1, isActive: 1 });

/* ── Virtual getters/setters for encrypted fields ──────── */
courierSchema.virtual('apiKey')
  .get(function () { return this._apiKey ? decrypt(this._apiKey) : null; })
  .set(function (v) { this._apiKey = v ? encrypt(v) : null; });

courierSchema.virtual('apiSecret')
  .get(function () { return this._apiSecret ? decrypt(this._apiSecret) : null; })
  .set(function (v) { this._apiSecret = v ? encrypt(v) : null; });

courierSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: false });
  delete obj._apiKey;
  delete obj._apiSecret;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Courier', courierSchema);
