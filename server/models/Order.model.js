const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'pending', 'processing', 'label_generated',
  'shipped', 'delivered', 'returned', 'cancelled',
];

const PLATFORMS  = ['amazon', 'flipkart', 'meesho', 'myntra'];
const COURIERS   = ['delhivery', 'shiprocket', 'bluedart', 'dtdc', 'ekart', 'xpressbees', 'other'];

const addressSchema = new mongoose.Schema({
  line1:   { type: String, trim: true },
  line2:   { type: String, trim: true },
  city:    { type: String, trim: true },
  state:   { type: String, trim: true },
  pincode: { type: String, trim: true },
  country: { type: String, trim: true, default: 'India' },
}, { _id: false });

const itemSchema = new mongoose.Schema({
  sku:         String,
  msku:        String,           // merchant/custom SKU
  name:        String,
  asin:        String,           // Amazon ASIN
  quantity:    { type: Number, default: 1 },
  price:       Number,
  imageUrl:    String,
  isGift:      { type: Boolean, default: false },
  giftMessage: String,
  imei:        String,           // IMEI (Flipkart electronics)
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  /* ── Platform info ────────────────────────────────── */
  platform:        { type: String, enum: PLATFORMS, required: true },
  orderId:         { type: String, required: true, trim: true },  // seller-facing ID
  platformOrderId: { type: String, trim: true },                   // platform's internal ID
  platformStatus:  String,                                          // raw status from platform

  /* ── Product ──────────────────────────────────────── */
  productName: { type: String, trim: true },
  sku:         { type: String, trim: true },
  msku:        { type: String, trim: true },    // merchant SKU
  quantity:    { type: Number, default: 1 },
  items:       [itemSchema],

  /* ── Courier ──────────────────────────────────────── */
  courierPartner: { type: String, enum: [...COURIERS, null], default: null },
  awb:            { type: String, trim: true },
  trackingUrl:    String,

  /* ── Status ───────────────────────────────────────── */
  status: {
    type:    String,
    enum:    ORDER_STATUSES,
    default: 'pending',
    index:   true,
  },

  /* ── Buyer ────────────────────────────────────────── */
  buyerName:    { type: String, trim: true },
  buyerPhone:   { type: String, trim: true },
  buyerEmail:   { type: String, trim: true },
  address:      addressSchema,

  /* ── Package ──────────────────────────────────────── */
  weight:     Number,         // grams
  dimensions: {
    length:   Number,         // cm
    breadth:  Number,
    height:   Number,
  },

  /* ── Financials ───────────────────────────────────── */
  orderValue:       Number,
  codAmount:        Number,
  isCOD:            { type: Boolean, default: false },

  /* ── Amazon-specific ─────────────────────────────── */
  fulfillmentChannel: { type: String, enum: ['AFN', 'MFN', null], default: null },
  isGift:             { type: Boolean, default: false },
  giftMessage:        String,

  /* ── Label reference ──────────────────────────────── */
  labelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Label' },

  /* ── Timestamps ───────────────────────────────────── */
  platformCreatedAt: Date,
  shippedAt:         Date,
  deliveredAt:       Date,
  returnedAt:        Date,
  cancelledAt:       Date,

  /* ── Import metadata ──────────────────────────────── */
  importBatchId: String,
  syncedAt:      Date,
  rawData:       { type: mongoose.Schema.Types.Mixed, select: false },
}, {
  timestamps: true,
});

/* ── Indexes ──────────────────────────────────────── */
orderSchema.index({ userId: 1, platform: 1, orderId: 1 }, { unique: true });
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ userId: 1, platform: 1 });
orderSchema.index({ userId: 1, courierPartner: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ awb: 1 }, { sparse: true });
orderSchema.index({ importBatchId: 1 }, { sparse: true });

module.exports = mongoose.model('Order', orderSchema);
