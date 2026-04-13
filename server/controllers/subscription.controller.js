'use strict';

/**
 * Subscription controller — Razorpay payment + plan management.
 *
 * Plans (internal key → display name):
 *   free    → Free Trial   (7 days, 500 orders, 1 platform)
 *   growth  → Standard     (₹999/mo, 2000 orders, 3 platforms)
 *   pro     → Pro          (₹1999/mo, unlimited, 4 platforms)
 *
 * Billing modes: monthly (1 month) | annual (12 months, pay 10)
 */

const crypto       = require('crypto');
const Razorpay     = require('razorpay');
const Subscription = require('../models/Subscription.model');
const Payment      = require('../models/Payment.model');
const User         = require('../models/User.model');
const AppError     = require('../utils/AppError');
const { success, created } = require('../utils/response');
const emailService = require('../services/email.service');
const logger       = require('../utils/logger');

/* ── Plan configuration ─────────────────────────────────────────────── */
const PLANS = {
  growth: {
    name:    'Standard',
    monthly: { amount: 99900,   months: 1 },   // ₹999/mo
    annual:  { amount: 999000,  months: 12 },  // ₹9,990/yr (2 months free)
  },
  pro: {
    name:    'Pro',
    monthly: { amount: 199900,  months: 1 },   // ₹1,999/mo
    annual:  { amount: 1999000, months: 12 },  // ₹19,990/yr (2 months free)
  },
};

const TRIAL_DAYS = 7;

/* ── Razorpay instance ──────────────────────────────────────────────── */
const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/* ═══════════════════════════════════════════════════════════════════════
   GET /subscription
   ═══════════════════════════════════════════════════════════════════════ */
exports.getSubscription = async (req, res, next) => {
  try {
    let sub = await Subscription.findOne({ userId: req.user._id });

    if (!sub) {
      const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
      sub = await Subscription.create({
        userId:       req.user._id,
        plan:         'free',
        status:       'trialing',
        trialEndDate: trialEnd,
        startDate:    new Date(),
        endDate:      trialEnd,
      });
    }

    // Auto-expire trial
    if (sub.plan === 'free' && sub.status === 'trialing' && sub.trialEndDate < new Date()) {
      sub.status = 'expired';
      await sub.save();
    }

    success(res, { subscription: sub });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════════
   POST /subscription/create-order
   ═══════════════════════════════════════════════════════════════════════ */
exports.createOrder = async (req, res, next) => {
  try {
    const { plan, billing = 'monthly' } = req.body;
    const planInfo = PLANS[plan];
    if (!planInfo) return next(AppError.badRequest('Invalid plan selected'));

    const tier = planInfo[billing];
    if (!tier)  return next(AppError.badRequest('Invalid billing period'));

    const rzpOrder = await getRazorpay().orders.create({
      amount:   tier.amount,
      currency: 'INR',
      receipt:  `sub_${req.user._id}_${Date.now()}`,
      notes:    { userId: req.user._id.toString(), plan, billing },
    });

    created(res, {
      orderId:  rzpOrder.id,
      amount:   rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      planName: planInfo.name,
      billing,
    }, 'Payment order created');
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════════
   POST /subscription/verify
   ═══════════════════════════════════════════════════════════════════════ */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan, billing = 'monthly' } = req.body;

    // Verify HMAC signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSig !== razorpaySignature) {
      return next(AppError.badRequest('Payment signature verification failed'));
    }

    const planInfo = PLANS[plan];
    if (!planInfo) return next(AppError.badRequest('Invalid plan'));

    const tier = planInfo[billing] || planInfo.monthly;
    const now  = new Date();
    const end  = addMonths(now, tier.months);

    // Activate subscription
    const sub = await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        plan,
        status:             'active',
        startDate:          now,
        endDate:            end,
        currentPeriodStart: now,
        currentPeriodEnd:   end,
        lastPaymentId:      razorpayPaymentId,
        lastPaymentAmount:  tier.amount / 100,
        lastPaymentAt:      now,
        $unset:             { cancelledAt: '', cancelReason: '' },
      },
      { new: true, upsert: true }
    );

    // Update user plan
    await User.findByIdAndUpdate(req.user._id, { plan });

    // Save payment record
    await Payment.create({
      userId:            req.user._id,
      plan,
      amount:            tier.amount,
      currency:          'INR',
      status:            'captured',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      periodStart:       now,
      periodEnd:         end,
    }).catch((e) => logger.warn('Payment record save failed:', e.message));

    // Send invoice email (non-blocking)
    User.findById(req.user._id).then((user) => {
      if (!user) return;
      emailService.sendInvoice?.(user.email, {
        name:      user.name,
        plan:      planInfo.name,
        amount:    tier.amount / 100,
        paymentId: razorpayPaymentId,
        billing,
        date:      now.toLocaleDateString('en-IN'),
        endDate:   end.toLocaleDateString('en-IN'),
      }).catch((e) => logger.warn('Invoice email failed:', e.message));
    });

    success(res, { subscription: sub, plan, billing }, 'Payment verified — subscription activated!');
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════════
   POST /subscription/cancel
   ═══════════════════════════════════════════════════════════════════════ */
exports.cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const sub = await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason || '' },
      { new: true }
    );
    if (!sub) return next(AppError.notFound('Subscription not found'));
    success(res, { subscription: sub }, 'Subscription cancelled. Access continues until billing period ends.');
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /subscription/invoices
   ═══════════════════════════════════════════════════════════════════════ */
exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await Payment
      .find({ userId: req.user._id, status: 'captured' })
      .sort({ createdAt: -1 })
      .limit(24)
      .lean();

    const formatted = invoices.map((inv) => ({
      id:          inv._id,
      plan:        inv.plan === 'growth' ? 'Standard' : inv.plan.charAt(0).toUpperCase() + inv.plan.slice(1),
      amount:      inv.amount / 100,
      currency:    inv.currency,
      paymentId:   inv.razorpayPaymentId,
      date:        inv.createdAt,
      periodStart: inv.periodStart,
      periodEnd:   inv.periodEnd,
    }));

    success(res, { invoices: formatted });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════════
   POST /subscription/webhook  (called from server.js with raw body)
   ═══════════════════════════════════════════════════════════════════════ */
exports.handleWebhook = async (req, res) => {
  try {
    const sig      = req.headers['x-razorpay-signature'];
    const body     = JSON.stringify(req.body);
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body).digest('hex');

    if (sig !== expected) return res.status(400).json({ message: 'Invalid signature' });

    const { event, payload } = req.body;
    logger.info(`Razorpay webhook: ${event}`);

    if (event === 'subscription.cancelled') {
      const rzpSub = payload.subscription?.entity;
      if (rzpSub) {
        await Subscription.findOneAndUpdate(
          { razorpaySubscriptionId: rzpSub.id },
          { status: 'cancelled', cancelledAt: new Date() }
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook error:', err.message);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};
