const crypto = require('crypto');
const razorpayService = require('../services/razorpay.service');
const Payment = require('../models/Payment.model');
const User = require('../models/User.model');
const { PLAN_PRICES } = require('../../shared/constants');
const logger = require('../utils/logger');

exports.subscribe = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const amount = PLAN_PRICES[plan] * 100; // paise

    if (amount === 0) {
      // Downgrade to free
      await User.findByIdAndUpdate(req.user._id, { 'subscription.plan': 'free' });
      return res.json({ message: 'Downgraded to free plan' });
    }

    const razorpayOrder = await razorpayService.createOrder(amount);

    const payment = await Payment.create({
      userId: req.user._id,
      plan,
      amount,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending',
    });

    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: 'INR',
      paymentId: payment._id,
    });
  } catch (err) { next(err); }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'captured', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
      { new: true }
    );

    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await User.findByIdAndUpdate(payment.userId, {
      'subscription.plan': payment.plan,
      'subscription.status': 'active',
      'subscription.currentPeriodStart': now,
      'subscription.currentPeriodEnd': periodEnd,
      'subscription.renewsAt': periodEnd,
    });

    res.json({ message: 'Payment verified. Plan activated.' });
  } catch (err) { next(err); }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ invoices });
  } catch (err) { next(err); }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': new Date(),
    });
    res.json({ message: 'Subscription cancelled. Access continues until period end.' });
  } catch (err) { next(err); }
};

exports.handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body.toString());
    logger.info('Razorpay webhook:', event.event);

    // Handle payment.failed
    if (event.event === 'payment.failed') {
      const orderId = event.payload.payment?.entity?.order_id;
      if (orderId) {
        await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { status: 'failed', failureReason: event.payload.payment?.entity?.error_description });
      }
    }

    res.json({ received: true });
  } catch (err) { next(err); }
};
