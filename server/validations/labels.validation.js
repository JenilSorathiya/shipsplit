'use strict';

const Joi = require('joi');

const PAGE_SIZES  = ['A4', 'A5', 'A6', '4x6', 'Letter', 'original'];
const SPLIT_TYPES = ['courier', 'sku', 'product', 'orderid', 'order', 'gift', 'none'];
const COURIERS    = ['delhivery', 'shiprocket', 'bluedart', 'dtdc', 'ekart', 'xpressbees', 'other'];

const settingsSchema = Joi.object({
  /* ── Page layout ──────────────────────────────────────────── */
  pageSize:        Joi.string().valid(...PAGE_SIZES).default('A4'),
  labelsPerPage:   Joi.number().integer().valid(1, 2, 4, 6, 8).default(4),

  /* ── Content toggles ──────────────────────────────────────── */
  showProductName:     Joi.boolean().default(true),
  showSKU:             Joi.boolean().default(true),
  showOrderId:         Joi.boolean().default(true),
  showAWB:             Joi.boolean().default(true),
  showBarcode:         Joi.boolean().default(true),

  /* ── Overlays ─────────────────────────────────────────────── */
  addCourierWatermark: Joi.boolean().default(false),
  addBookmarks:        Joi.boolean().default(false),
  giftLabelSupport:    Joi.boolean().default(false),   // Amazon gift separation

  /* ── Pre-processing ───────────────────────────────────────── */
  removeBlankPages:    Joi.boolean().default(false),

  /* ── Return address (printed on label) ────────────────────── */
  returnName:    Joi.string().trim().max(200).allow(''),
  returnAddress: Joi.string().trim().max(500).allow(''),
  returnPhone:   Joi.string().trim().max(20).allow(''),
  returnGstin:   Joi.string().trim().max(20).allow(''),
}).default({});

/* ── Route schemas ────────────────────────────────────────────────── */

exports.getLabels = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'processing', 'ready', 'downloaded', 'failed'),
});

exports.uploadLabelPdf = Joi.object({
  platform: Joi.string().valid('amazon', 'flipkart', 'meesho', 'myntra').required(),
});

exports.generateLabels = Joi.object({
  orderIds:  Joi.array().items(Joi.string().length(24)).min(1).max(500).required(),
  splitType: Joi.string().valid(...SPLIT_TYPES).default('none'),
  batchId:   Joi.string().uuid().allow(null, ''),    // reference to uploaded PDF
  settings:  settingsSchema,
  createZip: Joi.boolean().default(true),
});

exports.downloadLabels = Joi.object({
  labelIds: Joi.array().items(Joi.string().length(24)).min(1).max(50).required(),
  settings: settingsSchema,
});
