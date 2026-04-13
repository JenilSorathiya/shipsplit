// ============================================================
// ShipSplit - Shared Constants
// ============================================================

const PLATFORMS = {
  AMAZON: 'amazon',
  FLIPKART: 'flipkart',
  MEESHO: 'meesho',
  MYNTRA: 'myntra',
};

const PLATFORM_LABELS = {
  [PLATFORMS.AMAZON]: 'Amazon',
  [PLATFORMS.FLIPKART]: 'Flipkart',
  [PLATFORMS.MEESHO]: 'Meesho',
  [PLATFORMS.MYNTRA]: 'Myntra',
};

const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  LABEL_GENERATED: 'label_generated',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
};

const LABEL_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  DOWNLOADED: 'downloaded',
  FAILED: 'failed',
};

const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  GROWTH: 'growth',
  PRO: 'pro',
};

const PLAN_LIMITS = {
  [SUBSCRIPTION_PLANS.FREE]: { orders: 50, labels: 50, users: 1 },
  [SUBSCRIPTION_PLANS.STARTER]: { orders: 500, labels: 500, users: 2 },
  [SUBSCRIPTION_PLANS.GROWTH]: { orders: 2000, labels: 2000, users: 5 },
  [SUBSCRIPTION_PLANS.PRO]: { orders: Infinity, labels: Infinity, users: Infinity },
};

const PLAN_PRICES = {
  [SUBSCRIPTION_PLANS.FREE]: 0,
  [SUBSCRIPTION_PLANS.STARTER]: 499,
  [SUBSCRIPTION_PLANS.GROWTH]: 1299,
  [SUBSCRIPTION_PLANS.PRO]: 2999,
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const UPLOAD_TYPES = {
  LABEL_PDF: 'label_pdf',
  ORDER_CSV: 'order_csv',
};

const LABEL_PAGE_SIZES = {
  A4: 'A4',
  A6: 'A6',
  LETTER: 'Letter',
};

const LABELS_PER_PAGE = {
  [LABEL_PAGE_SIZES.A4]: [1, 2, 4, 6],
  [LABEL_PAGE_SIZES.A6]: [1],
  [LABEL_PAGE_SIZES.LETTER]: [1, 2, 4],
};

const FILE_UPLOAD_LIMITS = {
  PDF_MAX_SIZE: 50 * 1024 * 1024,   // 50 MB
  CSV_MAX_SIZE: 10 * 1024 * 1024,   // 10 MB
  MAX_FILES_PER_UPLOAD: 10,
};

const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PDF_PROCESSING_FAILED: 'PDF_PROCESSING_FAILED',
  DUPLICATE_ORDER: 'DUPLICATE_ORDER',
};

module.exports = {
  PLATFORMS,
  PLATFORM_LABELS,
  ORDER_STATUS,
  LABEL_STATUS,
  SUBSCRIPTION_PLANS,
  PLAN_LIMITS,
  PLAN_PRICES,
  PAYMENT_STATUS,
  UPLOAD_TYPES,
  LABEL_PAGE_SIZES,
  LABELS_PER_PAGE,
  FILE_UPLOAD_LIMITS,
  ERROR_CODES,
};
