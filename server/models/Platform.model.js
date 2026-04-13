const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encrypt.utils');

const platformSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platformName: {
    type:     String,
    required: true,
    enum:     ['amazon', 'flipkart', 'meesho', 'myntra'],
    lowercase: true,
  },

  /* ── OAuth / API credentials (stored encrypted) ──── */
  _accessToken:  { type: String, select: false },
  _refreshToken: { type: String, select: false },
  _apiKey:       { type: String, select: false },
  _apiSecret:    { type: String, select: false },

  /* ── Seller identity ──────────────────────────────── */
  sellerId:      String,
  storeName:     String,
  sellerEmail:   String,
  marketplaceId: String,        // Amazon marketplace ID

  /* ── Token lifecycle ──────────────────────────────── */
  tokenExpiresAt:   Date,
  tokenScope:       [String],

  /* ── Sync metadata ────────────────────────────────── */
  isConnected:  { type: Boolean, default: false },
  lastSyncAt:   Date,
  lastSyncStatus: {
    type:    String,
    enum:    ['success', 'failed', 'partial', null],
    default: null,
  },
  lastSyncError: String,
  totalOrdersSynced: { type: Number, default: 0 },

  /* ── Platform-specific settings ──────────────────── */
  settings: {
    autoSync:        { type: Boolean, default: false },
    syncIntervalHrs: { type: Number,  default: 6 },
    syncFromDaysAgo: { type: Number,  default: 7 },
  },

  /* ── Metadata ─────────────────────────────────────── */
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

/* ── Compound unique: one record per user+platform ── */
platformSchema.index({ userId: 1, platformName: 1 }, { unique: true });
platformSchema.index({ userId: 1 });

/* ── Virtual setters/getters for encrypted fields ─── */
platformSchema.virtual('accessToken')
  .get(function () { return this._accessToken ? decrypt(this._accessToken) : null; })
  .set(function (v) { this._accessToken = v ? encrypt(v) : null; });

platformSchema.virtual('refreshToken')
  .get(function () { return this._refreshToken ? decrypt(this._refreshToken) : null; })
  .set(function (v) { this._refreshToken = v ? encrypt(v) : null; });

platformSchema.virtual('apiKey')
  .get(function () { return this._apiKey ? decrypt(this._apiKey) : null; })
  .set(function (v) { this._apiKey = v ? encrypt(v) : null; });

platformSchema.virtual('apiSecret')
  .get(function () { return this._apiSecret ? decrypt(this._apiSecret) : null; })
  .set(function (v) { this._apiSecret = v ? encrypt(v) : null; });

/* ── Safe serialization ───────────────────────────── */
platformSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: false });
  delete obj._accessToken;
  delete obj._refreshToken;
  delete obj._apiKey;
  delete obj._apiSecret;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Platform', platformSchema);
