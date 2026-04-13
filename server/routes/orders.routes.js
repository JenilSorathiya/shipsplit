const router   = require('express').Router();
const ctrl     = require('../controllers/orders.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');
const { uploadCSV } = require('../middleware/upload.middleware');
const v        = require('../validations/orders.validation');

router.use(authenticate);

router.get('/',       validate(v.getOrders, 'query'), ctrl.getOrders);
router.get('/:id',                                    ctrl.getOrder);
router.patch('/:id',  validate(v.updateOrder),        ctrl.updateOrder);
router.delete('/:id',                                 ctrl.deleteOrder);

/* ── CSV import ──────────────────────────────────────────────────────── */
router.post('/upload',
  uploadLimiter,
  uploadCSV.single('file'),
  validate(v.uploadOrders),
  ctrl.uploadOrders
);

/* ── Courier assignment ──────────────────────────────────────────────── */
router.post('/bulk-assign-courier', validate(v.bulkAssignCourier), ctrl.bulkAssignCourier);
router.post('/:id/assign-courier',  validate(v.assignCourier),     ctrl.assignCourier);

/* ── Platform sync ───────────────────────────────────────────────────── */
router.post('/sync', ctrl.syncOrders);

module.exports = router;
