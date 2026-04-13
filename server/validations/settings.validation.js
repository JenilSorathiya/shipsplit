const Joi = require('joi');

const COURIER_SLUGS = ['delhivery', 'shiprocket', 'bluedart', 'dtdc', 'ekart', 'xpressbees', 'other'];

exports.updateLabelDefaults = Joi.object({
  pageSize:        Joi.string().valid('A4', 'A5', 'A6', 'Letter'),
  labelsPerPage:   Joi.number().integer().valid(1, 2, 4, 6, 8),
  showProductName: Joi.boolean(),
  showSKU:         Joi.boolean(),
  showOrderId:     Joi.boolean(),
  showAWB:         Joi.boolean(),
  showBarcode:     Joi.boolean(),
  returnName:      Joi.string().trim().max(200).allow(''),
  returnAddress:   Joi.string().trim().max(500).allow(''),
  returnPhone:     Joi.string().trim().max(20).allow(''),
  returnGstin:     Joi.string().trim().max(20).allow(''),
});

exports.updateNotifications = Joi.object({
  newOrder:     Joi.boolean(),
  labelDone:    Joi.boolean(),
  usageAlert:   Joi.boolean(),
  returns:      Joi.boolean(),
  weeklyDigest: Joi.boolean(),
});

exports.addCourier = Joi.object({
  name:      Joi.string().trim().min(2).max(100).required(),
  slug:      Joi.string().valid(...COURIER_SLUGS).required(),
  apiKey:    Joi.string().trim().max(500).allow(''),
  apiSecret: Joi.string().trim().max(500).allow(''),
  settings: Joi.object({
    accountCode:   Joi.string().trim().max(100).allow(''),
    warehouseCode: Joi.string().trim().max(100).allow(''),
    pickupPincode: Joi.string().trim().pattern(/^\d{6}$/).allow(''),
    defaultWeight: Joi.number().integer().min(1).max(100000),
  }).default({}),
  notes: Joi.string().trim().max(500).allow(''),
});

exports.updateCourier = Joi.object({
  name:      Joi.string().trim().min(2).max(100),
  apiKey:    Joi.string().trim().max(500).allow(''),
  apiSecret: Joi.string().trim().max(500).allow(''),
  isActive:  Joi.boolean(),
  settings: Joi.object({
    accountCode:   Joi.string().trim().max(100).allow(''),
    warehouseCode: Joi.string().trim().max(100).allow(''),
    pickupPincode: Joi.string().trim().pattern(/^\d{6}$/).allow(''),
    defaultWeight: Joi.number().integer().min(1).max(100000),
  }),
  notes: Joi.string().trim().max(500).allow(''),
});
