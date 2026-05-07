const { v4: uuidv4 }   = require('uuid');
const fs               = require('fs');
const Order            = require('../models/Order.model');
const Label            = require('../models/Label.model');
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

/* ── POST /orders/:id/accept  (accept order + auto-generate label) ─── */
exports.acceptOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return next(AppError.notFound('Order not found'));
    if (order.status !== 'pending') {
      return next(AppError.badRequest('Only pending orders can be accepted'));
    }

    // Create label job record
    const labelJob = await Label.create({
      userId:     req.user._id,
      orderIds:   [order._id],
      splitType:  'order',
      status:     'processing',
      labelCount: 1,
    });

    // Update order: status → label_generated, link label
    order.status  = 'label_generated';
    order.labelId = labelJob._id;
    await order.save();

    // Respond immediately — label generation is async
    created(res, { orderId: order._id, labelId: labelJob._id }, 'Order accepted — label generating');

    // Background: call Amazon MFN API — Amazon provides the shipping label
    setImmediate(async () => {
      try {
        const orderObj  = order.toObject();
        const jobId     = labelJob._id.toString();
        const filename  = `label_${orderObj.orderId || jobId}.pdf`;

        /* ── Amazon: use Merchant Fulfillment API — Amazon provides the label ── */
        const amazonSvc   = require('../services/amazon.service');
        const platformDoc = await Platform
          .findOne({ userId: req.user._id, platformName: 'amazon' })
          .select('+_accessToken +_refreshToken');

        if (!platformDoc || !platformDoc.isConnected) {
          throw new Error('Amazon account is not connected. Connect your Amazon seller account first.');
        }

        // 1. Get eligible shipping services from Amazon
        const services  = await amazonSvc.getEligibleShippingServices(platformDoc, orderObj);
        const serviceId = services[0]?.ShippingServiceId;
        if (!serviceId) throw new Error('No eligible shipping services available for this order on Amazon');

        // 2. Create MFN shipment — Amazon returns the AWB + label PDF
        const shipment = await amazonSvc.createMFNShipment(platformDoc, orderObj, serviceId);
        if (!shipment.labelBuffer) throw new Error('Amazon did not return a shipping label for this order');

        const pdfBuffer = shipment.labelBuffer;
        const awb       = shipment.awb;

        // 3. Save AWB + shipmentId on the order
        await Order.findByIdAndUpdate(order._id, {
          awb,
          shipmentId:     shipment.shipmentId || null,
          courierPartner: 'other',
          platformStatus: 'Shipped',
        });

        /* ── Save the label Amazon gave us to disk ─────────────────── */
        const path = require('path');
        const fsp  = require('fs/promises');
        const outDir = path.join(process.cwd(), 'uploads', 'output', jobId);
        await fsp.mkdir(outDir, { recursive: true });
        await fsp.writeFile(path.join(outDir, filename), pdfBuffer);

        await Label.findByIdAndUpdate(labelJob._id, {
          status:      'ready',
          pageCount:   1,
          files: [{
            name:      filename,
            url:       `/uploads/output/${jobId}/${encodeURIComponent(filename)}`,
            pageCount: 1,
            orders:    [orderObj._id],
            key:       filename,
          }],
          generatedAt: new Date(),
        });

        logger.info(`[accept] Amazon label ready — order ${orderObj.orderId}, AWB: ${awb}`);
      } catch (err) {
        logger.error(`[accept] label ${labelJob._id} failed:`, err.message);
        await Label.findByIdAndUpdate(labelJob._id, { status: 'failed', error: err.message });
      }
    });
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

/* ── POST /orders/:id/reject  (cancel/reject an order) ──────────────────
   Amazon workflow:
     1. If a MFN shipment was already created → cancel it first
     2. Notify Amazon the order is cancelled (cancel reason code)
     3. Mark the local label as failed (if one exists)
     4. Set order status → 'cancelled'
   Allowed from statuses: pending, label_generated
   Not allowed once shipped — must use the Returns flow instead.
────────────────────────────────────────────────────────────────────────── */

const VALID_CANCEL_REASONS = new Set([
  'NO_INVENTORY',
  'PRICE_ERROR',
  'SELLER_CANCEL',
  'CUSTOMER_CANCEL',
]);

exports.rejectOrder = async (req, res, next) => {
  try {
    const { reason = 'SELLER_CANCEL', reasonText } = req.body;

    if (!VALID_CANCEL_REASONS.has(reason)) {
      return next(AppError.badRequest(`Invalid cancellation reason. Must be one of: ${[...VALID_CANCEL_REASONS].join(', ')}`));
    }

    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return next(AppError.notFound('Order not found'));

    if (!['pending', 'label_generated'].includes(order.status)) {
      return next(AppError.badRequest(
        `Cannot cancel an order with status '${order.status}'. Only pending or label_generated orders can be cancelled.`
      ));
    }

    /* ── Amazon: cancel shipment + order on platform side ─────────────── */
    if (order.platform === 'amazon') {
      try {
        const amazonSvc   = require('../services/amazon.service');
        const platformDoc = await Platform
          .findOne({ userId: req.user._id, platformName: 'amazon' })
          .select('+_accessToken +_refreshToken');

        if (platformDoc && platformDoc.isConnected) {
          // Step 1: cancel the MFN shipment if one was created
          if (order.shipmentId) {
            await amazonSvc.cancelMFNShipment(platformDoc, order.shipmentId);
            logger.info(`[reject] MFN shipment ${order.shipmentId} cancelled for order ${order.orderId}`);
          }

          // Step 2: tell Amazon the order is cancelled
          await amazonSvc.cancelAmazonOrder(platformDoc, order.orderId, reason);
          logger.info(`[reject] Amazon order ${order.orderId} cancelled, reason: ${reason}`);
        }
      } catch (amazonErr) {
        // Log but don't block — cancel locally even if platform API fails
        logger.warn(`[reject] Amazon API cancel failed (${amazonErr.message}) — proceeding with local cancellation`);
      }
    }

    /* ── Cancel the label job if one exists ───────────────────────────── */
    if (order.labelId) {
      await Label.findByIdAndUpdate(order.labelId, {
        status: 'failed',
        error:  `Order cancelled by seller — ${reasonText || reason}`,
      });
    }

    /* ── Update order ─────────────────────────────────────────────────── */
    order.status                 = 'cancelled';
    order.cancelledAt            = new Date();
    order.platformStatus         = 'Cancelled';
    order.cancellationReason     = reason;
    order.cancellationReasonText = reasonText || '';
    await order.save();

    success(res, {
      orderId:  order._id,
      status:   'cancelled',
      reason,
    }, 'Order cancelled successfully');
  } catch (err) { next(err); }
};
