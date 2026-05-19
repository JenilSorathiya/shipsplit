/**
 * Flipkart Seller API integration.
 *
 * Supports two connection modes:
 *   1. Self Access  — seller's own API Key + Secret (Client Credentials grant)
 *      Use while waiting for Third Party partner approval.
 *   2. Third Party  — ShipSplit app credentials + per-seller OAuth
 *      Full multi-seller SaaS flow once Flipkart approves the partner app.
 *
 * Docs: https://seller.flipkart.com/api-docs/FMSAPI.html
 */

const axios    = require('axios');
const logger   = require('../utils/logger');
const Order    = require('../models/Order.model');
const Platform = require('../models/Platform.model');

/* ── Base URLs ───────────────────────────────────────────────────────── */
const PROD_API   = 'https://api.flipkart.net/sellers';
const PROD_OAUTH = 'https://api.flipkart.net/oauth-service/oauth';
const SBX_API    = 'https://sandbox-api.flipkart.net/sellers';
const SBX_OAUTH  = 'https://sandbox-api.flipkart.net/oauth-service/oauth';

const useSandbox = () => process.env.FLIPKART_SANDBOX === 'true';
const API_BASE   = () => useSandbox() ? SBX_API   : PROD_API;
const OAUTH_BASE = () => useSandbox() ? SBX_OAUTH : PROD_OAUTH;

/* ══════════════════════════════════════════════════════════════════════
   OAUTH — Third Party (Authorization Code flow)
   Used when ShipSplit has Flipkart partner approval.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Build the Flipkart consent URL — redirect the seller here to authorize.
 * @param {string} state  CSRF token stored in the Platform doc
 */
exports.buildOAuthUrl = (state) => {
  const redirectUri = process.env.FLIPKART_REDIRECT_URI
    || `${process.env.SERVER_URL || 'https://shipsplit.onrender.com'}/api/platforms/flipkart/callback`;

  const params = new URLSearchParams({
    client_id:     process.env.FLIPKART_CLIENT_ID || '',
    redirect_uri:  redirectUri,
    response_type: 'code',
    state,
  });
  return `${OAUTH_BASE()}/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code → access + refresh tokens (Third Party).
 */
exports.exchangeAuthCode = async (code) => {
  const redirectUri = process.env.FLIPKART_REDIRECT_URI
    || `${process.env.SERVER_URL || 'https://shipsplit.onrender.com'}/api/platforms/flipkart/callback`;

  const { data } = await axios.post(`${OAUTH_BASE()}/token`, null, {
    params: { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
    auth: {
      username: process.env.FLIPKART_CLIENT_ID,
      password: process.env.FLIPKART_CLIENT_SECRET,
    },
  });
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresIn:    data.expires_in || 5184000,   // Flipkart: ~60 days
  };
};

/* ══════════════════════════════════════════════════════════════════════
   SELF ACCESS — Client Credentials flow
   Seller provides their own API Key + Secret from Seller Hub.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Obtain an access token using the seller's own API Key + Secret.
 * Flipkart Self Access uses Client Credentials grant.
 */
exports.getSelfAccessToken = async (apiKey, apiSecret) => {
  const { data } = await axios.post(`${OAUTH_BASE()}/token`, null, {
    params: { grant_type: 'client_credentials' },
    auth: {
      username: apiKey,
      password: apiSecret,
    },
  });
  return {
    accessToken: data.access_token,
    expiresIn:   data.expires_in || 5184000,
  };
};

/* ══════════════════════════════════════════════════════════════════════
   TOKEN MANAGEMENT (works for both modes)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Refresh an expired access token.
 * - If we have a refreshToken (Third Party) → use refresh_token grant
 * - If we have apiKey + apiSecret (Self Access) → use client_credentials grant
 */
exports.refreshAccessToken = async (platform) => {
  // Third Party: use refresh_token
  if (platform.refreshToken) {
    const { data } = await axios.post(`${OAUTH_BASE()}/token`, null, {
      params: {
        grant_type:    'refresh_token',
        refresh_token: platform.refreshToken,
      },
      auth: {
        username: process.env.FLIPKART_CLIENT_ID,
        password: process.env.FLIPKART_CLIENT_SECRET,
      },
    });
    return { accessToken: data.access_token, expiresIn: data.expires_in || 5184000 };
  }

  // Self Access: re-issue from apiKey + apiSecret
  if (platform.apiKey && platform.apiSecret) {
    return exports.getSelfAccessToken(platform.apiKey, platform.apiSecret);
  }

  throw new Error('No refresh token or API credentials available for Flipkart token refresh');
};

/**
 * Return a valid Bearer token, refreshing automatically if expired.
 * Persists the new token back to the Platform document.
 */
async function getAccessToken(platform) {
  const BUFFER_MS   = 5 * 60 * 1000; // refresh 5 min before expiry
  const isExpired   = !platform.tokenExpiresAt
    || new Date(platform.tokenExpiresAt) < new Date(Date.now() + BUFFER_MS);

  if (!platform.accessToken || isExpired) {
    logger.info('[flipkart] access token expired — refreshing');
    const { accessToken, expiresIn } = await exports.refreshAccessToken(platform);
    platform.accessToken    = accessToken;
    platform.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await platform.save();
    logger.info('[flipkart] access token refreshed successfully');
    return accessToken;
  }
  return platform.accessToken;
}

/** Build auth headers for an API call. */
async function authHeaders(platform) {
  const token = await getAccessToken(platform);
  return {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ══════════════════════════════════════════════════════════════════════
   ORDER FETCHING
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch pending shipments (state = APPROVED) from Flipkart.
 * Uses POST /v3/shipments/filter with pagination.
 *
 * @param {object} platform       Loaded Platform document (with tokens)
 * @param {object} opts
 * @param {string} [opts.createdAfter]   ISO date string — fetch orders created after this
 * @param {string} [opts.nextPageUrl]    Pagination cursor from previous call
 */
exports.fetchOrders = async (platform, { createdAfter, nextPageUrl } = {}) => {
  try {
    const headers = await authHeaders(platform);

    if (nextPageUrl) {
      // Follow pagination cursor
      const { data } = await axios.get(nextPageUrl, { headers });
      return {
        orders:    (data.shipments || data.orderItems || []).map(normalizeOrder),
        nextToken: data.nextPageUrl || null,
      };
    }

    // First page — POST filter body
    const body = {
      filter: {
        states:    ['APPROVED'],
        ...(createdAfter && {
          orderDate: { from: createdAfter },
        }),
      },
      pagination: { pageSize: 50 },
      sort:       { field: 'orderDate', order: 'asc' },
    };

    const { data } = await axios.post(
      `${API_BASE()}/v3/shipments/filter`,
      body,
      { headers }
    );

    return {
      orders:    (data.shipments || data.orderItems || []).map(normalizeOrder),
      nextToken: data.nextPageUrl || null,
    };
  } catch (err) {
    logger.error('[flipkart] fetchOrders error:', err.response?.data || err.message);
    throw err;
  }
};

/* ── Normalize raw Flipkart shipment → ShipSplit Order schema ─────────── */
function normalizeOrder(raw) {
  const addr    = raw.shippingAddress || {};
  const product = raw.product || {};

  return {
    platform:        'flipkart',
    orderId:         raw.shipmentId || raw.orderItemId || raw.orderId,
    platformOrderId: raw.orderId,
    platformStatus:  raw.state || raw.status || 'APPROVED',
    productName:     product.title || raw.itemTitle || '',
    sku:             product.sku   || raw.sku || '',
    quantity:        raw.quantity || 1,
    buyerName:       addr.name    || addr.customerName || '',
    buyerPhone:      addr.phone   || addr.contactNumber || addr.phoneNumber || '',
    address: {
      line1:   addr.addressLine1 || addr.line1 || '',
      line2:   addr.addressLine2 || addr.line2 || '',
      city:    addr.city    || '',
      state:   addr.state   || '',
      pincode: addr.pincode || addr.pin || addr.zipCode || '',
      country: 'India',
    },
    orderValue:        parseFloat(raw.sellingPrice?.amount || raw.itemTotal || 0),
    isCOD:             raw.paymentType === 'COD' || raw.disbursementMode === 'COD',
    codAmount:
      (raw.paymentType === 'COD' || raw.disbursementMode === 'COD')
        ? parseFloat(raw.sellingPrice?.amount || raw.itemTotal || 0)
        : 0,
    platformCreatedAt: raw.orderDate ? new Date(raw.orderDate) : null,
    // rawData intentionally omitted — raw responses contain buyer PII
    // and must not be stored per Flipkart Data Protection Policy
  };
}

/* ══════════════════════════════════════════════════════════════════════
   FULL SYNC
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Pull all new APPROVED orders from Flipkart and upsert into the DB.
 * Called by orders.controller → syncOrders and by platforms.controller → syncPlatform.
 *
 * @param {string|ObjectId} userId
 * @param {object}          opts
 * @param {number}          [opts.daysAgo=7]  How many days back to look
 */
exports.syncUserOrders = async (userId, { daysAgo = 7 } = {}) => {
  const platform = await Platform
    .findOne({ userId, platformName: 'flipkart', isConnected: true })
    .select('+_accessToken +_refreshToken +_apiKey +_apiSecret');

  if (!platform) throw new Error('Flipkart account is not connected. Go to Settings → Platforms.');

  const createdAfter = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

  let nextToken = null;
  let imported  = 0;
  let updated   = 0;
  let errors    = 0;
  let page      = 0;
  const MAX_PAGES = 20;

  do {
    page++;
    const { orders, nextToken: next } = await exports.fetchOrders(platform, {
      createdAfter: page === 1 ? createdAfter : undefined,
      nextPageUrl:  nextToken,
    });

    for (const order of orders) {
      try {
        const existing = await Order.findOneAndUpdate(
          { userId, platform: 'flipkart', orderId: order.orderId },
          { $setOnInsert: { ...order, userId, status: 'pending' } },
          { upsert: true, new: false }
        );
        if (!existing) imported++;
        else           updated++;
      } catch (e) {
        if (e.code === 11000) { /* duplicate — count as updated */ updated++; }
        else {
          logger.warn('[flipkart] upsert error:', e.message);
          errors++;
        }
      }
    }

    nextToken = next;
  } while (nextToken && page < MAX_PAGES);

  // Persist sync metadata
  platform.lastSyncAt       = new Date();
  platform.lastSyncStatus   = errors === 0 ? 'success' : 'partial';
  platform.lastSyncError    = errors > 0 ? `${errors} orders failed to save` : null;
  platform.totalOrdersSynced = (platform.totalOrdersSynced || 0) + imported;
  await platform.save();

  logger.info(`[flipkart] sync complete — imported: ${imported}, updated: ${updated}, errors: ${errors}`);
  return { imported, updated, errors };
};
