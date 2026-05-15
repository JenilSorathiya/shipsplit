const router   = require('express').Router();
const ctrl     = require('../controllers/orders.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');
const { uploadCSV } = require('../middleware/upload.middleware');
const v        = require('../validations/orders.validation');
const {
  requireActivePlan,
  checkOrderLimit,
  checkPlatformAccess,
} = require('../middleware/planLimits.middleware');

router.use(authenticate);

router.get('/',       validate(v.getOrders, 'query'), ctrl.getOrders);
router.post('/bulk-label',                                            ctrl.bulkDownloadLabels);
router.get('/:id',                                                     ctrl.getOrder);
router.get('/:id/label',                                              ctrl.downloadOrderLabel);
router.post('/:id/accept',  requireActivePlan,                        ctrl.acceptOrder);
router.post('/:id/confirm-shipped',                                    ctrl.confirmOrderShipped);
router.post('/:id/reject',                                             ctrl.rejectOrder);
router.patch('/:id',        validate(v.updateOrder),                  ctrl.updateOrder);
router.delete('/:id',                                                  ctrl.deleteOrder);

/* ── CSV import ──────────────────────────────────────────────────────── */
router.post('/upload',
  requireActivePlan,
  checkOrderLimit,
  uploadLimiter,
  uploadCSV.single('file'),
  validate(v.uploadOrders),
  ctrl.uploadOrders
);

/* ── Courier assignment ──────────────────────────────────────────────── */
router.post('/bulk-assign-courier', validate(v.bulkAssignCourier), ctrl.bulkAssignCourier);
router.post('/:id/assign-courier',  validate(v.assignCourier),     ctrl.assignCourier);

/* ── Platform sync — requires active plan + platform in plan ─────────── */
router.post('/sync', requireActivePlan, checkPlatformAccess, checkOrderLimit, ctrl.syncOrders);

/* ── Delete all orders for this user (clears stale test data) ──────── */
router.delete('/', ctrl.deleteAllOrders);

module.exports = router;
