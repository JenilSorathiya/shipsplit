const Return   = require('../models/Return.model');
const Order    = require('../models/Order.model');
const AppError = require('../utils/AppError');
const { success, paginated } = require('../utils/response');
const logger   = require('../utils/logger');

/* ── GET /api/returns ────────────────────────────────────────────────── */
exports.getReturns = async (req, res, next) => {
  try {
    const {
      platform,
      returnType,
      status,
      startDate,
      endDate,
      search,
      page  = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const filter = { userId: req.user._id };
    if (platform)   filter.platform   = platform;
    if (returnType) filter.returnType = returnType;
    if (status)     filter.status     = status;

    if (startDate || endDate) {
      filter.returnCreatedAt = {};
      if (startDate) filter.returnCreatedAt.$gte = new Date(startDate);
      if (endDate)   filter.returnCreatedAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { orderId:         { $regex: search, $options: 'i' } },
        { returnId:        { $regex: search, $options: 'i' } },
        { returnAWB:       { $regex: search, $options: 'i' } },
        { platformReturnId:{ $regex: search, $options: 'i' } },
      ];
    }

    const [returns, total] = await Promise.all([
      Return.find(filter)
        .sort({ returnCreatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Return.countDocuments(filter),
    ]);

    paginated(res, returns, { page: Number(page), limit: Number(limit), total });
  } catch (err) { next(err); }
};

/* ── GET /api/returns/stats ──────────────────────────────────────────── */
exports.getReturnStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      total,
      rto,
      cto,
      received,
      pendingRefund,
      refundAgg,
    ] = await Promise.all([
      Return.countDocuments({ userId }),
      Return.countDocuments({ userId, returnType: 'RTO' }),
      Return.countDocuments({ userId, returnType: 'CTO' }),
      Return.countDocuments({ userId, status: 'received' }),
      Return.countDocuments({ userId, status: { $in: ['initiated', 'in_transit', 'received'] } }),
      Return.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalRefundAmount: { $sum: '$refundAmount' } } },
      ]),
    ]);

    const totalRefundAmount = refundAgg[0]?.totalRefundAmount || 0;

    success(res, {
      total,
      rto,
      cto,
      received,
      pendingRefund,
      totalRefundAmount,
    });
  } catch (err) { next(err); }
};

/* ── PATCH /api/returns/:id ──────────────────────────────────────────── */
exports.updateReturn = async (req, res, next) => {
  try {
    const allowed = ['status', 'notes', 'returnAWB', 'refundAmount'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (!Object.keys(updates).length) {
      return next(AppError.badRequest('No valid fields provided for update'));
    }

    const ret = await Return.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!ret) return next(AppError.notFound('Return'));

    success(res, { return: ret }, 'Return updated');
  } catch (err) { next(err); }
};

/* ── POST /api/returns/sync ──────────────────────────────────────────── */
exports.syncReturns = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find orders that are in a returned/cancelled state that likely represent returns
    const RETURN_PLATFORM_STATUSES = [
      'ReturnedToSeller',
      'Returned',
      'Cancelled',
      'ReturnPickedUp',
      'ReturnDelivered',
      'RETURN_INITIATED',
      'RETURN_PICKED',
      'RETURN_DELIVERED',
    ];

    const returnOrders = await Order.find({
      userId,
      $or: [
        { status: 'returned' },
        { platformStatus: { $in: RETURN_PLATFORM_STATUSES } },
      ],
    }).lean();

    if (!returnOrders.length) {
      return success(res, { created: 0, skipped: 0 }, 'No return orders found to sync');
    }

    // Collect existing return orderId+platform combos for this user to avoid duplicates
    const existing = await Return.find({ userId }).select('orderId platform').lean();
    const existingSet = new Set(existing.map((r) => `${r.platform}::${r.orderId}`));

    let created = 0;
    let skipped  = 0;

    for (const order of returnOrders) {
      const key = `${order.platform}::${order.orderId}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      // Determine return type: RTO = courier-initiated (platformStatus), CTO = customer-initiated (order status)
      const isCTO = order.status === 'returned' &&
        !RETURN_PLATFORM_STATUSES.includes(order.platformStatus);
      const returnType = isCTO ? 'CTO' : 'RTO';

      try {
        const returnItems = order.items?.length
          ? order.items.map((item) => ({
              sku:      item.sku  || order.sku  || '',
              name:     item.name || order.productName || '',
              quantity: item.quantity || order.quantity || 1,
              price:    item.price || 0,
            }))
          : [{
              sku:      order.sku         || '',
              name:     order.productName || '',
              quantity: order.quantity    || 1,
              price:    0,
            }];

        await Return.create({
          userId,
          platform:         order.platform,
          orderId:          order.orderId,
          returnType,
          status:           'initiated',
          returnReason:     order.platformStatus || '',
          items:            returnItems,
          courierPartner:   order.courierPartner || '',
          returnAWB:        order.awb            || '',
          returnCreatedAt:  order.returnedAt     || order.cancelledAt || order.updatedAt,
          syncedAt:         new Date(),
        });

        existingSet.add(key);
        created++;
      } catch (e) {
        if (e.code === 11000) skipped++;
        else logger.warn('Return sync insert error:', e.message);
      }
    }

    success(res, { created, skipped }, `Synced ${created} new return(s) (${skipped} already existed)`);
  } catch (err) { next(err); }
};
