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
const Platform    = require('../models/Platform.model');
const AppError    = require('../utils/AppError');
const { success, noContent } = require('../utils/response');
const logger      = require('../utils/logger');
const amazonSvc   = require('../services/amazon.service');
const flipkartSvc = require('../services/flipkart.service');

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
    // NOTE: never log req.query here — it contains spapi_oauth_code and state (sensitive OAuth params)
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
      logger.warn('Amazon callback: state not found or expired (possible CSRF or session timeout)');
      return res.redirect(`${CLIENT_URL()}/dashboard/settings?tab=platforms&error=invalid_state`);
    }

    // Exchange auth code for LWA tokens
    const { accessToken, refreshToken, expiresIn } = await amazonSvc.exchangeAuthCode(spapi_oauth_code);

    // Save encrypted tokens
    platform.accessToken    = accessToken;
    platform.refreshToken   = refreshToken;
    platform.tokenExpiresAt = new Date(Date.now() + (expiresIn || 3600) * 1000);
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

    /* ── Flipkart sync ─────────────────────────────────────────────── */
    if (name === 'flipkart') {
      const platform = await Platform
        .findOne({ userId: req.user._id, platformName: 'flipkart', isConnected: true })
        .select('+_accessToken +_refreshToken +_apiKey +_apiSecret');

      if (!platform) {
        return next(AppError.badRequest(
          'Flipkart account is not connected. Go to Settings → Platforms to connect.'
        ));
      }

      let result;
      try {
        result = await flipkartSvc.syncUserOrders(req.user._id, {
          daysAgo: Number(req.body?.daysAgo) || 7,
        });
      } catch (svcErr) {
        logger.error('[syncPlatform] flipkart syncUserOrders threw:', svcErr.message);
        return next(AppError.badRequest(`Flipkart sync failed: ${svcErr.message}`));
      }

      return success(res, {
        imported: result.imported,
        updated:  result.updated,
        errors:   result.errors,
        syncedAt: new Date(),
      }, `Flipkart sync complete — ${result.imported} new, ${result.updated} updated`);
    }

    if (name !== 'amazon') {
      return next(AppError.badRequest(`Manual sync via API not supported for ${name}`));
    }

    const isSandbox = process.env.AMAZON_SANDBOX === 'true';

    // In production: require a connected Platform doc before proceeding
    if (!isSandbox) {
      const platform = await Platform
        .findOne({ userId: req.user._id, platformName: 'amazon', isConnected: true })
        .select('+_accessToken +_refreshToken');

      if (!platform) {
        return next(AppError.badRequest(
          'Amazon account is not connected. Go to Settings → Platforms to connect your Amazon seller account.'
        ));
      }
    }
    // In sandbox: syncUserOrders auto-creates the Platform doc if missing

    logger.info(`[syncPlatform] starting amazon sync for user ${req.user._id} (sandbox=${isSandbox})`);

    let result;
    try {
      result = await amazonSvc.syncUserOrders(req.user._id, {
        daysAgo: Number(req.body?.daysAgo) || 7,
      });
    } catch (svcErr) {
      // Log full error so Render logs reveal the real cause
      logger.error('[syncPlatform] syncUserOrders threw:', svcErr.message, svcErr.stack);
      // Return a 400 with the actual message instead of a blank 500
      return next(AppError.badRequest(`Sync failed: ${svcErr.message}`));
    }

    success(
      res,
      {
        imported: result.imported,
        updated:  result.updated,
        errors:   result.errors,
        syncedAt: new Date(),
        sandbox:  isSandbox,
      },
      isSandbox
        ? `[Sandbox] Synced ${result.imported} mock orders`
        : `Amazon sync complete — ${result.imported} new, ${result.updated} updated`
    );
  } catch (err) { next(err); }
};

/* ── POST /platforms/amazon/manual-connect ───────────────────────────── */
exports.manualConnect = async (req, res, next) => {
  try {
    const { refreshToken, sellerId } = req.body;
    if (!refreshToken) return next(AppError.badRequest('Refresh token is required'));

    // Upsert the Platform record
    const platform = await Platform.findOneAndUpdate(
      { userId: req.user._id, platformName: 'amazon' },
      { userId: req.user._id, platformName: 'amazon' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    platform.refreshToken   = refreshToken;              // stored encrypted
    platform.sellerId       = sellerId || '';
    platform.marketplaceId  = 'A21TJRUUN4KGV';          // India marketplace
    platform.isConnected    = true;
    platform.tokenExpiresAt = null;                      // refreshed on first API call
    platform.lastSyncStatus = null;
    platform.metadata       = { manualConnect: true, connectedAt: new Date() };
    await platform.save();

    logger.info(`Amazon manually connected — user ${req.user._id}`);
    success(res, { platform: platform.toSafeObject() }, 'Amazon connected via manual token');
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════════
   FLIPKART — OAuth (Third Party) + Self Access
   ══════════════════════════════════════════════════════════════════════ */

/* ── GET /platforms/flipkart/oauth-url  (Third Party — requires Flipkart partner approval) */
exports.getFlipkartOAuthUrl = async (req, res, next) => {
  try {
    if (!process.env.FLIPKART_CLIENT_ID) {
      return next(AppError.badRequest(
        'FLIPKART_CLIENT_ID is not configured. Add it to your Render environment variables.'
      ));
    }

    const state = uuidv4();

    await Platform.findOneAndUpdate(
      { userId: req.user._id, platformName: 'flipkart' },
      {
        userId:       req.user._id,
        platformName: 'flipkart',
        metadata:     { oauthState: state, oauthInitiatedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const oauthUrl = flipkartSvc.buildOAuthUrl(state);
    success(res, { oauthUrl }, 'Flipkart OAuth URL generated');
  } catch (err) { next(err); }
};

/* ── GET /platforms/flipkart/callback  (public — Flipkart redirects here after consent) */
exports.handleFlipkartCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;
    const CLIENT = process.env.CLIENT_URL || 'http://localhost:3000';

    if (error) {
      logger.warn(`Flipkart OAuth denied: ${error} — ${error_description}`);
      return res.redirect(`${CLIENT}/dashboard/settings?tab=platforms&error=flipkart_rejected`);
    }

    if (!code || !state) {
      return res.redirect(`${CLIENT}/dashboard/settings?tab=platforms&error=flipkart_missing_params`);
    }

    // Find the Platform doc by state token
    const platform = await Platform
      .findOne({ platformName: 'flipkart', 'metadata.oauthState': state })
      .select('+_accessToken +_refreshToken');

    if (!platform) {
      logger.warn('Flipkart callback: state not found or expired');
      return res.redirect(`${CLIENT}/dashboard/settings?tab=platforms&error=flipkart_invalid_state`);
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } = await flipkartSvc.exchangeAuthCode(code);

    platform.accessToken    = accessToken;
    platform.refreshToken   = refreshToken;
    platform.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    platform.isConnected    = true;
    platform.lastSyncStatus = null;
    platform.lastSyncError  = null;
    platform.metadata       = { ...platform.metadata, oauthState: null, connectedAt: new Date() };
    await platform.save();

    logger.info(`Flipkart OAuth connected — user ${platform.userId}`);
    res.redirect(`${CLIENT}/dashboard/settings?tab=platforms&connected=flipkart`);
  } catch (err) {
    logger.error('Flipkart OAuth callback error:', err.message);
    const CLIENT = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${CLIENT}/dashboard/settings?tab=platforms&error=flipkart_oauth_failed`);
  }
};

/* ── POST /platforms/flipkart/self-connect  (Self Access — seller's own API Key + Secret) */
exports.flipkartSelfConnect = async (req, res, next) => {
  try {
    const { apiKey, apiSecret } = req.body;
    if (!apiKey || !apiSecret) {
      return next(AppError.badRequest('Both API Key and API Secret are required'));
    }

    // Validate the credentials by fetching a token immediately
    let accessToken, expiresIn;
    try {
      ({ accessToken, expiresIn } = await flipkartSvc.getSelfAccessToken(apiKey, apiSecret));
    } catch (credErr) {
      logger.warn('[flipkartSelfConnect] invalid credentials:', credErr.response?.data || credErr.message);
      return next(AppError.badRequest('Invalid Flipkart API Key or Secret. Please check your credentials.'));
    }

    // Upsert Platform doc — store encrypted apiKey + apiSecret + initial access token
    const platform = await Platform.findOneAndUpdate(
      { userId: req.user._id, platformName: 'flipkart' },
      { userId: req.user._id, platformName: 'flipkart' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select('+_accessToken +_apiKey +_apiSecret');

    platform.apiKey         = apiKey;
    platform.apiSecret      = apiSecret;
    platform.accessToken    = accessToken;
    platform.refreshToken   = null;                         // Self Access has no refresh token
    platform.tokenExpiresAt = new Date(Date.now() + (expiresIn || 5184000) * 1000);
    platform.isConnected    = true;
    platform.lastSyncStatus = null;
    platform.lastSyncError  = null;
    platform.metadata       = { selfAccess: true, connectedAt: new Date() };
    await platform.save();

    logger.info(`Flipkart Self Access connected — user ${req.user._id}`);
    success(res, { platform: platform.toSafeObject() }, 'Flipkart connected via Self Access');
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
