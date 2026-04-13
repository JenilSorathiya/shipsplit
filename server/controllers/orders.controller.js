const { v4: uuidv4 }   = require('uuid');
const fs               = require('fs');
const Order            = require('../models/Order.model');
const Platform         = require('../models/Platform.model');
const AppError         = require('../utils/AppError');
const { success, created, noContent, paginated } = require('../utils/response');
const { parsePlatformCSV } = require('../services/csv.service');
const logger           = require('../utils/logger');

const PLATFORM_SERVICES = {
  amazon:   () => require('../services/amazon.service'),
  flipkart: () => require('../services/flipkart.service'),
  meesho:   () => require('../services/meesho.service'),
  myntra:   () => require('../services/myntra.service'),
};

/* ── GET /orders ─────────────────────────────────────────────────────── */
exports.getOrders = async (req, res, next) => {
  try {
    const { page, limit, platform, status, courierPartner, search, dateFrom, dateTo, sortBy, sortOrder } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (platform)       filter.platform       = platform;
    if (status)         filter.status         = status;
    if (courierPartner) filter.courierPartner = courierPartner;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }
    if (search) {
      filter.$or = [
        { orderId:    { $regex: search, $options: 'i' } },
        { awb:        { $regex: search, $options: 'i' } },
        { buyerName:  { $regex: search, $options: 'i' } },
        { productName:{ $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    paginated(res, orders, { page, limit, total });
  } catch (err) { next(err); }
};

/* ── GET /orders/:id ─────────────────────────────────────────────────── */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return next(AppError.notFound('Order not found'));
    success(res, { order });
  } catch (err) { next(err); }
};

/* ── POST /orders/upload  (CSV) ──────────────────────────────────────── */
exports.uploadOrders = async (req, res, next) => {
  try {
    if (!req.file) return next(AppError.badRequest('CSV file is required'));
    const { platform } = req.body;

    const csvText = fs.readFileSync(req.file.path, 'utf8');
    fs.unlink(req.file.path, () => {});

    const rows = parsePlatformCSV(csvText, platform);
    if (!rows.length) return next(AppError.badRequest('No valid orders found in CSV'));

    const batchId = uuidv4();
    let imported  = 0;
    let skipped   = 0;

    for (const row of rows) {
      try {
        const result = await Order.findOneAndUpdate(
          { userId: req.user._id, platform, orderId: row.orderId },
          { $setOnInsert: { ...row, userId: req.user._id, platform, importBatchId: batchId } },
          { upsert: true, new: false }
        );
        if (!result) imported++;
        else         skipped++;
      } catch (e) {
        if (e.code === 11000) skipped++;
        else logger.warn('Order insert error:', e.message);
      }
    }

    created(res, { imported, skipped, batchId }, `Imported ${imported} orders (${skipped} duplicates skipped)`);
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

/* ── DELETE /orders/:id ──────────────────────────────────────────────── */
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!order) return next(AppError.notFound('Order not found'));
    noContent(res);
  } catch (err) { next(err); }
};

/* ── PATCH /orders/:id ───────────────────────────────────────────────── */
exports.updateOrder = async (req, res, next) => {
  try {
    const allowed = ['status', 'courierPartner', 'awb', 'trackingUrl'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!order) return next(AppError.notFound('Order not found'));
    success(res, { order }, 'Order updated');
  } catch (err) { next(err); }
};

/* ── POST /orders/:id/assign-courier ────────────────────────────────── */
exports.assignCourier = async (req, res, next) => {
  try {
    const { courierPartner, awb, trackingUrl } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { courierPartner, ...(awb && { awb }), ...(trackingUrl && { trackingUrl }) },
      { new: true }
    );
    if (!order) return next(AppError.notFound('Order not found'));
    success(res, { order }, 'Courier assigned');
  } catch (err) { next(err); }
};

/* ── POST /orders/bulk-assign-courier ───────────────────────────────── */
exports.bulkAssignCourier = async (req, res, next) => {
  try {
    const { orderIds, courierPartner } = req.body;
    const result = await Order.updateMany(
      { _id: { $in: orderIds }, userId: req.user._id },
      { courierPartner }
    );
    success(res, { updated: result.modifiedCount }, `Courier assigned to ${result.modifiedCount} orders`);
  } catch (err) { next(err); }
};

/* ── POST /orders/sync  (pull from platform API) ────────────────────── */
exports.syncOrders = async (req, res, next) => {
  try {
    const { platform } = req.body;
    if (!platform) return next(AppError.badRequest('platform is required'));

    const platformDoc = await Platform.findOne({ userId: req.user._id, platformName: platform })
      .select('+_accessToken +_refreshToken');
    if (!platformDoc || !platformDoc.isConnected) {
      return next(AppError.badRequest(`${platform} is not connected`));
    }

    const svc = PLATFORM_SERVICES[platform]?.();
    if (!svc) return next(AppError.badRequest('Unsupported platform'));

    // Refresh token if expired
    if (platformDoc.tokenExpiresAt && platformDoc.tokenExpiresAt < new Date()) {
      try {
        const refreshed = await svc.refreshAccessToken(platformDoc);
        platformDoc.accessToken    = refreshed.accessToken;
        platformDoc.tokenExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
        await platformDoc.save();
      } catch (e) {
        logger.warn(`Token refresh failed for ${platform}:`, e.message);
      }
    }

    const syncFromDate = new Date(Date.now() - (platformDoc.settings?.syncFromDaysAgo || 7) * 86400 * 1000);
    let   nextToken    = null;
    let   imported     = 0;
    let   skipped      = 0;

    do {
      const { orders, nextToken: nt } = await svc.fetchOrders(platformDoc, {
        createdAfter: syncFromDate.toISOString(),
        ...(nextToken && { nextToken }),
      });

      for (const row of orders) {
        try {
          const result = await Order.findOneAndUpdate(
            { userId: req.user._id, platform, orderId: row.orderId },
            { $setOnInsert: { ...row, userId: req.user._id, syncedAt: new Date() } },
            { upsert: true, new: false }
          );
          if (!result) imported++;
          else         skipped++;
        } catch (e) {
          if (e.code !== 11000) logger.warn('Sync order insert error:', e.message);
          skipped++;
        }
      }

      nextToken = nt;
    } while (nextToken);

    platformDoc.lastSyncAt     = new Date();
    platformDoc.lastSyncStatus = 'success';
    platformDoc.totalOrdersSynced += imported;
    await platformDoc.save();

    success(res, { imported, skipped }, `Synced ${imported} new orders from ${platform}`);
  } catch (err) { next(err); }
};
