const rateLimit = require('express-rate-limit');

const makeMessage = (windowMinutes) =>
  `Too many requests. Please try again after ${windowMinutes} minutes.`;

/* ── Generic API limiter (already on /api/* in server.js) ───────────── */
exports.apiLimiter = rateLimit({
  windowMs:      15 * 60 * 1000,   // 15 min
  max:           200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: makeMessage(15) },
});

/* ── Auth routes: strict ─────────────────────────────────────────────── */
exports.authLimiter = rateLimit({
  windowMs:      15 * 60 * 1000,   // 15 min
  max:           20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: makeMessage(15) },
  skipSuccessfulRequests: true,     // only count failed attempts
});

/* ── Password reset: very strict ────────────────────────────────────── */
exports.passwordResetLimiter = rateLimit({
  windowMs:      60 * 60 * 1000,   // 1 hr
  max:           5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: makeMessage(60) },
});

/* ── File upload limiter ─────────────────────────────────────────────── */
exports.uploadLimiter = rateLimit({
  windowMs:      10 * 60 * 1000,   // 10 min
  max:           30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many uploads. Please slow down.' },
});

/* ── Label generation ────────────────────────────────────────────────── */
exports.labelLimiter = rateLimit({
  windowMs:      5 * 60 * 1000,    // 5 min
  max:           10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many label generation requests. Please wait a moment.' },
});
