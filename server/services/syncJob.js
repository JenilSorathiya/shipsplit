'use strict';

/**
 * Background sync job — auto-syncs Amazon orders for all users
 * who have autoSync enabled on their Platform connection.
 *
 * Runs every 30 minutes. First run is 5 minutes after server startup
 * to give MongoDB time to fully settle.
 */

const logger = require('../utils/logger');

const INTERVAL_MS      = 30 * 60 * 1000;  // 30 minutes
const STARTUP_DELAY_MS =  5 * 60 * 1000;  // wait 5 min before first run

async function runAutoSync() {
  // Lazy-require models to avoid circular dependency issues at startup
  const Platform    = require('../models/Platform.model');
  const { syncUserOrders } = require('./amazon.service');

  let platforms;
  try {
    platforms = await Platform.find({
      platformName:        'amazon',
      isConnected:         true,
      'settings.autoSync': true,
    }).select('userId settings').lean();
  } catch (err) {
    logger.error('syncJob: failed to query platforms:', err.message);
    return;
  }

  if (!platforms.length) return;
  logger.info(`syncJob: auto-sync triggered for ${platforms.length} Amazon account(s)`);

  for (const p of platforms) {
    try {
      const result = await syncUserOrders(p.userId, {
        daysAgo: p.settings?.syncFromDaysAgo || 7,
      });
      logger.info(`syncJob: user ${p.userId} — ${result.imported} new, ${result.updated} updated, ${result.errors} errors`);
    } catch (err) {
      logger.error(`syncJob: user ${p.userId} failed — ${err.message}`);
    }
  }
}

exports.start = function startSyncJob() {
  logger.info(`syncJob: Amazon auto-sync scheduled (first run in 5 min, then every 30 min)`);

  setTimeout(() => {
    runAutoSync();
    setInterval(runAutoSync, INTERVAL_MS);
  }, STARTUP_DELAY_MS);
};
