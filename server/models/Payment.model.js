const mongoose = require('mongoose');
const { SUBSCRIPTION_PLANS, PAYMENT_STATUS } = require('../../shared/constants');

const paymentSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan:     { type: String, enum: Object.values(SUBSCRIPTION_PLANS), required: true },
  amount:   { type: Number, required: true },   // in paise
  currency: { type: String, default: 'INR' },
  status:   { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },

  // Razorpay
  razorpayOrderId:    { type: String },
  razorpayPaymentId:  String,
  razorpaySignature:  String,

  // Subscription period
  periodStart: Date,
  periodEnd:   Date,

  failureReason: String,
  refundedAt:    Date,
  refundId:      String,
}, { timestamps: true });

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 }, { sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
