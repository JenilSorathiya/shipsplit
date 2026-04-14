const router = require('express').Router();
const ctrl   = require('../controllers/remittances.controller');
const { authenticate } = require('../middleware/auth.middleware');

/* All remittance routes require a valid session */
router.use(authenticate);

/* ── Stats / calendar (before generic GET / to avoid :id clash) ───────── */
router.get('/stats',    ctrl.getRemittanceStats);
router.get('/calendar', ctrl.getUpcomingCalendar);

/* ── List ────────────────────────────────────────────────────────────── */
router.get('/', ctrl.getRemittances);

/* ── Sync COD orders → remittances ───────────────────────────────────── */
router.post('/sync', ctrl.syncRemittances);

module.exports = router;
