'use strict';

/**
 * Amazon SP-API integration for ShipSplit.
 *
 * Covers:
 *  - LWA OAuth 2.0 flow (buildOAuthUrl, exchangeAuthCode)
 *  - Token management (refreshAccessToken, ensureFreshToken)
 *  - AWS Signature v4 signing (required for all SP-API calls)
 *  - Orders API — paginated fetch with Unshipped/PartiallyShipped filter
 *  - Order Items API — ASIN, SellerSKU, Title, QuantityOrdered, IsGift
 *  - Merchant Fulfillment API — download shipping label PDF
 *  - Full user sync (orders + items, with rate-limit delays)
 *
 * Docs: https://developer-docs.amazon.com/sp-api/
 */

const axios  = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const Platform = require('../models/Platform.model');
const Order    = require('../models/Order.model');

/* ── Constants ──────────────────────────────────────────────────────── */
const LWA_TOKEN_URL  = 'https://api.amazon.com/auth/o2/token';
const SP_API_BASE    = process.env.AMAZON_SANDBOX === 'true'
  ? 'https://sandbox.sellingpartnerapi-fe.amazon.com'   // sandbox — use with self-auth tokens
  : 'https://sellingpartnerapi-fe.amazon.com';           // production — FE region (India/JP/AU)
const AWS_REGION     = 'us-west-2';   // FE endpoint region for signing
const AWS_SERVICE    = 'execute-api';
const IN_MARKETPLACE = 'A21TJRUUN4KGV'; // Amazon India marketplace ID

/* ── Utility: sleep ─────────────────────────────────────────────────── */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════════════════════════════
   SANDBOX MOCK DATA
   Used when AMAZON_SANDBOX=true so developers can test the full
   accept → label flow without real SP-API credentials.
   Shaped exactly like raw SP-API responses so normalizeOrder() works.
   ══════════════════════════════════════════════════════════════════════ */

const SANDBOX_ORDERS = [
  {
    AmazonOrderId:      '403-5893874-3272333',
    OrderStatus:        'Unshipped',
    PurchaseDate:       new Date(Date.now() - 1 * 86_400_000).toISOString(),
    FulfillmentChannel: 'MFN',
    BuyerInfo: { BuyerName: 'Rahul Sharma', BuyerEmail: 'rahul.sharma@example.com' },
    ShippingAddress: {
      AddressLine1: 'B-42, Sector 14', AddressLine2: 'Near Metro Station',
      City: 'Noida', StateOrRegion: 'UP', PostalCode: '201301', CountryCode: 'IN',
    },
    OrderTotal:    { Amount: '1299.00', CurrencyCode: 'INR' },
    PaymentMethod: 'Other', PaymentMethodDetails: [], IsGift: 'false',
  },
  {
    AmazonOrderId:      '403-1234567-8901234',
    OrderStatus:        'Unshipped',
    PurchaseDate:       new Date(Date.now() - 2 * 86_400_000).toISOString(),
    FulfillmentChannel: 'MFN',
    BuyerInfo: { BuyerName: 'Priya Patel', BuyerEmail: 'priya.patel@example.com' },
    ShippingAddress: {
      AddressLine1: '12, MG Road',
      City: 'Bangalore', StateOrRegion: 'KA', PostalCode: '560001', CountryCode: 'IN',
    },
    OrderTotal:    { Amount: '499.00', CurrencyCode: 'INR' },
    PaymentMethod: 'COD', PaymentMethodDetails: ['COD'], IsGift: 'false',
  },
  {
    AmazonOrderId:      '403-9876543-2109876',
    OrderStatus:        'Unshipped',
    PurchaseDate:       new Date(Date.now() - 3 * 86_400_000).toISOString(),
    FulfillmentChannel: 'MFN',
    BuyerInfo: { BuyerName: 'Arjun Singh', BuyerEmail: 'arjun.singh@example.com' },
    ShippingAddress: {
      AddressLine1: 'C-101, Anna Nagar',
      City: 'Chennai', StateOrRegion: 'TN', PostalCode: '600040', CountryCode: 'IN',
    },
    OrderTotal:    { Amount: '2499.00', CurrencyCode: 'INR' },
    PaymentMethod: 'Other', PaymentMethodDetails: [], IsGift: 'true',
  },
  {
    AmazonOrderId:      '403-4444444-5555555',
    OrderStatus:        'Unshipped',
    PurchaseDate:       new Date(Date.now() - 4 * 86_400_000).toISOString(),
    FulfillmentChannel: 'MFN',
    BuyerInfo: { BuyerName: 'Meera Joshi', BuyerEmail: 'meera.joshi@example.com' },
    ShippingAddress: {
      AddressLine1: '44 Park Street',
      City: 'Kolkata', StateOrRegion: 'WB', PostalCode: '700016', CountryCode: 'IN',
    },
    OrderTotal:    { Amount: '799.00', CurrencyCode: 'INR' },
    PaymentMethod: 'Other', PaymentMethodDetails: [], IsGift: 'false',
  },
];

const SANDBOX_ITEMS = {
  '403-5893874-3272333': [{
    OrderItemId: 'sandbox-item-001', ASIN: 'B08N5WRWNW', SellerSKU: 'TSHIRT-BLK-M',
    Title: 'Cotton Round Neck T-Shirt - Black - Medium', QuantityOrdered: 2,
    ItemPrice: { Amount: '649.50', CurrencyCode: 'INR' }, IsGift: 'false',
  }],
  '403-1234567-8901234': [{
    OrderItemId: 'sandbox-item-002', ASIN: 'B07XQXZXZX', SellerSKU: 'FACE-WASH-100ML',
    Title: 'Natural Face Wash - 100ml', QuantityOrdered: 1,
    ItemPrice: { Amount: '499.00', CurrencyCode: 'INR' }, IsGift: 'false',
  }],
  '403-9876543-2109876': [{
    OrderItemId: 'sandbox-item-003', ASIN: 'B09KM2J3P1', SellerSKU: 'WATCH-STEEL-GLD',
    Title: 'Premium Steel Watch - Gold Edition', QuantityOrdered: 1,
    ItemPrice: { Amount: '2499.00', CurrencyCode: 'INR' }, IsGift: 'true',
    GiftMessageText: 'Happy Birthday! Enjoy this gift.',
  }],
  '403-4444444-5555555': [{
    OrderItemId: 'sandbox-item-004', ASIN: 'B08ABCDEFG', SellerSKU: 'BOOK-PY-ADV',
    Title: 'Advanced Python Programming - 3rd Edition', QuantityOrdered: 1,
    ItemPrice: { Amount: '799.00', CurrencyCode: 'INR' }, IsGift: 'false',
  }],
};

/* ══════════════════════════════════════════════════════════════════════
   AWS SIGNATURE v4
   ══════════════════════════════════════════════════════════════════════ */

function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}
function sha256Hex(str) {
  return crypto.createHash('sha256').update(str || '', 'utf8').digest('hex');
}

/**
 * Build Authorization + x-amz-date headers for an SP-API request.
 * Returns {} (no-op) when AWS credentials are not configured (dev mode).
 */
function buildAWSAuthHeaders({ method, fullUrl, extraHeaders = {}, body = '' }) {
  const awsKey    = process.env.AMAZON_AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AMAZON_AWS_SECRET_ACCESS_KEY;

  // Skip signing in dev mode — requests will 403 from Amazon but won't crash locally
  if (!awsKey || !awsSecret || awsKey === 'dev') return {};

  const parsed    = new URL(fullUrl);
  const now       = new Date();
  // Format: 20240115T120000Z
  const amzDate   = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = amzDate.slice(0, 8);

  // Canonical query string — params sorted lexicographically
  const sortedParams = [...parsed.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Merge host + amz-date + caller-supplied headers, lowercase keys
  const hdrsToSign = {
    host:          parsed.host,
    'x-amz-date':  amzDate,
    ...Object.fromEntries(
      Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), String(v)])
    ),
  };
  const sortedKeys       = Object.keys(hdrsToSign).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${hdrsToSign[k]}\n`).join('');
  const signedHeaders    = sortedKeys.join(';');

  const payloadHash = sha256Hex(body);
  const canonicalRequest = [
    method.toUpperCase(),
    parsed.pathname || '/',
    sortedParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credScope    = `${dateStamp}/${AWS_REGION}/${AWS_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmacSha256(
    hmacSha256(hmacSha256(hmacSha256(`AWS4${awsSecret}`, dateStamp), AWS_REGION), AWS_SERVICE),
    'aws4_request'
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    'x-amz-date':    amzDate,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${awsKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   RETRY WRAPPER — handles 429 + transient 5xx
   ══════════════════════════════════════════════════════════════════════ */

async function withRetry(fn, { retries = 3, baseDelay = 1500 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status  = err.response?.status;
      const retryable = status === 429 || (status >= 500 && status < 600);
      if (retryable && attempt < retries) {
        const wait = baseDelay * Math.pow(2, attempt);
        logger.warn(`Amazon SP-API ${status} — retry ${attempt + 1}/${retries} after ${wait}ms`);
        await delay(wait);
        continue;
      }
      // Attach SP-API error details for better logging
      const spErr = err.response?.data?.errors?.[0];
      if (spErr) err.message = `${spErr.code}: ${spErr.message}`;
      throw err;
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   CORE SP-API HTTP REQUEST
   ══════════════════════════════════════════════════════════════════════ */

async function spRequest({ platform, method, path, params = {}, body = null }) {
  // Build full URL with query params
  const urlObj = new URL(`${SP_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) urlObj.searchParams.set(String(k), String(v));
  }
  const fullUrl = urlObj.toString();
  const bodyStr = body ? JSON.stringify(body) : '';

  const tokenHeader = { 'x-amz-access-token': platform.accessToken };
  const awsHeaders  = buildAWSAuthHeaders({
    method,
    fullUrl,
    extraHeaders: { ...tokenHeader, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: bodyStr,
  });

  return withRetry(() =>
    axios({
      method,
      url: fullUrl,
      headers: {
        'Content-Type': 'application/json',
        ...tokenHeader,
        ...awsHeaders,
      },
      data: body || undefined,
    })
  );
}

/* ══════════════════════════════════════════════════════════════════════
   1. OAUTH FLOW — Login with Amazon (LWA)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Build the Amazon Seller Central OAuth consent page URL.
 * `state` is a random UUID stored in Platform.metadata.oauthState before redirect.
 */
exports.buildOAuthUrl = (state) => {
  // application_id = SP-API App ID (amzn1.sp.solution.xxx), NOT the LWA Client ID
  const appId = process.env.AMAZON_APP_ID;
  const params = new URLSearchParams({
    application_id: appId,
    state,
    version: 'beta',
  });
  return `https://sellercentral.amazon.in/apps/authorize/consent?${params}`;
};

/**
 * Exchange the spapi_oauth_code from the callback for access + refresh tokens.
 */
exports.exchangeAuthCode = async (code) => {
  const { data } = await axios.post(
    LWA_TOKEN_URL,
    new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     process.env.AMAZON_CLIENT_ID,
      client_secret: process.env.AMAZON_CLIENT_SECRET,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresIn:    data.expires_in, // seconds
  };
};

/* ══════════════════════════════════════════════════════════════════════
   2. TOKEN MANAGEMENT
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Use the stored refresh_token to get a new access_token from LWA.
 * Returns { accessToken, expiresIn }.
 */
exports.refreshAccessToken = async (platform) => {
  const { data } = await axios.post(
    LWA_TOKEN_URL,
    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: platform.refreshToken,
      client_id:     process.env.AMAZON_CLIENT_ID,
      client_secret: process.env.AMAZON_CLIENT_SECRET,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return { accessToken: data.access_token, expiresIn: data.expires_in };
};

/**
 * Check if the access token is expired (with 60s buffer).
 * If so, refresh it, update the Platform doc, and save.
 * Throws if refresh fails (caller should handle — likely needs reconnect).
 */
async function ensureFreshToken(platform) {
  const isExpired = !platform.tokenExpiresAt
    || platform.tokenExpiresAt < new Date(Date.now() + 60_000);
  if (!isExpired) return;

  logger.info(`Amazon token expired for platform ${platform._id} — refreshing`);
  try {
    const { accessToken, expiresIn } = await exports.refreshAccessToken(platform);
    platform.accessToken    = accessToken;
    platform.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await platform.save();
    logger.info('Amazon token refreshed successfully');
  } catch (err) {
    const msg = err.response?.data?.error_description || err.message;
    logger.error('Amazon token refresh failed:', msg);
    // Mark platform as needing reconnect
    platform.lastSyncStatus = 'failed';
    platform.lastSyncError  = `Token refresh failed: ${msg}`;
    await platform.save();
    throw new Error('Amazon token expired — please reconnect your Amazon account');
  }
}

/* ══════════════════════════════════════════════════════════════════════
   3. FETCH ORDERS — GET /orders/v0/orders
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch one page of Amazon orders.
 * SP-API rate limit: 0.0167 req/s (burst: 20)
 *
 * @param {Object} platform  - Platform doc with decrypted tokens
 * @param {Object} options
 * @param {string} [options.createdAfter]  - ISO date string
 * @param {string} [options.nextToken]     - pagination token
 * @returns {{ orders: Object[], nextToken: string|null }}
 */
exports.fetchOrders = async (platform, { createdAfter, nextToken } = {}) => {
  /* ── Sandbox: return mock orders, skip real API call ─────────────── */
  if (process.env.AMAZON_SANDBOX === 'true') {
    if (nextToken) return { orders: [], nextToken: null };
    logger.info('[amazon sandbox] fetchOrders → returning mock orders');
    return { orders: SANDBOX_ORDERS, nextToken: null };
  }

  await ensureFreshToken(platform);

  const params = {
    MarketplaceIds: platform.marketplaceId || IN_MARKETPLACE,
    OrderStatuses:  'Unshipped,PartiallyShipped',
    CreatedAfter:   createdAfter || new Date(Date.now() - 7 * 86_400_000).toISOString(),
  };
  if (nextToken) params.NextToken = nextToken;

  try {
    const { data } = await spRequest({ platform, method: 'GET', path: '/orders/v0/orders', params });
    const { Orders = [], NextToken } = data.payload || {};
    return { orders: Orders, nextToken: NextToken || null };
  } catch (err) {
    logger.error('Amazon fetchOrders error:', err.response?.data || err.message);
    throw err;
  }
};

/* ══════════════════════════════════════════════════════════════════════
   4. FETCH ORDER ITEMS — GET /orders/v0/orders/{orderId}/orderItems
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Fetch all items for a given Amazon order ID.
 * Handles NextToken pagination for multi-item orders.
 * SP-API rate limit: 0.5 req/s (burst: 30)
 *
 * @returns {Object[]} Array of SP-API OrderItem objects
 */
exports.fetchOrderItems = async (platform, orderId) => {
  /* ── Sandbox: return mock items, skip real API call ──────────────── */
  if (process.env.AMAZON_SANDBOX === 'true') {
    const items = SANDBOX_ITEMS[orderId] || [{
      OrderItemId: `sandbox-item-${orderId}`,
      ASIN:        'B00SANDBOX0',
      SellerSKU:   'SANDBOX-SKU-001',
      Title:       'Sandbox Test Product',
      QuantityOrdered: 1,
      ItemPrice:   { Amount: '100.00', CurrencyCode: 'INR' },
      IsGift:      'false',
    }];
    logger.info(`[amazon sandbox] fetchOrderItems(${orderId}) → ${items.length} item(s)`);
    return items;
  }

  await ensureFreshToken(platform);

  let allItems  = [];
  let nextToken = null;

  do {
    const params = nextToken ? { NextToken: nextToken } : {};
    const { data } = await spRequest({
      platform,
      method: 'GET',
      path:   `/orders/v0/orders/${encodeURIComponent(orderId)}/orderItems`,
      params,
    });
    const { OrderItems = [], NextToken } = data.payload || {};
    allItems  = allItems.concat(OrderItems);
    nextToken = NextToken || null;
    if (nextToken) await delay(300); // stay under 0.5 req/s rate limit
  } while (nextToken);

  return allItems;
};

/* ══════════════════════════════════════════════════════════════════════
   5. FETCH SHIPPING LABEL — GET /mfn/v0/shipments/{id}/label
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Download the shipping label for an existing MFN shipment.
 * Returns { buffer: Buffer, format: 'PDF'|'PNG', dimensions: Object }
 *
 * Note: FBA (AFN) orders don't have MFN labels — Amazon handles shipping.
 */
exports.fetchShippingLabel = async (platform, shipmentId) => {
  await ensureFreshToken(platform);

  const { data } = await spRequest({
    platform,
    method: 'GET',
    path:   `/mfn/v0/shipments/${encodeURIComponent(shipmentId)}/label`,
  });

  const label   = data.payload?.Label;
  const content = label?.LabelData || label?.FileContents?.Contents;
  if (!content) throw new Error(`No label content for shipment ${shipmentId}`);

  return {
    buffer:     Buffer.from(content, 'base64'),
    format:     label.FileContents?.FileFormat || 'PDF',
    dimensions: label.Dimensions || null,
  };
};

/* ══════════════════════════════════════════════════════════════════════
   5b. SANDBOX LABEL GENERATOR — pdf-lib
   Produces a realistic Amazon Easy Ship label when AMAZON_SANDBOX=true.
   ══════════════════════════════════════════════════════════════════════ */

async function generateSandboxLabelPDF(order, awb) {
  const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

  // A5 landscape — 419 × 298 pt  (Amazon Easy Ship default)
  const doc    = await PDFDocument.create();
  const page   = doc.addPage([419, 298]);
  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const W   = 419;
  const H   = 298;
  const amzOrange = rgb(1, 0.596, 0);   // #FF9800
  const darkGrey  = rgb(0.2, 0.2, 0.2);
  const midGrey   = rgb(0.55, 0.55, 0.55);
  const lightGrey = rgb(0.93, 0.93, 0.93);

  /* ── Orange header bar ─────────────────────────────────────────────── */
  page.drawRectangle({ x: 0, y: H - 42, width: W, height: 42, color: amzOrange });
  // "amazon" logo text
  page.drawText('amazon', {
    x: 12, y: H - 30, size: 22, font: bold, color: rgb(0, 0, 0),
  });
  // "Easy Ship" sub-label
  page.drawText('Easy Ship', {
    x: 112, y: H - 29, size: 12, font: normal, color: rgb(0.15, 0.15, 0.15),
  });
  // "SANDBOX" badge (right side)
  page.drawRectangle({ x: W - 90, y: H - 37, width: 82, height: 24, color: rgb(0,0,0) });
  page.drawText('SANDBOX', { x: W - 82, y: H - 30, size: 10, font: bold, color: rgb(1,1,1) });

  /* ── Order ID bar ──────────────────────────────────────────────────── */
  page.drawRectangle({ x: 0, y: H - 60, width: W, height: 18, color: lightGrey });
  page.drawText(`Order ID: ${order.orderId || 'N/A'}`, {
    x: 12, y: H - 55, size: 9, font: normal, color: midGrey,
  });

  /* ── SHIP TO section ───────────────────────────────────────────────── */
  const addr = order.address || {};
  const addrLines = [
    order.buyerName,
    addr.line1,
    addr.line2,
    [addr.city, addr.state].filter(Boolean).join(', '),
    addr.pincode,
    addr.country || 'India',
  ].filter(Boolean);

  page.drawText('SHIP TO', { x: 12, y: H - 80, size: 8, font: bold, color: midGrey });
  page.drawLine({ start: { x: 12, y: H - 82 }, end: { x: 210, y: H - 82 }, thickness: 0.5, color: midGrey });

  let y = H - 94;
  for (const line of addrLines) {
    page.drawText(String(line).slice(0, 38), { x: 12, y, size: 10, font: line === order.buyerName ? bold : normal, color: darkGrey });
    y -= 14;
  }

  /* ── Divider ───────────────────────────────────────────────────────── */
  page.drawLine({ start: { x: 220, y: H - 62 }, end: { x: 220, y: 50 }, thickness: 0.5, color: midGrey });

  /* ── Product & SKU (right column) ─────────────────────────────────── */
  page.drawText('PRODUCT', { x: 228, y: H - 80, size: 8, font: bold, color: midGrey });
  page.drawLine({ start: { x: 228, y: H - 82 }, end: { x: W - 10, y: H - 82 }, thickness: 0.5, color: midGrey });

  const productName = (order.productName || 'Product').slice(0, 30);
  const sku         = order.sku || 'N/A';
  page.drawText(productName, { x: 228, y: H - 95,  size: 10, font: bold,   color: darkGrey });
  page.drawText(`SKU: ${sku}`, { x: 228, y: H - 110, size: 9,  font: normal, color: midGrey  });
  const qty = order.quantity || 1;
  page.drawText(`Qty: ${qty}`, { x: 228, y: H - 124, size: 9, font: normal, color: midGrey });

  /* ── COD badge ─────────────────────────────────────────────────────── */
  if (order.isCOD) {
    page.drawRectangle({ x: 228, y: H - 148, width: 50, height: 18, color: rgb(0.9, 0.2, 0.2) });
    page.drawText('C O D', { x: 236, y: H - 141, size: 9, font: bold, color: rgb(1, 1, 1) });
    if (order.codAmount) {
      page.drawText(`₹${order.codAmount}`, { x: 284, y: H - 141, size: 9, font: bold, color: darkGrey });
    }
  }

  /* ── AWB section ───────────────────────────────────────────────────── */
  page.drawRectangle({ x: 0, y: 48, width: W, height: 40, color: lightGrey });
  page.drawText('AWB NUMBER', { x: 12, y: 81, size: 7, font: bold, color: midGrey });
  page.drawText(awb, { x: 12, y: 62, size: 14, font: bold, color: darkGrey });

  // Simple barcode simulation (alternating black/white bars)
  let bx = 230;
  const barcodeDigits = awb.replace(/\D/g, '').slice(0, 20);
  for (const ch of barcodeDigits) {
    const barWidth = (parseInt(ch, 10) % 3) + 1;
    page.drawRectangle({ x: bx, y: 52, width: barWidth, height: 28, color: rgb(0, 0, 0) });
    bx += barWidth + 2;
  }

  /* ── Footer ────────────────────────────────────────────────────────── */
  page.drawRectangle({ x: 0, y: 0, width: W, height: 20, color: rgb(0.12, 0.12, 0.12) });
  page.drawText('ShipSplit  •  Powered by Amazon Easy Ship  •  sandbox label', {
    x: 12, y: 6, size: 7, font: normal, color: rgb(0.7, 0.7, 0.7),
  });
  const ts = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  page.drawText(ts, { x: W - 60, y: 6, size: 7, font: normal, color: rgb(0.7, 0.7, 0.7) });

  return Buffer.from(await doc.save());
}

/* ══════════════════════════════════════════════════════════════════════
   5c. GET ELIGIBLE SHIPPING SERVICES — POST /mfn/v0/eligibleShippingServices
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Returns an array of eligible shipping service objects for an MFN order.
 * Sandbox: returns static mock service. Production: calls SP-API.
 */
exports.getEligibleShippingServices = async (platform, order) => {
  /* ── Sandbox: return static mock service ─────────────────────────── */
  if (process.env.AMAZON_SANDBOX === 'true') {
    return [{
      ShippingServiceId:   'AMAZON_EASY_SHIP',
      ShippingServiceName: 'Amazon Easy Ship',
      Rate: { Amount: '45.00', CurrencyCode: 'INR' },
      LatestEstimatedDeliveryDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    }];
  }

  await ensureFreshToken(platform);

  const body = {
    ShipmentRequestDetails: {
      AmazonOrderId:   order.orderId,
      SellerOrderId:   order.orderId,
      ItemList: (order.items?.length ? order.items : [{ sku: order.sku }]).map((item, idx) => ({
        OrderItemId: item.orderItemId || String(idx + 1),
        Quantity:    item.quantity || 1,
      })),
      ShipFromAddress: {
        Name:                 platform.settings?.sellerName     || 'Seller',
        AddressLine1:         platform.settings?.addressLine1   || '123 Seller Lane',
        City:                 platform.settings?.city           || 'Mumbai',
        StateOrProvinceCode:  platform.settings?.state          || 'MH',
        PostalCode:           platform.settings?.pincode        || '400001',
        CountryCode:          'IN',
        Phone:                platform.settings?.phone          || '9999999999',
      },
      PackageDimensions: { Length: 20, Width: 15, Height: 10, Unit: 'centimeters' },
      Weight:            { Value: 500, Unit: 'grams' },
      ShippingServiceOptions: {
        DeliveryExperience: 'DeliveryConfirmationWithSignature',
        CarrierWillPickUp:  true,
      },
    },
  };

  try {
    const { data } = await spRequest({
      platform, method: 'POST',
      path: '/mfn/v0/eligibleShippingServices', body,
    });
    return data.payload?.ShippingServiceList || [];
  } catch (err) {
    logger.warn('getEligibleShippingServices error:', err.message);
    return [];
  }
};

/* ══════════════════════════════════════════════════════════════════════
   5d. CREATE MFN SHIPMENT — POST /mfn/v0/shipments
   Creates a shipment on Amazon and returns the shipping label PDF.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Creates an MFN shipment for the given order using the specified shipping service.
 * Returns { shipmentId, awb, labelBuffer, labelFormat }.
 * Amazon provides the label — we do not generate one ourselves.
 */
exports.createMFNShipment = async (platform, order, shippingServiceId, settings = {}) => {
  /* ── Sandbox: generate local label PDF, skip real API call ───────── */
  if (process.env.AMAZON_SANDBOX === 'true') {
    const awb         = `AMZL${Date.now()}IN`;
    const shipmentId  = `SANDBOX-${order.orderId}`;
    const labelBuffer = await generateSandboxLabelPDF(order, awb);
    logger.info(`[amazon sandbox] createMFNShipment → AWB ${awb}`);
    return { shipmentId, awb, labelBuffer, labelFormat: 'PDF' };
  }

  await ensureFreshToken(platform);

  const body = {
    ShipmentRequestDetails: {
      AmazonOrderId:   order.orderId,
      SellerOrderId:   order.orderId,
      ItemList: (order.items?.length ? order.items : [{ sku: order.sku }]).map((item, idx) => ({
        OrderItemId: item.orderItemId || String(idx + 1),
        Quantity:    item.quantity || 1,
      })),
      ShipFromAddress: {
        Name:                 platform.settings?.sellerName     || 'Seller',
        AddressLine1:         platform.settings?.addressLine1   || '123 Seller Lane',
        City:                 platform.settings?.city           || 'Mumbai',
        StateOrProvinceCode:  platform.settings?.state          || 'MH',
        PostalCode:           platform.settings?.pincode        || '400001',
        CountryCode:          'IN',
        Phone:                platform.settings?.phone          || '9999999999',
      },
      PackageDimensions: { Length: 20, Width: 15, Height: 10, Unit: 'centimeters' },
      Weight:            { Value: 500, Unit: 'grams' },
      ShippingServiceOptions: {
        DeliveryExperience: 'DeliveryConfirmationWithSignature',
        CarrierWillPickUp:  true,
      },
    },
    ShippingServiceId:          shippingServiceId,
    LabelFormatOptionRequest:   { IncludedDocumentHyperlinkList: [] },
  };

  const { data } = await spRequest({
    platform, method: 'POST', path: '/mfn/v0/shipments', body,
  });

  const payload = data.payload || {};
  const label   = payload.Label;
  const content = label?.LabelData || label?.FileContents?.Contents;

  return {
    shipmentId:  payload.ShipmentId  || null,
    awb:         payload.TrackingId  || null,
    labelBuffer: content ? Buffer.from(content, 'base64') : null,
    labelFormat: label?.FileContents?.FileFormat || 'PDF',
  };
};

/* ══════════════════════════════════════════════════════════════════════
   5e. CANCEL MFN SHIPMENT — DELETE /mfn/v0/shipments/{shipmentId}
   Must be called before cancelling the order if a shipment was created.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Cancels an MFN shipment via Amazon's API.
 */
exports.cancelMFNShipment = async (platform, shipmentId) => {
  await ensureFreshToken(platform);
  await spRequest({ platform, method: 'DELETE', path: `/mfn/v0/shipments/${shipmentId}` });
  logger.info(`[amazon] cancelled MFN shipment ${shipmentId}`);
  return { success: true };
};

/* ══════════════════════════════════════════════════════════════════════
   5f. CANCEL ORDER — POST /orders/v0/orders/{orderId}/cancellation
   Notifies Amazon that the seller cannot fulfil the order.
   Amazon cancellation reason codes accepted by SP-API:
     NO_INVENTORY | PRICE_ERROR | SELLER_CANCEL | CUSTOMER_CANCEL
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Requests order cancellation on Amazon.
 * Reason codes: NO_INVENTORY | PRICE_ERROR | SELLER_CANCEL | CUSTOMER_CANCEL
 */
exports.cancelAmazonOrder = async (platform, amazonOrderId, reason = 'SELLER_CANCEL') => {
  await ensureFreshToken(platform);

  await spRequest({
    platform,
    method: 'POST',
    path:   `/orders/v0/orders/${amazonOrderId}/cancellation`,
    body:   {
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'A21TJRUUN4KGV',
      reason,
    },
  });

  logger.info(`[amazon] cancel requested for order ${amazonOrderId}, reason: ${reason}`);
  return { success: true };
};

/* ══════════════════════════════════════════════════════════════════════
   6. NORMALIZE ORDER
   Maps raw SP-API order + items array → our Order model shape
   ══════════════════════════════════════════════════════════════════════ */

exports.normalizeOrder = function normalizeOrder(raw, items = []) {
  const buyerInfo = raw.BuyerInfo || {};
  const addr      = raw.ShippingAddress || {};

  // FBA = AFN (Amazon ships), FBM = MFN (seller ships)
  const fulfillmentChannel = raw.FulfillmentChannel === 'AFN' ? 'AFN' : 'MFN';

  // Gift detection: check order level OR any item
  const isGift = raw.IsGift === 'true' || raw.IsGift === true
    || items.some((i) => i.IsGift === 'true' || i.IsGift === true);
  const giftMessage = items.find((i) => i.GiftMessageText)?.GiftMessageText
    || buyerInfo.GiftMessageText || '';

  // Map SP-API items to our item schema
  const normalizedItems = items.map((item) => ({
    sku:         item.SellerSKU || '',
    msku:        item.SellerSKU || '',  // SellerSKU IS the MSKU on Amazon
    name:        item.Title     || '',
    asin:        item.ASIN      || '',
    quantity:    Number(item.QuantityOrdered) || 1,
    price:       parseFloat(item.ItemPrice?.Amount || 0),
    isGift:      item.IsGift === 'true' || item.IsGift === true,
    giftMessage: item.GiftMessageText || '',
    imei:        item.SerialNumberRequired === 'true' ? 'REQUIRED' : undefined,
  }));

  const firstItem = normalizedItems[0] || {};

  return {
    platform:           'amazon',
    orderId:            raw.AmazonOrderId,
    platformOrderId:    raw.AmazonOrderId,
    platformStatus:     raw.OrderStatus,
    fulfillmentChannel,

    // Product
    productName: firstItem.name || '',
    sku:         firstItem.sku  || '',
    msku:        firstItem.msku || '',
    quantity:    normalizedItems.reduce((s, i) => s + i.quantity, 0) || 1,
    items:       normalizedItems,

    // Gift
    isGift,
    giftMessage,

    // Buyer
    buyerName:  buyerInfo.BuyerName  || '',
    buyerEmail: buyerInfo.BuyerEmail || '',
    address: {
      line1:   addr.AddressLine1  || '',
      line2:   addr.AddressLine2  || '',
      city:    addr.City          || '',
      state:   addr.StateOrRegion || '',
      pincode: addr.PostalCode    || '',
      country: addr.CountryCode   || 'IN',
    },

    // Financials
    // Amazon uses PaymentMethod:'Other' with PaymentMethodDetails:['COD'] for COD orders
    orderValue: parseFloat(raw.OrderTotal?.Amount || 0),
    isCOD: raw.PaymentMethod === 'COD'
      || (Array.isArray(raw.PaymentMethodDetails) && raw.PaymentMethodDetails.includes('COD')),
    codAmount: (raw.PaymentMethod === 'COD'
      || (Array.isArray(raw.PaymentMethodDetails) && raw.PaymentMethodDetails.includes('COD')))
        ? parseFloat(raw.OrderTotal?.Amount || 0) : 0,

    // Timestamps
    platformCreatedAt: raw.PurchaseDate ? new Date(raw.PurchaseDate) : null,

    rawData: raw,
  };
};

/* ══════════════════════════════════════════════════════════════════════
   7. FULL USER SYNC
   Fetches all pages of orders, then items for each order.
   Called by the background sync job and manual sync endpoint.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Sync all Amazon orders for one user.
 *
 * @param {string|ObjectId} userId
 * @param {Object}  [options]
 * @param {number}  [options.daysAgo=7]  - How many days back to fetch
 * @returns {{ imported: number, updated: number, errors: number }}
 */
exports.syncUserOrders = async (userId, { daysAgo } = {}) => {
  const platform = await Platform
    .findOne({ userId, platformName: 'amazon', isConnected: true })
    .select('+_accessToken +_refreshToken');

  if (!platform) throw new Error('Amazon account not connected for this user');

  await ensureFreshToken(platform);

  const syncFrom = new Date(
    Date.now() - (daysAgo ?? platform.settings?.syncFromDaysAgo ?? 7) * 86_400_000
  );

  let nextToken = null;
  let imported  = 0;
  let updated   = 0;
  let errors    = 0;

  logger.info(`Amazon sync start — user ${userId}, from ${syncFrom.toISOString()}`);

  try {
    do {
      const { orders: rawOrders, nextToken: nt } = await exports.fetchOrders(platform, {
        createdAfter: syncFrom.toISOString(),
        nextToken,
      });

      for (const raw of rawOrders) {
        try {
          // Rate limit: ~200ms between item fetches to stay under 0.5 req/s burst
          await delay(200);
          const items = await exports.fetchOrderItems(platform, raw.AmazonOrderId)
            .catch((e) => {
              logger.warn(`fetchOrderItems failed for ${raw.AmazonOrderId}: ${e.message}`);
              return [];
            });

          const normalized = {
            ...exports.normalizeOrder(raw, items),
            userId,
            syncedAt: new Date(),
          };

          const existing = await Order.findOne({
            userId,
            platform: 'amazon',
            orderId:  normalized.orderId,
          });

          if (!existing) {
            await Order.create(normalized);
            imported++;
          } else {
            // Update mutable fields — don't overwrite courier/AWB the seller may have set
            await Order.updateOne(
              { _id: existing._id },
              {
                $set: {
                  platformStatus:    normalized.platformStatus,
                  fulfillmentChannel: normalized.fulfillmentChannel,
                  items:             normalized.items,
                  isGift:            normalized.isGift,
                  giftMessage:       normalized.giftMessage,
                  syncedAt:          normalized.syncedAt,
                },
              }
            );
            updated++;
          }
        } catch (err) {
          logger.error(`Order sync error (${raw.AmazonOrderId}): ${err.message}`);
          errors++;
        }
      }

      nextToken = nt;
      // SP-API Orders list: 1 req/60s rate limit, but burst of 20 allows faster paging
      if (nextToken) await delay(1000);
    } while (nextToken);

    // Update sync metadata
    platform.lastSyncAt         = new Date();
    platform.lastSyncStatus     = errors > 0 ? 'partial' : 'success';
    platform.lastSyncError      = errors > 0 ? `${errors} orders failed to sync` : null;
    platform.totalOrdersSynced += imported;
    await platform.save();

    logger.info(`Amazon sync done — user ${userId}: ${imported} new, ${updated} updated, ${errors} errors`);
    return { imported, updated, errors };

  } catch (err) {
    platform.lastSyncStatus = 'failed';
    platform.lastSyncError  = err.message;
    await platform.save();
    throw err;
  }
};
