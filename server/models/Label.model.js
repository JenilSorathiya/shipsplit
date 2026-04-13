const mongoose = require('mongoose');

const SPLIT_TYPES  = ['courier', 'sku', 'product', 'order'];
const LABEL_STATUS = ['pending', 'processing', 'ready', 'downloaded', 'failed'];
const PAGE_SIZES   = ['A4', 'A5', 'A6', 'Letter'];

const labelSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /* ── Orders included in this batch ───────────────────── */
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],

  /* ── Split configuration ──────────────────────────────── */
  splitType:   { type: String, enum: SPLIT_TYPES, default: 'order' },
  courierWise: { type: Boolean, default: false },
  skuWise:     { type: Boolean, default: false },

  /* ── Courier assigned ─────────────────────────────────── */
  courierPartner: String,

  /* ── Output settings ──────────────────────────────────── */
  settings: {
    pageSize:        { type: String, enum: PAGE_SIZES, default: 'A4' },
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

  /* ── Status & output ──────────────────────────────────── */
  status:        { type: String, enum: LABEL_STATUS, default: 'pending', index: true },
  labelCount:    { type: Number, default: 0 },
  pageCount:     { type: Number, default: 0 },
  pdfUrl:        String,          // S3 URL or local path for generated PDF
  pdfKey:        String,          // S3 key
  error:         String,

  /* ── Source PDF (upload flow) ─────────────────────────── */
  sourcePdfKey:  String,          // S3 key of original upload
  batchId:       String,          // upload batch grouping

  /* ── Timestamps ───────────────────────────────────────── */
  generatedAt:   Date,
  downloadCount: { type: Number, default: 0 },
  lastDownloadAt: Date,
}, { timestamps: true });

labelSchema.index({ userId: 1, status: 1 });
labelSchema.index({ userId: 1, createdAt: -1 });
labelSchema.index({ batchId: 1 }, { sparse: true });

module.exports = mongoose.model('Label', labelSchema);
