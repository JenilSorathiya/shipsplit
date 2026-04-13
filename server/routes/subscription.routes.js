const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const v        = require('../validations/subscription.validation');

// Webhook is handled directly in server.js (before body parsers) for raw body access

router.use(authenticate);

router.get('/',              ctrl.getSubscription);
router.get('/invoices',      ctrl.getInvoices);
router.post('/create-order', validate(v.createOrder),        ctrl.createOrder);
router.post('/verify',       validate(v.verifyPayment),      ctrl.verifyPayment);
router.post('/cancel',       validate(v.cancelSubscription), ctrl.cancelSubscription);

module.exports = router;
