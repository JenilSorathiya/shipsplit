const router = require('express').Router();
const { body } = require('express-validator');
const paymentsController = require('../controllers/payments.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// Webhook does NOT need auth (Razorpay calls it)
router.post('/webhook', express_raw(), paymentsController.handleWebhook);

router.use(authenticate);

router.post('/subscribe',
  [body('plan').isIn(['starter', 'growth', 'pro'])],
  validate,
  paymentsController.subscribe
);

router.post('/verify',
  [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
  ],
  validate,
  paymentsController.verifyPayment
);

router.get('/invoices', paymentsController.getInvoices);
router.post('/cancel', paymentsController.cancelSubscription);

function express_raw() {
  return require('express').raw({ type: 'application/json' });
}

module.exports = router;
