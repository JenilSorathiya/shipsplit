/**
 * Flipkart Seller API integration.
 * Docs: https://seller.flipkart.com/api-docs/
 */
const axios  = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://api.flipkart.net/sellers';

const authHeader = (platform) => ({
  Authorization: `Bearer ${platform.accessToken}`,
  'Content-Type': 'application/json',
});

/* ── Token refresh ───────────────────────────────────────────────────── */
exports.refreshAccessToken = async (platform) => {
  const { data } = await axios.post('https://api.flipkart.net/oauth-service/oauth/token', null, {
    params: {
      grant_type:    'refresh_token',
      refresh_token: platform.refreshToken,
    },
    auth: {
      username: process.env.FLIPKART_CLIENT_ID,
      password: process.env.FLIPKART_CLIENT_SECRET,
    },
  });
  return {
    accessToken: data.access_token,
    expiresIn:   data.expires_in,
  };
};

/* ── Fetch orders ────────────────────────────────────────────────────── */
exports.fetchOrders = async (platform, { createdAfter, nextPageUrl } = {}) => {
  try {
    const url = nextPageUrl || `${BASE_URL}/v3/orders/newOrders`;
    const { data } = await axios.get(url, {
      headers: authHeader(platform),
      params: nextPageUrl ? undefined : {
        orderItemStates: 'APPROVED',
        pageSize:        50,
      },
    });

    const orders     = (data.orderItems || []).map(normalizeOrder);
    const nextPage   = data.nextPageUrl || null;

    return { orders, nextToken: nextPage };
  } catch (err) {
    logger.error('Flipkart fetchOrders error:', err.response?.data || err.message);
    throw err;
  }
};

function normalizeOrder(raw) {
  const addr = raw.shippingAddress || {};

  return {
    platform:        'flipkart',
    orderId:         raw.orderItemId,
    platformOrderId: raw.orderId,
    platformStatus:  raw.state,
    productName:     raw.product?.title || '',
    sku:             raw.product?.sku   || '',
    quantity:        raw.quantity || 1,
    buyerName:       addr.name    || '',
    buyerPhone:      addr.phone   || '',
    address: {
      line1:   addr.addressLine1,
      line2:   addr.addressLine2,
      city:    addr.city,
      state:   addr.state,
      pincode: addr.pincode,
      country: 'India',
    },
    orderValue:        parseFloat(raw.sellingPrice?.amount || 0),
    isCOD:             raw.paymentType === 'COD',
    codAmount:         raw.paymentType === 'COD' ? parseFloat(raw.sellingPrice?.amount || 0) : 0,
    platformCreatedAt: raw.orderDate ? new Date(raw.orderDate) : null,
    rawData:           raw,
  };
}
