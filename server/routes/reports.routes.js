const router   = require('express').Router();
const ctrl     = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/dashboard',         ctrl.getDashboardStats);
router.get('/summary',           ctrl.getSummary);
router.get('/orders-by-day',     ctrl.getOrdersByDay);
router.get('/courier-breakdown', ctrl.getCourierBreakdown);
router.get('/sku-breakdown',     ctrl.getSkuBreakdown);
router.get('/export.csv',        ctrl.exportCsv);

module.exports = router;
