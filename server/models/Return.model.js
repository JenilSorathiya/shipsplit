const mongoose = require('mongoose');

const PLATFORMS      = ['amazon', 'flipkart', 'meesho', 'myntra'];
const RETURN_TYPES   = ['RTO', 'CTO'];
const RETURN_STATUSES = ['initiated', 'in_transit', 'received', 'refunded', 'closed'];

const returnItemSchema = new mongoose.Schema({
  sku:      { type: String, trim: true },
  name:     { type: String, trim: true },
  quantity: { type: Number, default: 1 },
  price:    { type: Number },
}, { _id: false });

const returnSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  /* ── Platform info ───────────────────────────────── */
  platform:         { type: String, enum: PLATFORMS, required: true },
  orderId:          { type: String, required: true, trim: true },
  returnId:         { type: String, trim: true },
  platformReturnId: { type: String, trim: true },

  /* ── Return classification ───────────────────────── */
  returnType: {
    type:     String,
    enum:     RETURN_TYPES,
    required: true,
  },

  /* ── Status ──────────────────────────────────────── */
  status: {
    type:    String,
    enum:    RETURN_STATUSES,
    default: 'initiated',
    index:   true,
  },

  /* ── Details ─────────────────────────────────────── */
  returnReason:  { type: String, trim: true },
  items:         [returnItemSchema],
  refundAmount:  { type: Number, default: 0 },

  /* ── Shipment ────────────────────────────────────── */
  returnAWB:      { type: String, trim: true },
  courierPartner: { type: String, trim: true },

  /* ── Dates ───────────────────────────────────────── */
  returnCreatedAt: { type: Date },
  syncedAt:        { type: Date },

  /* ── Media / notes ───────────────────────────────── */
  images: [{ type: String }],
  notes:  { type: String, trim: true },
}, {
  timestamps: true,
});

/* ── Indexes ─────────────────────────────────────── */
returnSchema.index({ userId: 1, platform: 1 });
returnSchema.index({ userId: 1, status: 1 });
returnSchema.index({ orderId: 1 });
returnSchema.index({ userId: 1, platform: 1, orderId: 1 });

module.exports = mongoose.model('Return', returnSchema);
