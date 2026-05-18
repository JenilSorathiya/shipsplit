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
  orderItemId: String,           // Amazon OrderItemId — required for confirmShipment
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
  // Amazon DPP: only the minimum PII needed for fulfilment is stored.
  // buyerEmail and buyerPhone are intentionally omitted — they are not
  // required for shipping and Amazon DPP prohibits retaining them.
  buyerName:    { type: String, trim: true },
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
  shipmentId:         String,   // MFN shipmentId from createMFNShipment (needed for cancel)

  /* ── Label reference ──────────────────────────────── */
  labelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Label' },

  /* ── Cancellation ─────────────────────────────────── */
  cancellationReason:     String,   // e.g. 'NO_INVENTORY', 'PRICE_ERROR', 'SELLER_CANCEL'
  cancellationReasonText: String,   // free-text note from seller

  /* ── Timestamps ───────────────────────────────────── */
  platformCreatedAt: Date,
  shippedAt:         Date,
  deliveredAt:       Date,
  returnedAt:        Date,
  cancelledAt:       Date,

  /* ── Import metadata ──────────────────────────────── */
  importBatchId: String,
  syncedAt:      Date,
  // rawData intentionally removed — storing the full SP-API response object
  // violates Amazon's Data Protection Policy (contains unencrypted buyer PII).
}, {
  timestamps: true,
});

/* ── Indexes ──────────────────────────────────────── */
// Unique constraint — prevents duplicate orders per user+platform
orderSchema.index({ userId: 1, platform: 1, orderId: 1 }, { unique: true });

// Tab queries: filter by status + sort by date (most common query in the app)
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Platform-filtered tab view (e.g. "show only Amazon pending orders")
orderSchema.index({ userId: 1, platform: 1, status: 1, createdAt: -1 });

// Dashboard stats: count by platform
orderSchema.index({ userId: 1, platform: 1 });

// Courier assignment view
orderSchema.index({ userId: 1, courierPartner: 1 });

// Default sort (newest first)
orderSchema.index({ userId: 1, createdAt: -1 });

// COD filter (reports page)
orderSchema.index({ userId: 1, isCOD: 1, status: 1 });

// Sparse indexes — only indexed when field exists
orderSchema.index({ awb:           1 }, { sparse: true });
orderSchema.index({ importBatchId: 1 }, { sparse: true });
orderSchema.index({ platformOrderId: 1 }, { sparse: true });

// Full-text search on orderId and productName
orderSchema.index({ orderId: 'text', productName: 'text', buyerName: 'text' });

module.exports = mongoose.model('Order', orderSchema);
