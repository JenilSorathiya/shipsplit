const User         = require('../models/User.model');
const Subscription = require('../models/Subscription.model');
const AppError     = require('../utils/AppError');
const { success, created } = require('../utils/response');
const { generateTokens, signAccessToken, setTokenCookies, clearTokenCookies,
        generateOpaqueToken, hashToken } = require('../utils/jwt.utils');
const emailService = require('../services/email.service');
const logger       = require('../utils/logger');

/* ── Register ────────────────────────────────────────────────────────── */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(AppError.conflict('Email already in use'));

    const user = await User.create({ name, email, password, phone });

    // Create trial subscription
    await Subscription.create({
      userId:      user._id,
      plan:        'free',
      status:      'trialing',
      trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Send welcome email (non-blocking)
    emailService.sendWelcome(email, name).catch((e) => logger.warn('Welcome email failed:', e.message));

    const { accessToken, refreshToken } = generateTokens(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    created(res, { user: user.toSafeObject(), accessToken }, 'Account created successfully');
  } catch (err) { next(err); }
};

/* ── Login ───────────────────────────────────────────────────────────── */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) return next(AppError.unauthorized('Invalid email or password'));

    const valid = await user.comparePassword(password);
    if (!valid) return next(AppError.unauthorized('Invalid email or password'));

    if (!user.isActive) return next(AppError.forbidden('Account has been suspended'));

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const { accessToken, refreshToken } = generateTokens(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    success(res, { user: user.toSafeObject(), accessToken }, 'Login successful');
  } catch (err) { next(err); }
};

/* ── Logout ──────────────────────────────────────────────────────────── */
exports.logout = async (req, res, next) => {
  try {
    clearTokenCookies(res);
    success(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
};

/* ── Get current user ────────────────────────────────────────────────── */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('User not found'));
    success(res, { user: user.toSafeObject() });
  } catch (err) { next(err); }
};

/* ── Update profile ──────────────────────────────────────────────────── */
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'businessName', 'gstin'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    success(res, { user: user.toSafeObject() }, 'Profile updated');
  } catch (err) { next(err); }
};

/* ── Change password ─────────────────────────────────────────────────── */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return next(AppError.unauthorized('Current password is incorrect'));

    user.password = newPassword;
    await user.save();

    clearTokenCookies(res);
    success(res, null, 'Password changed. Please log in again.');
  } catch (err) { next(err); }
};

/* ── Refresh token ───────────────────────────────────────────────────── */
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return next(AppError.unauthorized('No refresh token'));

    const { verifyRefreshToken } = require('../utils/jwt.utils');
    const payload = verifyRefreshToken(token);

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return next(AppError.unauthorized('Invalid token'));

    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
    setTokenCookies(res, accessToken, newRefresh);

    success(res, { accessToken });
  } catch (err) { next(err); }
};

/* ── Forgot password ─────────────────────────────────────────────────── */
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    // Always 200 to prevent email enumeration
    if (!user) return success(res, null, 'If that email exists, a reset link has been sent');

    const token  = generateOpaqueToken();
    user.passwordResetToken   = hashToken(token);
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    emailService.sendPasswordReset(user.email, token).catch((e) => logger.warn('Reset email failed:', e.message));
    success(res, null, 'If that email exists, a reset link has been sent');
  } catch (err) { next(err); }
};

/* ── Reset password ──────────────────────────────────────────────────── */
exports.resetPassword = async (req, res, next) => {
  try {
    const hashed = hashToken(req.params.token);
    const user   = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) return next(AppError.badRequest('Token is invalid or has expired'));

    user.password             = req.body.password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    clearTokenCookies(res);
    success(res, null, 'Password reset successful. Please log in.');
  } catch (err) { next(err); }
};

/* ── OAuth callback ──────────────────────────────────────────────────── */
exports.oauthCallback = async (req, res) => {
  const { accessToken, refreshToken } = generateTokens(req.user._id);
  setTokenCookies(res, accessToken, refreshToken);
  res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
};
