const User     = require('../models/User.model');
const Courier  = require('../models/Courier.model');
const Platform = require('../models/Platform.model');
const AppError = require('../utils/AppError');
const { success, created, noContent } = require('../utils/response');

/* ── GET /settings ───────────────────────────────────────────────────── */
exports.getSettings = async (req, res, next) => {
  try {
    const [user, couriers, platforms] = await Promise.all([
      User.findById(req.user._id),
      Courier.find({ userId: req.user._id }).sort({ name: 1 }),
      Platform.find({ userId: req.user._id }),
    ]);
    if (!user) return next(AppError.notFound('User not found'));

    success(res, {
      profile:       user.toSafeObject(),
      labelDefaults: user.labelDefaults,
      notifications: user.notifications,
      couriers:      couriers.map((c) => c.toSafeObject()),
      platforms:     platforms.map((p) => p.toSafeObject()),
    });
  } catch (err) { next(err); }
};

/* ── PUT /settings/label-defaults ────────────────────────────────────── */
exports.updateLabelDefaults = async (req, res, next) => {
  try {
    const updates = {};
    Object.keys(req.body).forEach((k) => {
      updates[`labelDefaults.${k}`] = req.body[k];
    });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    success(res, { labelDefaults: user.labelDefaults }, 'Label defaults updated');
  } catch (err) { next(err); }
};

/* ── PUT /settings/notifications ─────────────────────────────────────── */
exports.updateNotifications = async (req, res, next) => {
  try {
    const updates = {};
    Object.keys(req.body).forEach((k) => {
      updates[`notifications.${k}`] = req.body[k];
    });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    success(res, { notifications: user.notifications }, 'Notification preferences updated');
  } catch (err) { next(err); }
};

/* ── GET /settings/couriers ──────────────────────────────────────────── */
exports.getCouriers = async (req, res, next) => {
  try {
    const couriers = await Courier.find({ userId: req.user._id }).sort({ name: 1 });
    success(res, { couriers: couriers.map((c) => c.toSafeObject()) });
  } catch (err) { next(err); }
};

/* ── POST /settings/couriers ─────────────────────────────────────────── */
exports.addCourier = async (req, res, next) => {
  try {
    const { name, slug, apiKey, apiSecret, settings, notes } = req.body;

    const existing = await Courier.findOne({ userId: req.user._id, slug });
    if (existing) return next(AppError.conflict(`A ${slug} courier configuration already exists`));

    const courier = new Courier({ userId: req.user._id, name, slug, settings, notes });
    if (apiKey)    courier.apiKey    = apiKey;
    if (apiSecret) courier.apiSecret = apiSecret;
    await courier.save();

    created(res, { courier: courier.toSafeObject() }, 'Courier added');
  } catch (err) { next(err); }
};

/* ── PUT /settings/couriers/:id ──────────────────────────────────────── */
exports.updateCourier = async (req, res, next) => {
  try {
    const courier = await Courier.findOne({ _id: req.params.id, userId: req.user._id });
    if (!courier) return next(AppError.notFound('Courier not found'));

    const { name, apiKey, apiSecret, isActive, settings, notes } = req.body;
    if (name     !== undefined) courier.name     = name;
    if (isActive !== undefined) courier.isActive = isActive;
    if (settings !== undefined) courier.settings = { ...courier.settings, ...settings };
    if (notes    !== undefined) courier.notes    = notes;
    if (apiKey)    courier.apiKey    = apiKey;
    if (apiSecret) courier.apiSecret = apiSecret;
    await courier.save();

    success(res, { courier: courier.toSafeObject() }, 'Courier updated');
  } catch (err) { next(err); }
};

/* ── DELETE /settings/couriers/:id ──────────────────────────────────── */
exports.removeCourier = async (req, res, next) => {
  try {
    const courier = await Courier.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!courier) return next(AppError.notFound('Courier not found'));
    noContent(res);
  } catch (err) { next(err); }
};
