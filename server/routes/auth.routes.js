const router         = require('express').Router();
const passport       = require('passport');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate       = require('../middleware/validate.middleware');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter.middleware');
const v              = require('../validations/auth.validation');

/* ── Registration & Login ────────────────────────────────────────────── */
router.post('/register', authLimiter, validate(v.register),        authController.register);
router.post('/login',    authLimiter, validate(v.login),           authController.login);
router.post('/logout',   authenticate,                              authController.logout);
router.get('/me',        authenticate,                              authController.getMe);
router.post('/refresh-token',                                       authController.refreshToken);

/* ── Profile & password ──────────────────────────────────────────────── */
router.put('/profile',         authenticate, validate(v.updateProfile),  authController.updateProfile);
router.put('/change-password', authenticate, validate(v.changePassword), authController.changePassword);

/* ── Password reset ──────────────────────────────────────────────────── */
router.post('/forgot-password',    passwordResetLimiter, validate(v.forgotPassword), authController.forgotPassword);
router.post('/reset-password/:token', validate(v.resetPassword), authController.resetPassword);

/* ── Google OAuth ────────────────────────────────────────────────────── */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get('/google/callback',
  passport.authenticate('google', {
    session:         false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  authController.oauthCallback
);

module.exports = router;
