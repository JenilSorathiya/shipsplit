const Joi = require('joi');

const PAID_PLANS = ['growth', 'pro'];
const BILLING    = ['monthly', 'annual'];

exports.createOrder = Joi.object({
  plan:    Joi.string().valid(...PAID_PLANS).required(),
  billing: Joi.string().valid(...BILLING).default('monthly'),
});

exports.verifyPayment = Joi.object({
  razorpayOrderId:   Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
  plan:              Joi.string().valid(...PAID_PLANS).required(),
  billing:           Joi.string().valid(...BILLING).default('monthly'),
});

exports.cancelSubscription = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});
