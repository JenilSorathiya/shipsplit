'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/platforms.controller');
const { authenticate } = require('../middleware/auth.middleware');

/* ─── Amazon OAuth callback — public (Amazon redirects here after consent) ── */
router.get('/amazon/callback', ctrl.handleAmazonCallback);

/* ─── All routes below require JWT auth ──────────────────────────────────── */
router.use(authenticate);

router.get('/amazon/oauth-url',   ctrl.getOAuthUrl);          // Step 1: get consent URL
router.get('/',                   ctrl.getAllPlatforms);        // List all connected platforms
router.get('/:name',              ctrl.getPlatform);           // Get one platform status
router.delete('/:name',           ctrl.disconnectPlatform);    // Disconnect
router.post('/:name/sync',        ctrl.syncPlatform);          // Manual sync
router.put('/:name/settings',     ctrl.updatePlatformSettings); // Update auto-sync settings

module.exports = router;
