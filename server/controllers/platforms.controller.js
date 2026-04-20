'use strict';

/**
 * Platforms controller — OAuth connect/disconnect and platform management.
 *
 * Routes:
 *   GET  /api/platforms/amazon/oauth-url  → getOAuthUrl
 *   GET  /api/platforms/amazon/callback   → handleAmazonCallback  (public — Amazon redirects here)
 *   GET  /api/platforms                   → getAllPlatforms
 *   GET  /api/platforms/:name             → getPlatform
 *   DELETE /api/platforms/:name           → disconnectPlatform
 *   POST /api/platforms/:name/sync        → syncPlatform
 *   PUT  /api/platforms/:name/settings    → updatePlatformSettings
 */

const { v4: uuidv4 } = require('uuid');
const Platform  = require('../models/Platform.model');
const AppError  = require('../utils/AppError');
const { success, noContent } = require('../utils/response');
const logger    = require('../utils/logger');
const amazonSvc = require('../services/amazon.service');

const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:3000';

/* ── GET /platforms/amazon/oauth-url ────────────────────────────────── */
exports.getOAuthUrl = async (req, res, next) => {
  try {
    const state = uuidv4();

    // Upsert Platform doc — store state so we can look it up on callback
    await Platform.findOneAndUpdate(
      { userId: req.user._id, platformName: 'amazon' },
      {
        userId:       req.user._id,
        platformName: 'amazon',
        metadata: {
          oauthState:        state,
          oauthInitiatedAt:  new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const oauthUrl = amazonSvc.buildOAuthUrl(state);
    success(res, { oauthUrl }, 'Amazon OAuth URL generated');
  } catch (err) { next(err); }
};

/* ── GET /platforms/amazon/callback  (public — Amazon redirects here) ── */
exports.handleAmazonCallback = async (req, res, next) => {
  try {
    const { spapi_oauth_code, selling_partner_id, state, error, error_description } = req.query;

    if (error) {
      logger.warn(`Amazon OAuth denied: ${error} — ${error_description}`);
      return res.redirect(`${CLIENT_URL()}/dashboard/settings?tab=platforms&error=amazon_rejected`);
    }

    if (!spapi_oauth_code || !state) {
      return res.redirect(`${CLIENT_URL()}/dashboard/settings?tab=platforms&error=missing_params`);
    }

    // Find Platform by the state token we issued
    const platform = await Platform
      .findOne({ platformName: 'amazon', 'metadata.oauthState': state })
      .select('+_accessToken +_refreshToken');

    if (!platform) {
      logger.warn(`Amazon callback: state not found or expired — ${state}`);
      return res.redirect(`${CLIENT_URL()}/dashboard/settings?tab=platforms&error=invalid_state`);
    }

    // Exchange auth code for LWA tokens
    const { accessToken, refreshToken, expiresIn } = await amazonSvc.exchangeAuthCode(spapi_oauth_code);

    // Save encrypted tokens
    platform.accessToken    = accessToken;
    platform.refreshToken   = refreshToken;
    platform.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    platform.sellerId       = selling_partner_id;
    platform.isConnected    = true;
    platform.marketplaceId  = platform.marketplaceId || 'A21TJRUUN4KGV';
    platform.lastSyncStatus = null;
    platform.lastSyncError  = null;
    // Clear one-time state
    platform.metadata = { ...platform.metadata, oauthState: null };
    await platform.save();

    logger.info(`Amazon connected — user ${platform.userId}, seller ${selling_partner_id}`);
    res.redirect(`${CLIENT_URL()}/dashboard/settings?tab=platforms&connected=amazon`);
  } catch (err) {
    logger.error('Amazon OAuth callback error:', err.message);
    res.redirect(`${CLIENT_URL()}/dashboard/settings?tab=platforms&error=oauth_failed`);
  }
};

/* ── GET /platforms ──────────────────────────────────────────────────── */
exports.getAllPlatforms = async (req, res, next) => {
  try {
    const platforms = await Platform.find({ userId: req.user._id });
    success(res, { platforms: platforms.map((p) => p.toSafeObject()) });
  } catch (err) { next(err); }
};

/* ── GET /platforms/:name ────────────────────────────────────────────── */
exports.getPlatform = async (req, res, next) => {
  try {
    const platform = await Platform.findOne({
      userId:       req.user._id,
      platformName: req.params.name,
    });
    if (!platform) return success(res, { platform: null }, 'Not connected');
    success(res, { platform: platform.toSafeObject() });
  } catch (err) { next(err); }
};

/* ── DELETE /platforms/:name ─────────────────────────────────────────── */
exports.disconnectPlatform = async (req, res, next) => {
  try {
    const platform = await Platform
      .findOne({ userId: req.user._id, platformName: req.params.name })
      .select('+_accessToken +_refreshToken +_apiKey +_apiSecret');

    if (!platform) return next(AppError.notFound('Platform connection not found'));

    platform.accessToken  = null;
    platform.refreshToken = null;
    platform.apiKey       = null;
    platform.apiSecret    = null;
    platform.isConnected  = false;
    platform.tokenExpiresAt = null;
    platform.sellerId     = null;
    platform.metadata     = {};
    await platform.save();

    success(res, { disconnected: req.params.name }, `${req.params.name} disconnected`);
  } catch (err) { next(err); }
};

/* ── POST /platforms/:name/sync ──────────────────────────────────────── */
exports.syncPlatform = async (req, res, next) => {
  try {
    const { name } = req.params;
    if (name !== 'amazon') {
      return next(AppError.badRequest(`Manual sync via API not supported for ${name}`));
    }

    const result = await amazonSvc.syncUserOrders(req.user._id, {
      daysAgo: Number(req.body.daysAgo) || 7,
    });

    success(
      res,
      {
        imported: result.imported,
        updated:  result.updated,
        errors:   result.errors,
        syncedAt: new Date(),
      },
      `Amazon sync complete — ${result.imported} new orders, ${result.updated} updated`
    );
  } catch (err) { next(err); }
};

/* ── PUT /platforms/:name/settings ───────────────────────────────────── */
exports.updatePlatformSettings = async (req, res, next) => {
  try {
    const { name } = req.params;
    const updates  = {};

    // Allowed top-level fields
    if (req.body.marketplaceId !== undefined) updates.marketplaceId = req.body.marketplaceId;
    if (req.body.storeName      !== undefined) updates.storeName     = req.body.storeName;

    // Nested settings
    const SETTINGS_FIELDS = ['autoSync', 'syncIntervalHrs', 'syncFromDaysAgo'];
    for (const k of SETTINGS_FIELDS) {
      if (req.body[k] !== undefined) updates[`settings.${k}`] = req.body[k];
    }

    if (!Object.keys(updates).length) {
      return next(AppError.badRequest('No valid settings provided'));
    }

    const platform = await Platform.findOneAndUpdate(
      { userId: req.user._id, platformName: name },
      updates,
      { new: true }
    );
    if (!platform) return next(AppError.notFound('Platform connection not found'));

    success(res, { platform: platform.toSafeObject() }, 'Settings updated');
  } catch (err) { next(err); }
};
