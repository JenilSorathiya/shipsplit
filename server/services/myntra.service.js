/**
 * Myntra Partner API integration.
 * Docs: https://developer.myntra.com/
 */
const axios  = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://api.myntra.com/partner/v1';

const authHeader = (platform) => ({
  Authorization: `Bearer ${platform.accessToken}`,
  'Content-Type': 'application/json',
});

/* ── Token refresh ───────────────────────────────────────────────────── */
exports.refreshAccessToken = async (platform) => {
  const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
    refresh_token: platform.refreshToken,
    client_id:     process.env.MYNTRA_CLIENT_ID,
    client_secret: process.env.MYNTRA_CLIENT_SECRET,
  });
  return {
    accessToken: data.access_token,
    expiresIn:   data.expires_in,
  };
};

/* ── Fetch orders ────────────────────────────────────────────────────── */
exports.fetchOrders = async (platform, { page = 1 } = {}) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/orders`, {
      headers: authHeader(platform),
      params:  { status: 'DISPATCHED,PACKING_IN_PROGRESS', page, count: 50 },
    });

    const orders  = (data.orders || []).map(normalizeOrder);
    const hasMore = data.total > page * 50;

    return { orders, nextToken: hasMore ? page + 1 : null };
  } catch (err) {
    logger.error('Myntra fetchOrders error:', err.response?.data || err.message);
    throw err;
  }
};

function normalizeOrder(raw) {
  const addr = raw.pickupWarehouseAddress || {};
  const item = raw.orderItems?.[0] || {};

  return {
    platform:        'myntra',
    orderId:         String(raw.orderId),
    platformOrderId: String(raw.orderId),
    platformStatus:  raw.orderStatus,
    productName:     item.skuDescription || '',
    sku:             item.skuId          || '',
    quantity:        item.quantity || 1,
    buyerName:       raw.deliveryAddress?.name  || '',
    buyerPhone:      raw.deliveryAddress?.phone || '',
    address: {
      line1:   raw.deliveryAddress?.addressLine1,
      line2:   raw.deliveryAddress?.addressLine2,
      city:    raw.deliveryAddress?.city,
      state:   raw.deliveryAddress?.state,
      pincode: raw.deliveryAddress?.pincode,
      country: 'India',
    },
    orderValue:        parseFloat(raw.orderAmount || 0),
    isCOD:             raw.paymentType === 'COD',
    codAmount:         raw.paymentType === 'COD' ? parseFloat(raw.orderAmount || 0) : 0,
    platformCreatedAt: raw.orderDate ? new Date(raw.orderDate) : null,
    rawData:           raw,
  };
}
