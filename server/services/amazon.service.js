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
  await ensureFreshToken(platform);

  // ── Sandbox short-circuit ────────────────────────────────────────────────
  // The SP-API sandbox Orders endpoint only responds to exact static test-case
  // parameter combinations — arbitrary dates/marketplaces always 400.
  // Return mock orders so the full sync pipeline (fetch → save → UI) is testable.
  if (process.env.AMAZON_SANDBOX === 'true' && !nextToken) {
    logger.info('Sandbox mode: returning mock orders');
    const now = Date.now();
    const mockOrders = [
      {
        AmazonOrderId:          'TEST-401-1000001',
        PurchaseDate:           new Date(now - 1 * 86_400_000).toISOString(),
        LastUpdateDate:         new Date(now - 1 * 86_400_000).toISOString(),
        OrderStatus:            'Unshipped',
        FulfillmentChannel:     'MFN',
        MarketplaceId:          platform.marketplaceId || IN_MARKETPLACE,
        NumberOfItemsShipped:   0,
        NumberOfItemsUnshipped: 1,
        PaymentMethod:          'Other',
        PaymentMethodDetails:   ['COD'],
        OrderType:              'StandardOrder',
        ShipServiceLevel:       'Std IN Dom',
        OrderTotal:             { CurrencyCode: 'INR', Amount: '599.00' },
        ShippingAddress: {
          Name: 'Rahul Sharma', AddressLine1: '12 MG Road', AddressLine2: 'Andheri West',
          City: 'Mumbai', StateOrRegion: 'MH', PostalCode: '400058', CountryCode: 'IN',
        },
        BuyerInfo: { BuyerEmail: 'rahul@example.com', BuyerName: 'Rahul Sharma' },
      },
      {
        AmazonOrderId:          'TEST-402-2000002',
        PurchaseDate:           new Date(now - 2 * 86_400_000).toISOString(),
        LastUpdateDate:         new Date(now - 2 * 86_400_000).toISOString(),
        OrderStatus:            'Unshipped',
        FulfillmentChannel:     'MFN',
        MarketplaceId:          platform.marketplaceId || IN_MARKETPLACE,
        NumberOfItemsShipped:   0,
        NumberOfItemsUnshipped: 2,
        PaymentMethod:          'Other',
        PaymentMethodDetails:   ['Standard'],
        OrderType:              'StandardOrder',
        ShipServiceLevel:       'Std IN Dom',
        OrderTotal:             { CurrencyCode: 'INR', Amount: '1299.00' },
        ShippingAddress: {
          Name: 'Priya Nair', AddressLine1: '45 Gandhi Nagar', AddressLine2: 'Sector 4',
          City: 'Bengaluru', StateOrRegion: 'KA', PostalCode: '560001', CountryCode: 'IN',
        },
        BuyerInfo: { BuyerEmail: 'priya@example.com', BuyerName: 'Priya Nair' },
      },
      {
        AmazonOrderId:          'TEST-403-3000003',
        PurchaseDate:           new Date(now - 3 * 86_400_000).toISOString(),
        LastUpdateDate:         new Date(now - 3 * 86_400_000).toISOString(),
        OrderStatus:            'Unshipped',
        FulfillmentChannel:     'MFN',
        MarketplaceId:          platform.marketplaceId || IN_MARKETPLACE,
        NumberOfItemsShipped:   0,
        NumberOfItemsUnshipped: 1,
        PaymentMethod:          'Other',
        PaymentMethodDetails:   ['COD'],
        OrderType:              'StandardOrder',
        ShipServiceLevel:       'Exp IN Dom',
        OrderTotal:             { CurrencyCode: 'INR', Amount: '849.00' },
        ShippingAddress: {
          Name: 'Amit Verma', AddressLine1: '78 Civil Lines',
          City: 'Delhi', StateOrRegion: 'DL', PostalCode: '110054', CountryCode: 'IN',
        },
        BuyerInfo: { BuyerEmail: 'amit@example.com', BuyerName: 'Amit Verma' },
      },
      {
        AmazonOrderId:          'TEST-404-4000004',
        PurchaseDate:           new Date(now - 4 * 86_400_000).toISOString(),
        LastUpdateDate:         new Date(now - 4 * 86_400_000).toISOString(),
        OrderStatus:            'Unshipped',
        FulfillmentChannel:     'MFN',
        MarketplaceId:          platform.marketplaceId || IN_MARKETPLACE,
        NumberOfItemsShipped:   0,
        NumberOfItemsUnshipped: 1,
        PaymentMethod:          'Other',
        PaymentMethodDetails:   ['Standard'],
        OrderType:              'StandardOrder',
        ShipServiceLevel:       'Std IN Dom',
        OrderTotal:             { CurrencyCode: 'INR', Amount: '2499.00' },
        ShippingAddress: {
          Name: 'Sneha Kulkarni', AddressLine1: '22 FC Road', AddressLine2: 'Shivajinagar',
          City: 'Pune', StateOrRegion: 'MH', PostalCode: '411005', CountryCode: 'IN',
        },
        BuyerInfo: { BuyerEmail: 'sneha@example.com', BuyerName: 'Sneha Kulkarni' },
      },
      {
        AmazonOrderId:          'TEST-405-5000005',
        PurchaseDate:           new Date(now - 5 * 86_400_000).toISOString(),
        LastUpdateDate:         new Date(now - 5 * 86_400_000).toISOString(),
        OrderStatus:            'Unshipped',
        FulfillmentChannel:     'MFN',
        MarketplaceId:          platform.marketplaceId || IN_MARKETPLACE,
        NumberOfItemsShipped:   0,
        NumberOfItemsUnshipped: 3,
        PaymentMethod:          'Other',
        PaymentMethodDetails:   ['COD'],
        OrderType:              'StandardOrder',
        ShipServiceLevel:       'Std IN Dom',
        OrderTotal:             { CurrencyCode: 'INR', Amount: '1799.00' },
        ShippingAddress: {
          Name: 'Mohammed Khan', AddressLine1: '5 Linking Road', AddressLine2: 'Bandra West',
          City: 'Mumbai', StateOrRegion: 'MH', PostalCode: '400050', CountryCode: 'IN',
        },
        BuyerInfo: { BuyerEmail: 'mkhan@example.com', BuyerName: 'Mohammed Khan' },
      },
      {
        AmazonOrderId:          'TEST-406-6000006',
        PurchaseDate:           new Date(now - 6 * 86_400_000).toISOString(),
        LastUpdateDate:         new Date(now - 6 * 86_400_000).toISOString(),
        OrderStatus:            'Unshipped',
        FulfillmentChannel:     'MFN',
        MarketplaceId:          platform.marketplaceId || IN_MARKETPLACE,
        NumberOfItemsShipped:   0,
        NumberOfItemsUnshipped: 1,
        PaymentMethod:          'Other',
        PaymentMethodDetails:   ['Standard'],
        OrderType:              'StandardOrder',
        ShipServiceLevel:       'Exp IN Dom',
        OrderTotal:             { CurrencyCode: 'INR', Amount: '3299.00' },
        ShippingAddress: {
          Name: 'Anjali Singh', AddressLine1: '90 Park Street',
          City: 'Kolkata', StateOrRegion: 'WB', PostalCode: '700016', CountryCode: 'IN',
        },
        BuyerInfo: { BuyerEmail: 'anjali@example.com', BuyerName: 'Anjali Singh' },
      },
    ];
    return { orders: mockOrders, nextToken: null };
  }
  // ── End sandbox short-circuit ────────────────────────────────────────────

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
  await ensureFreshToken(platform);

  // ── Sandbox short-circuit ────────────────────────────────────────────────
  if (process.env.AMAZON_SANDBOX === 'true') {
    logger.info(`Sandbox mode: returning mock order items for ${orderId}`);
    // Return different products per order so labels look realistic
    const SANDBOX_PRODUCTS = {
      'TEST-401-1000001': { asin: 'B0PROD00001', sku: 'TSHIRT-BLU-L',  title: 'Men\'s Cotton T-Shirt (Blue, L)',        qty: 1, price: '599.00'  },
      'TEST-402-2000002': { asin: 'B0PROD00002', sku: 'JEANS-BLK-32',  title: 'Slim Fit Black Jeans (32W)',             qty: 2, price: '649.50'  },
      'TEST-403-3000003': { asin: 'B0PROD00003', sku: 'SNEAKER-WHT-9', title: 'Running Sneakers (White, Size 9)',       qty: 1, price: '849.00'  },
      'TEST-404-4000004': { asin: 'B0PROD00004', sku: 'WATCH-BLK-01',  title: 'Analog Wrist Watch — Black Dial',       qty: 1, price: '2499.00' },
      'TEST-405-5000005': { asin: 'B0PROD00005', sku: 'KURTA-WHT-M',   title: 'Cotton Kurta (White, M)',                qty: 3, price: '599.67'  },
      'TEST-406-6000006': { asin: 'B0PROD00006', sku: 'BAG-LEATHER-01',title: 'Leather Laptop Bag 15.6"',              qty: 1, price: '3299.00' },
    };
    const p = SANDBOX_PRODUCTS[orderId] || { asin: 'B0SANDBOX01', sku: 'TEST-SKU-001', title: 'Sandbox Test Product', qty: 1, price: '499.00' };
    return [
      {
        ASIN:              p.asin,
        SellerSKU:         p.sku,
        OrderItemId:       `ITEM-${orderId}`,
        Title:             p.title,
        QuantityOrdered:   p.qty,
        QuantityShipped:   0,
        IsGift:            'false',
        ItemPrice:         { CurrencyCode: 'INR', Amount: p.price },
        ItemTax:           { CurrencyCode: 'INR', Amount: '0.00' },
        ShippingPrice:     { CurrencyCode: 'INR', Amount: '0.00' },
        ShippingTax:       { CurrencyCode: 'INR', Amount: '0.00' },
      },
    ];
  }
  // ── End sandbox short-circuit ────────────────────────────────────────────

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
   5c. GET ELIGIBLE SHIPPING SERVICES — POST /mfn/v0/eligibleShippingServices
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Returns an array of eligible shipping service objects for an MFN order.
 * Calls Amazon's real API (sandbox or production based on AMAZON_SANDBOX env).
 */
exports.getEligibleShippingServices = async (platform, order) => {
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
