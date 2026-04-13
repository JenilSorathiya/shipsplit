const { subDays, startOfDay, format } = require('date-fns');
const Order   = require('../models/Order.model');
const Label   = require('../models/Label.model');
const { success } = require('../utils/response');

const rangeToWindow = (range) => {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  return { days, from: startOfDay(subDays(new Date(), days)) };
};

/* ── GET /reports/dashboard ──────────────────────────────────────────── */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId       = req.user._id;
    const { from }     = rangeToWindow('30d');
    const todayStart   = startOfDay(new Date());

    const [totalOrders, totalLabels, shippedToday, pendingLabels, platformBreakdown] = await Promise.all([
      Order.countDocuments({ userId }),
      Label.countDocuments({ userId }),
      Order.countDocuments({ userId, status: 'shipped', shippedAt: { $gte: todayStart } }),
      Order.countDocuments({ userId, status: 'pending' }),
      Order.aggregate([
        { $match: { userId, createdAt: { $gte: from } } },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
        { $project: { platform: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    success(res, {
      totalOrders,
      totalLabels,
      shippedToday,
      pendingLabels,
      platformBreakdown,
    });
  } catch (err) { next(err); }
};

/* ── GET /reports/summary ────────────────────────────────────────────── */
exports.getSummary = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { days, from }    = rangeToWindow(range);
    const userId            = req.user._id;

    const [totalOrders, labelsPrinted, returnedOrders, platformData] = await Promise.all([
      Order.countDocuments({ userId, createdAt: { $gte: from } }),
      Label.countDocuments({ userId, status: 'downloaded', createdAt: { $gte: from } }),
      Order.countDocuments({ userId, status: 'returned', createdAt: { $gte: from } }),
      Order.aggregate([
        { $match: { userId, createdAt: { $gte: from } } },
        {
          $group: {
            _id:     '$platform',
            orders:  { $sum: 1 },
            returns: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
          },
        },
        { $project: { platform: '$_id', orders: 1, returns: 1, _id: 0 } },
      ]),
    ]);

    success(res, {
      totalOrders,
      labelsPrinted,
      returnRate:     totalOrders ? ((returnedOrders / totalOrders) * 100).toFixed(1) : '0.0',
      avgDailyOrders: (totalOrders / days).toFixed(0),
      platforms:      platformData.map((p) => ({
        ...p,
        labels:     p.orders,
        returnRate: p.orders ? ((p.returns / p.orders) * 100).toFixed(1) : '0.0',
      })),
    });
  } catch (err) { next(err); }
};

/* ── GET /reports/orders-by-day ──────────────────────────────────────── */
exports.getOrdersByDay = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { days, from }    = rangeToWindow(range);
    const userId            = req.user._id;

    const raw = await Order.aggregate([
      { $match: { userId, createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            date:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            platform: '$platform',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const map = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      map[d]  = { date: d, amazon: 0, flipkart: 0, meesho: 0, myntra: 0 };
    }
    raw.forEach(({ _id, count }) => {
      if (map[_id.date]) map[_id.date][_id.platform] = count;
    });

    success(res, { data: Object.values(map) });
  } catch (err) { next(err); }
};

/* ── GET /reports/courier-breakdown ─────────────────────────────────── */
exports.getCourierBreakdown = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { from }          = rangeToWindow(range);
    const userId            = req.user._id;

    const data = await Order.aggregate([
      { $match: { userId, courierPartner: { $ne: null }, createdAt: { $gte: from } } },
      {
        $group: {
          _id:       '$courierPartner',
          total:     { $sum: 1 },
          shipped:   { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          returned:  { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
        },
      },
      { $project: { courier: '$_id', total: 1, shipped: 1, delivered: 1, returned: 1, _id: 0 } },
      { $sort: { total: -1 } },
    ]);

    success(res, { data });
  } catch (err) { next(err); }
};

/* ── GET /reports/sku-breakdown ──────────────────────────────────────── */
exports.getSkuBreakdown = async (req, res, next) => {
  try {
    const { range = '30d', limit = 20 } = req.query;
    const { from }                      = rangeToWindow(range);
    const userId                        = req.user._id;

    const data = await Order.aggregate([
      { $match: { userId, sku: { $ne: null, $ne: '' }, createdAt: { $gte: from } } },
      {
        $group: {
          _id:          '$sku',
          productName:  { $first: '$productName' },
          orders:       { $sum: 1 },
          totalQty:     { $sum: '$quantity' },
          platforms:    { $addToSet: '$platform' },
        },
      },
      { $project: { sku: '$_id', productName: 1, orders: 1, totalQty: 1, platforms: 1, _id: 0 } },
      { $sort: { orders: -1 } },
      { $limit: parseInt(limit) },
    ]);

    success(res, { data });
  } catch (err) { next(err); }
};

/* ── GET /reports/export.csv ─────────────────────────────────────────── */
exports.exportCsv = async (req, res, next) => {
  try {
    const { range = '30d', platform, status } = req.query;
    const { from }  = rangeToWindow(range);
    const userId    = req.user._id;

    const filter = { userId, createdAt: { $gte: from } };
    if (platform) filter.platform = platform;
    if (status)   filter.status   = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const header = 'Order ID,Platform,Status,Courier,AWB,Product,SKU,Qty,Buyer,City,Pincode,Order Value,COD,Created\n';
    const rows   = orders.map((o) => [
      o.orderId, o.platform, o.status, o.courierPartner || '',
      o.awb || '', `"${(o.productName || '').replace(/"/g, '""')}"`,
      o.sku || '', o.quantity || 1, `"${(o.buyerName || '').replace(/"/g, '""')}"`,
      o.address?.city || '', o.address?.pincode || '',
      o.orderValue || 0, o.isCOD ? 'Yes' : 'No',
      o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '',
    ].join(',')).join('\n');

    res.set({
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="shipsplit-orders-${Date.now()}.csv"`,
    });
    res.send(header + rows);
  } catch (err) { next(err); }
};
