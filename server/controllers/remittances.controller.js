const { addDays, startOfDay, endOfDay, format } = require('date-fns');
const Remittance = require('../models/Remittance.model');
const Order      = require('../models/Order.model');
const AppError   = require('../utils/AppError');
const { success, paginated } = require('../utils/response');

/* ── GET /api/remittances ─────────────────────────────────────────────── */
exports.getRemittances = async (req, res, next) => {
  try {
    const {
      status,
      platform,
      startDate,
      endDate,
      page  = 1,
      limit = 20,
    } = req.query;

    const skip   = (Number(page) - 1) * Number(limit);
    const filter = { userId: req.user._id };

    if (status)   filter.status   = status;
    if (platform) filter.platform = platform;

    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = startOfDay(new Date(startDate));
      if (endDate)   filter.scheduledDate.$lte = endOfDay(new Date(endDate));
    }

    const [remittances, total] = await Promise.all([
      Remittance.find(filter)
        .sort({ scheduledDate: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Remittance.countDocuments(filter),
    ]);

    paginated(res, remittances, { page: Number(page), limit: Number(limit), total });
  } catch (err) { next(err); }
};

/* ── GET /api/remittances/stats ───────────────────────────────────────── */
exports.getRemittanceStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now    = new Date();

    const todayStart    = startOfDay(now);
    const todayEnd      = endOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd   = endOfDay(addDays(now, 1));
    const weekEnd       = endOfDay(addDays(now, 7));

    /* ── Aggregate buckets in a single pass ─────────────────────────── */
    const [buckets, totalPaidAgg, upcomingDays] = await Promise.all([
      /* today / tomorrow / thisWeek / pending in one aggregate */
      Remittance.aggregate([
        { $match: { userId } },
        {
          $facet: {
            today: [
              {
                $match: {
                  status:        { $in: ['pending', 'processing'] },
                  scheduledDate: { $gte: todayStart, $lte: todayEnd },
                },
              },
              {
                $group: {
                  _id:    null,
                  count:  { $sum: 1 },
                  amount: { $sum: '$amount' },
                },
              },
            ],
            tomorrow: [
              {
                $match: {
                  status:        { $in: ['pending', 'processing'] },
                  scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
                },
              },
              {
                $group: {
                  _id:    null,
                  count:  { $sum: 1 },
                  amount: { $sum: '$amount' },
                },
              },
            ],
            thisWeek: [
              {
                $match: {
                  status:        { $in: ['pending', 'processing'] },
                  scheduledDate: { $gte: todayStart, $lte: weekEnd },
                },
              },
              {
                $group: {
                  _id:    null,
                  count:  { $sum: 1 },
                  amount: { $sum: '$amount' },
                },
              },
            ],
            pending: [
              {
                $match: { status: { $in: ['pending', 'processing'] } },
              },
              {
                $group: {
                  _id:    null,
                  count:  { $sum: 1 },
                  amount: { $sum: '$amount' },
                },
              },
            ],
          },
        },
      ]),

      /* all-time paid */
      Remittance.aggregate([
        { $match: { userId, status: 'paid' } },
        {
          $group: {
            _id:    null,
            count:  { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),

      /* next 7 days grouped by date */
      Remittance.aggregate([
        {
          $match: {
            userId,
            status:        { $in: ['pending', 'processing'] },
            scheduledDate: { $gte: todayStart, $lte: weekEnd },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$scheduledDate' },
            },
            amount:       { $sum: '$amount' },
            count:        { $sum: 1 },
            remittances:  { $push: '$$ROOT' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date:         '$_id',
            amount:       1,
            count:        1,
            remittances:  1,
            _id:          0,
          },
        },
      ]),
    ]);

    const extract = (arr) => arr[0] ? { count: arr[0].count, amount: arr[0].amount } : { count: 0, amount: 0 };
    const fac     = buckets[0];

    success(res, {
      today:      extract(fac.today),
      tomorrow:   extract(fac.tomorrow),
      thisWeek:   extract(fac.thisWeek),
      pending:    extract(fac.pending),
      totalPaid:  extract(totalPaidAgg),
      upcoming:   upcomingDays,
    });
  } catch (err) { next(err); }
};

/* ── POST /api/remittances/sync ───────────────────────────────────────── */
exports.syncRemittances = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now    = new Date();

    /* Find all COD orders that are shipped or delivered */
    const codOrders = await Order.find({
      userId,
      isCOD:  true,
      status: { $in: ['shipped', 'delivered'] },
    }).lean();

    if (!codOrders.length) {
      return success(res, { created: 0, updated: 0 }, 'No COD orders found to sync');
    }

    /* Group orders by platform + scheduledDate (day-level key) */
    const groups = {};

    for (const order of codOrders) {
      let scheduledDate;

      if (order.deliveredAt) {
        scheduledDate = addDays(new Date(order.deliveredAt), 7);
      } else if (order.shippedAt) {
        scheduledDate = addDays(new Date(order.shippedAt), 10);
      } else {
        /* No usable date — skip */
        continue;
      }

      const dayKey      = format(scheduledDate, 'yyyy-MM-dd');
      const groupKey    = `${order.platform}::${dayKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          platform:      order.platform,
          scheduledDate: startOfDay(scheduledDate),
          orderIds:      [],
          amount:        0,
        };
      }

      groups[groupKey].orderIds.push(order.orderId);
      groups[groupKey].amount += order.codAmount || order.orderValue || 0;
    }

    let created = 0;
    let updated = 0;

    for (const group of Object.values(groups)) {
      /* Determine status: if scheduledDate already passed, mark paid */
      const isPast  = group.scheduledDate < startOfDay(now);
      const status  = isPast ? 'paid' : 'pending';
      const paidDate = isPast ? group.scheduledDate : undefined;

      /* Use a deterministic synthetic remittanceId based on platform + date */
      const syntheticId = `${group.platform}-${format(group.scheduledDate, 'yyyy-MM-dd')}`;

      const update = {
        $set: {
          platform:      group.platform,
          type:          'COD',
          amount:        group.amount,
          scheduledDate: group.scheduledDate,
          orderIds:      group.orderIds,
          orderCount:    group.orderIds.length,
          syncedAt:      now,
          ...(paidDate && status === 'paid' ? { paidDate } : {}),
        },
        /* Only set status to paid if it was previously pending/processing.
           Never downgrade an already-paid remittance back to pending.      */
        $min: isPast ? {} : {},
      };

      /* Conditionally push status to 'paid' when scheduledDate has passed */
      if (isPast) {
        update.$set.status = 'paid';
      } else {
        /* Only set to pending if not already in a terminal/processing state */
        update.$setOnInsert = { status: 'pending' };
      }

      const result = await Remittance.findOneAndUpdate(
        { userId, platform: group.platform, remittanceId: syntheticId },
        { ...update, $setOnInsert: { ...update.$setOnInsert, userId, remittanceId: syntheticId } },
        { upsert: true, new: false }
      );

      if (!result) created++;
      else         updated++;
    }

    success(res, { created, updated, groups: Object.keys(groups).length },
      `Sync complete: ${created} created, ${updated} updated`);
  } catch (err) { next(err); }
};

/* ── GET /api/remittances/calendar ────────────────────────────────────── */
exports.getUpcomingCalendar = async (req, res, next) => {
  try {
    const userId   = req.user._id;
    const now      = new Date();
    const rangeEnd = endOfDay(addDays(now, 30));

    const raw = await Remittance.aggregate([
      {
        $match: {
          userId,
          status:        { $in: ['pending', 'processing'] },
          scheduledDate: { $gte: startOfDay(now), $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$scheduledDate' },
          },
          amount: { $sum: '$amount' },
          count:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date:   '$_id',
          amount: 1,
          count:  1,
          _id:    0,
        },
      },
    ]);

    /* Build a full 30-day skeleton so days without remittances are present */
    const calendarMap = {};
    for (let i = 0; i <= 30; i++) {
      const d = format(addDays(now, i), 'yyyy-MM-dd');
      calendarMap[d] = { date: d, amount: 0, count: 0 };
    }
    raw.forEach(({ date, amount, count }) => {
      if (calendarMap[date]) {
        calendarMap[date].amount = amount;
        calendarMap[date].count  = count;
      }
    });

    success(res, { calendar: Object.values(calendarMap) });
  } catch (err) { next(err); }
};
