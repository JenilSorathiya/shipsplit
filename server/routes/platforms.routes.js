'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/platforms.controller');
const { authenticate } = require('../middleware/auth.middleware');

/* ─── Public OAuth callbacks (platforms redirect here — no JWT required) ── */
router.get('/amazon/callback',   ctrl.handleAmazonCallback);
router.get('/flipkart/callback', ctrl.handleFlipkartCallback);

/* ─── All routes below require JWT auth ──────────────────────────────────── */
router.use(authenticate);

/* ── Amazon ─────────────────────────────────────────────────────────────── */
router.get('/amazon/oauth-url',       ctrl.getOAuthUrl);
router.post('/amazon/manual-connect', ctrl.manualConnect);

/* ── Flipkart ────────────────────────────────────────────────────────────── */
router.get('/flipkart/oauth-url',     ctrl.getFlipkartOAuthUrl);   // Third Party OAuth
router.post('/flipkart/self-connect', ctrl.flipkartSelfConnect);   // Self Access (API Key + Secret)

/* ── Generic platform routes ─────────────────────────────────────────────── */
router.get('/',                   ctrl.getAllPlatforms);
router.get('/:name',              ctrl.getPlatform);
router.delete('/:name',           ctrl.disconnectPlatform);
router.post('/:name/sync',        ctrl.syncPlatform);
router.put('/:name/settings',     ctrl.updatePlatformSettings);

module.exports = router;
