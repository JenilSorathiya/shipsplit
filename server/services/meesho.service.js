/**
 * Meesho Supplier API integration.
 * Docs: https://supplier.meesho.com/api-docs
 */
const axios  = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://supplier.meesho.com/api/v1';

const authHeader = (platform) => ({
  Authorization: `Bearer ${platform.accessToken}`,
  'Content-Type': 'application/json',
});

/* ── Token refresh ───────────────────────────────────────────────────── */
exports.refreshAccessToken = async (platform) => {
  const { data } = await axios.post(`${BASE_URL}/auth/token/refresh`, {
    refresh_token: platform.refreshToken,
    client_id:     process.env.MEESHO_CLIENT_ID,
  });
  return {
    accessToken: data.access_token,
    expiresIn:   data.expires_in,
  };
};

/* ── Fetch orders ────────────────────────────────────────────────────── */
exports.fetchOrders = async (platform, { page = 1 } = {}) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/supplier/orders`, {
      headers: authHeader(platform),
      params: { page, page_size: 50, status: 'APPROVED' },
    });

    const orders   = (data.data || []).map(normalizeOrder);
    const hasMore  = data.meta?.has_next || false;

    return { orders, nextToken: hasMore ? page + 1 : null };
  } catch (err) {
    logger.error('Meesho fetchOrders error:', err.response?.data || err.message);
    throw err;
  }
};

function normalizeOrder(raw) {
  const addr = raw.shipping_address || {};

  return {
    platform:        'meesho',
    orderId:         String(raw.sub_order_number || raw.order_number),
    platformOrderId: String(raw.order_number),
    platformStatus:  raw.status,
    productName:     raw.product_details?.[0]?.name || '',
    sku:             raw.product_details?.[0]?.sku  || '',
    quantity:        raw.quantity || 1,
    buyerName:       addr.name  || '',
    buyerPhone:      addr.phone || '',
    address: {
      line1:   addr.address,
      city:    addr.city,
      state:   addr.state,
      pincode: addr.pincode,
      country: 'India',
    },
    orderValue:        parseFloat(raw.amount || 0),
    isCOD:             raw.payment_method === 'COD',
    codAmount:         raw.payment_method === 'COD' ? parseFloat(raw.amount || 0) : 0,
    platformCreatedAt: raw.created_at ? new Date(raw.created_at) : null,
    rawData:           raw,
  };
}
