const mongoose = require('mongoose');

const PLATFORMS         = ['amazon', 'flipkart', 'meesho', 'myntra'];
const REMITTANCE_TYPES  = ['COD', 'prepaid', 'return_deduction', 'settlement'];
const REMITTANCE_STATUS = ['pending', 'processing', 'paid', 'failed'];

const remittanceSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  /* ── Platform ──────────────────────────────────────── */
  platform: {
    type:     String,
    enum:     PLATFORMS,
    required: true,
  },

  /* ── Settlement identity ───────────────────────────── */
  remittanceId: {
    type:  String,
    trim:  true,
  },

  /* ── Classification ────────────────────────────────── */
  type: {
    type:    String,
    enum:    REMITTANCE_TYPES,
    default: 'COD',
  },

  status: {
    type:    String,
    enum:    REMITTANCE_STATUS,
    default: 'pending',
  },

  /* ── Financials ────────────────────────────────────── */
  amount: {
    type: Number,
    default: 0,
  },

  /* ── Dates ─────────────────────────────────────────── */
  scheduledDate: Date,
  paidDate:      Date,

  /* ── Order details ─────────────────────────────────── */
  orderIds: {
    type:    [String],
    default: [],
  },
  orderCount: {
    type:    Number,
    default: 0,
  },

  /* ── Settlement period ─────────────────────────────── */
  period: {
    start: Date,
    end:   Date,
  },

  /* ── Misc ──────────────────────────────────────────── */
  notes:    String,
  syncedAt: Date,
}, {
  timestamps: true,
});

/* ── Indexes ──────────────────────────────────────────── */
// Unique remittanceId per user+platform (sparse so null values are allowed)
remittanceSchema.index(
  { userId: 1, platform: 1, remittanceId: 1 },
  { unique: true, sparse: true }
);
remittanceSchema.index({ userId: 1, platform: 1 });
remittanceSchema.index({ userId: 1, scheduledDate: 1 });
remittanceSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Remittance', remittanceSchema);
