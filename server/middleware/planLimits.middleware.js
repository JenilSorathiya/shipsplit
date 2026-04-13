'use strict';

/**
 * Plan enforcement middleware.
 *
 * Usage in routes:
 *   const { checkOrderLimit, checkPlatformAccess, requireActivePlan } = require('../middleware/planLimits.middleware');
 *
 *   router.post('/sync',       requireActivePlan, checkPlatformAccess, ctrl.syncOrders);
 *   router.post('/upload',     requireActivePlan, checkOrderLimit,     ctrl.uploadOrders);
 */

const Subscription = require('../models/Subscription.model');
const AppError     = require('../utils/AppError');

/* ── Plan limits table ──────────────────────────────────────────────── */
const LIMITS = {
  free:    { orders: 500,      platforms: 1 },
  starter: { orders: 500,      platforms: 1 },
  growth:  { orders: 2000,     platforms: 3 },
  pro:     { orders: Infinity, platforms: 4 },
};

const PLAN_DISPLAY = {
  free:    'Free Trial',
  starter: 'Free Trial',
  growth:  'Standard',
  pro:     'Pro',
};

/* ── requireActivePlan ─────────────────────────────────────────────────
   Blocks access if trial has expired and user hasn't upgraded.
   ─────────────────────────────────────────────────────────────────── */
exports.requireActivePlan = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id });

    // If no subscription record, allow (trial will be created on first /subscription call)
    if (!sub) return next();

    if (sub.status === 'expired') {
      return next(AppError.planLimit('Your free trial has expired. Please upgrade to continue.'));
    }

    if (sub.plan === 'free' && sub.status === 'trialing' && sub.trialEndDate < new Date()) {
      // Auto-mark as expired
      sub.status = 'expired';
      await sub.save();
      return next(AppError.planLimit('Your free trial has expired. Please upgrade to continue.'));
    }

    // Attach subscription to request for downstream use
    req.subscription = sub;
    next();
  } catch (err) { next(err); }
};

/* ── checkOrderLimit ───────────────────────────────────────────────────
   Blocks order import/sync if monthly limit exceeded.
   ─────────────────────────────────────────────────────────────────── */
exports.checkOrderLimit = async (req, res, next) => {
  try {
    const plan  = req.user.plan || 'free';
    const limit = LIMITS[plan]?.orders ?? 500;

    if (limit === Infinity) return next(); // Pro plan — no limit

    const sub = req.subscription
      || await Subscription.findOne({ userId: req.user._id });

    const used = sub?.ordersThisPeriod ?? 0;

    if (used >= limit) {
      return next(new AppError(
        `You've used ${used}/${limit} orders this month. Upgrade to ${PLAN_DISPLAY[plan] === 'Standard' ? 'Pro' : 'Standard'} for more.`,
        403,
        'PLAN_LIMIT_EXCEEDED'
      ));
    }

    next();
  } catch (err) { next(err); }
};

/* ── checkPlatformAccess ───────────────────────────────────────────────
   Blocks sync if platform isn't in the user's plan.
   ─────────────────────────────────────────────────────────────────── */
exports.checkPlatformAccess = async (req, res, next) => {
  try {
    const platform    = req.body.platform || req.params.name;
    const plan        = req.user.plan || 'free';
    const maxPlatforms = LIMITS[plan]?.platforms ?? 1;

    // Pro plan — all 4 platforms
    if (maxPlatforms >= 4) return next();

    const PLATFORM_ORDER = ['amazon', 'flipkart', 'meesho', 'myntra'];
    const allowedPlatforms = PLATFORM_ORDER.slice(0, maxPlatforms);

    if (platform && !allowedPlatforms.includes(platform)) {
      return next(new AppError(
        `Your ${PLAN_DISPLAY[plan]} plan supports ${maxPlatforms} platform(s): ${allowedPlatforms.join(', ')}. Upgrade to access ${platform}.`,
        403,
        'PLATFORM_NOT_IN_PLAN'
      ));
    }

    next();
  } catch (err) { next(err); }
};

/* ── getPlanInfo ───────────────────────────────────────────────────────
   Utility (not middleware) — returns plan limits for a given plan key.
   ─────────────────────────────────────────────────────────────────── */
exports.getPlanInfo = (planKey) => ({
  key:     planKey,
  display: PLAN_DISPLAY[planKey] || planKey,
  limits:  LIMITS[planKey] || LIMITS.free,
});
