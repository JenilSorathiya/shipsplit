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

/* ── DELETE /orders  (delete ALL orders for this user) ───────────────── */
exports.deleteAllOrders = async (req, res, next) => {
  try {
    const result = await Order.deleteMany({ userId: req.user._id });
    success(res, { deleted: result.deletedCount }, `Deleted ${result.deletedCount} orders`);
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

/* ── POST /orders/:id/accept  (accept order — synchronous, no label storage) ─────
   Amazon Data Protection Policy: shipping labels contain buyer PII and MUST NOT
   be cached or stored on the server.  We call Amazon MFN, save only the AWB +
   shipmentId to the Order record, then discard the label buffer.  The browser
   fetches a fresh copy on demand via GET /orders/:id/label.
───────────────────────────────────────────────────────────────────────────────── */
exports.acceptOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return next(AppError.notFound('Order not found'));
    if (order.status !== 'pending') {
      return next(AppError.badRequest('Only pending orders can be accepted'));
    }

    const isSandbox = process.env.AMAZON_SANDBOX === 'true';
    const amazonSvc = require('../services/amazon.service');

    // Production: require a connected platform doc
    let platformDoc = null;
    if (!isSandbox) {
      platformDoc = await Platform
        .findOne({ userId: req.user._id, platformName: 'amazon', isConnected: true })
        .select('+_accessToken +_refreshToken');
      if (!platformDoc) {
        return next(AppError.badRequest(
          'Amazon account is not connected. Go to Settings → Platforms to connect.'
        ));
      }
    }

    // 1. Get eligible shipping services
    const services  = await amazonSvc.getEligibleShippingServices(platformDoc, order.toObject());
    const serviceId = services[0]?.ShippingServiceId;
    if (!serviceId) {
      return next(AppError.badRequest('No eligible shipping services available for this order'));
    }

    // 2. Create MFN shipment — Amazon returns AWB + label buffer.
    //    We DISCARD the buffer immediately; only AWB + shipmentId are persisted.
    const shipment = await amazonSvc.createMFNShipment(platformDoc, order.toObject(), serviceId);
    if (!shipment.awb) {
      return next(AppError.badRequest('Amazon did not return a shipment AWB'));
    }

    // 3. Persist only the identifiers — never the label PDF (Amazon DPP compliance)
    order.status         = 'label_generated';
    order.awb            = shipment.awb;
    order.shipmentId     = shipment.shipmentId || null;
    order.courierPartner = 'other';
    order.platformStatus = 'Shipped';
    await order.save();

    logger.info(`[acceptOrder] shipment created — order ${order.orderId}, AWB: ${shipment.awb}`);
    success(res, {
      orderId:    order._id,
      awb:        shipment.awb,
      shipmentId: shipment.shipmentId,
    }, 'Order accepted — label ready to download');
  } catch (err) { next(err); }
};

/* ── GET /orders/:id/label  (fetch fresh label — never stored on disk) ────────
   Sandbox:    regenerate label PDF from order data on every request.
   Production: fetch label from Amazon MFN API (GET /mfn/v0/shipments/:id/label).
   Stream directly to the browser with Cache-Control: no-store.
   Amazon Data Protection Policy requires we never cache or persist these labels.
───────────────────────────────────────────────────────────────────────────────── */
exports.downloadOrderLabel = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return next(AppError.notFound('Order not found'));

    if (!['label_generated', 'shipped', 'delivered'].includes(order.status)) {
      return next(AppError.badRequest('No label available for this order. Accept the order first.'));
    }

    const isSandbox = process.env.AMAZON_SANDBOX === 'true';
    const amazonSvc = require('../services/amazon.service');
    let pdfBuffer;

    if (isSandbox) {
      // Sandbox: generate fresh label from stored order data every time
      pdfBuffer = await amazonSvc.generateSandboxLabelPDF(
        order.toObject(),
        order.awb || `AMZL${order._id}IN`
      );
    } else {
      if (!order.shipmentId) {
        return next(AppError.badRequest('No shipment ID on record for this order'));
      }
      const platformDoc = await Platform
        .findOne({ userId: req.user._id, platformName: 'amazon', isConnected: true })
        .select('+_accessToken +_refreshToken');
      if (!platformDoc) {
        return next(AppError.badRequest('Amazon account is not connected'));
      }
      // Fetch fresh from Amazon — returns { buffer, format, dimensions }
      const result = await amazonSvc.fetchShippingLabel(platformDoc, order.shipmentId);
      pdfBuffer = result.buffer;
    }

    if (!pdfBuffer || !pdfBuffer.length) {
      return next(AppError.badRequest('Could not retrieve label for this order'));
    }

    // Stream directly — never touch disk (Amazon DPP compliance)
    const safeId = (order.orderId || order._id.toString()).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="label_${safeId}.pdf"`,
      'Content-Length':      pdfBuffer.length,
      'Cache-Control':       'no-store, no-cache, must-revalidate',
      'Pragma':              'no-cache',
    });
    res.send(pdfBuffer);
    logger.info(`[downloadOrderLabel] streamed label — order ${order.orderId}, AWB: ${order.awb}`);
  } catch (err) { next(err); }
};

/* ── POST /orders/sync  (pull from platform API) ────────────────────── */
exports.syncOrders = async (req, res, next) => {
  try {
    const { platform, daysAgo } = req.body;
    if (!platform) return next(AppError.badRequest('platform is required'));

    /* ── Amazon: delegate to the full service sync (handles normalisation,
       token refresh, pagination, rate-limiting, upsert) ──────────────── */
    if (platform === 'amazon') {
      const amazonSvc = require('../services/amazon.service');
      const result    = await amazonSvc.syncUserOrders(req.user._id, {
        daysAgo: Number(daysAgo) || 7,
      });
      return success(res, {
        imported: result.imported,
        updated:  result.updated,
        errors:   result.errors,
      }, `Synced ${result.imported} new + ${result.updated} updated orders from Amazon`);
    }

    /* ── Other platforms (Flipkart / Meesho / Myntra) ────────────────── */
    const platformDoc = await Platform.findOne({ userId: req.user._id, platformName: platform })
      .select('+_accessToken +_refreshToken');
    if (!platformDoc || !platformDoc.isConnected) {
      return next(AppError.badRequest(`${platform} is not connected`));
    }
    const svc = PLATFORM_SERVICES[platform]?.();
    if (!svc) return next(AppError.badRequest('Unsupported platform'));

    success(res, { imported: 0, updated: 0, errors: 0 }, `${platform} sync not yet implemented`);
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
