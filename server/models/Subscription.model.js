const mongoose = require('mongoose');

const PLANS  = ['free', 'starter', 'growth', 'pro'];
const STATUS = ['trialing', 'active', 'past_due', 'cancelled', 'expired'];

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  plan:   { type: String, enum: PLANS,  default: 'free' },
  status: { type: String, enum: STATUS, default: 'trialing' },

  /* ── Trial ────────────────────────────────────────────── */
  trialEndDate: Date,

  /* ── Billing period ───────────────────────────────────── */
  startDate:          Date,
  endDate:            Date,
  currentPeriodStart: Date,
  currentPeriodEnd:   Date,

  /* ── Razorpay ─────────────────────────────────────────── */
  razorpayCustomerId:     String,
  razorpaySubscriptionId: String,
  razorpayPlanId:         String,

  /* ── Last payment ─────────────────────────────────────── */
  lastPaymentId:     String,
  lastPaymentAmount: Number,
  lastPaymentAt:     Date,

  /* ── Cancellation ─────────────────────────────────────── */
  cancelledAt:    Date,
  cancelReason:   String,

  /* ── Usage (denormalised for quick limit checks) ──────── */
  ordersThisPeriod: { type: Number, default: 0 },
  labelsThisPeriod: { type: Number, default: 0 },
}, { timestamps: true });

// userId is unique: true inline — no duplicate needed
subscriptionSchema.index({ razorpaySubscriptionId: 1 }, { sparse: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
