const router = require('express').Router();
const ctrl   = require('../controllers/returns.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

/* ── Stats (must come before /:id to avoid route conflict) ───────────── */
router.get('/stats', ctrl.getReturnStats);

/* ── List ────────────────────────────────────────────────────────────── */
router.get('/', ctrl.getReturns);

/* ── Update ──────────────────────────────────────────────────────────── */
router.patch('/:id', ctrl.updateReturn);

/* ── Sync from platform orders ───────────────────────────────────────── */
router.post('/sync', ctrl.syncReturns);

module.exports = router;
