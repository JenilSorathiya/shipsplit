const { verifyAccessToken } = require('../utils/jwt.utils');
const AppError = require('../utils/AppError');
const User = require('../models/User.model');

/* ── Authenticate request (JWT cookie or Bearer header) ─────────────── */
exports.authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) return next(AppError.unauthorized('Authentication required'));

    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') return next(AppError.unauthorized('Invalid token type'));

    const user = await User.findById(payload.sub).lean();
    if (!user)          return next(AppError.unauthorized('User not found'));
    if (!user.isActive) return next(AppError.forbidden('Account has been deactivated'));

    req.user = user;
    next();
  } catch (err) {
    next(err);  // JWT errors handled by errorHandler
  }
};

/* ── Plan gate: ensure user's plan is in the allowed list ────────────── */
exports.requirePlan = (...plans) => (req, res, next) => {
  const plan = req.user?.plan || 'free';
  if (!plans.includes(plan)) {
    return next(AppError.planLimit(`This feature requires a ${plans.join(' or ')} plan`));
  }
  next();
};

/* ── Email verification gate ─────────────────────────────────────────── */
exports.requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.isEmailVerified) {
    return next(AppError.forbidden('Please verify your email address to continue'));
  }
  next();
};
