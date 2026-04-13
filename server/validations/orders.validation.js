const Joi = require('joi');

const PLATFORMS = ['amazon', 'flipkart', 'meesho', 'myntra'];
const STATUSES  = ['pending', 'processing', 'label_generated', 'shipped', 'delivered', 'returned', 'cancelled'];
const COURIERS  = ['delhivery', 'shiprocket', 'bluedart', 'dtdc', 'ekart', 'xpressbees', 'other'];

exports.getOrders = Joi.object({
  page:           Joi.number().integer().min(1).default(1),
  limit:          Joi.number().integer().min(1).max(100).default(20),
  platform:       Joi.string().valid(...PLATFORMS),
  status:         Joi.string().valid(...STATUSES),
  courierPartner: Joi.string().valid(...COURIERS),
  search:         Joi.string().trim().max(100),
  dateFrom:       Joi.date().iso(),
  dateTo:         Joi.date().iso().min(Joi.ref('dateFrom')),
  sortBy:         Joi.string().valid('createdAt', 'platformCreatedAt', 'orderId').default('createdAt'),
  sortOrder:      Joi.string().valid('asc', 'desc').default('desc'),
});

exports.uploadOrders = Joi.object({
  platform: Joi.string().valid(...PLATFORMS).required(),
});

exports.assignCourier = Joi.object({
  courierPartner: Joi.string().valid(...COURIERS).required(),
  awb:            Joi.string().trim().max(100),
  trackingUrl:    Joi.string().uri().max(500),
});

exports.bulkAssignCourier = Joi.object({
  orderIds:       Joi.array().items(Joi.string().length(24)).min(1).max(200).required(),
  courierPartner: Joi.string().valid(...COURIERS).required(),
});

exports.updateOrder = Joi.object({
  status:         Joi.string().valid(...STATUSES),
  courierPartner: Joi.string().valid(...COURIERS).allow(null),
  awb:            Joi.string().trim().max(100).allow(''),
  trackingUrl:    Joi.string().uri().max(500).allow(''),
});
