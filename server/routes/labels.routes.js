'use strict';

const router   = require('express').Router();
const ctrl     = require('../controllers/labels.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadLimiter, labelLimiter } = require('../middleware/rateLimiter.middleware');
const { uploadPDF } = require('../middleware/upload.middleware');
const v        = require('../validations/labels.validation');

router.use(authenticate);

/* ── List & single ───────────────────────────────────────────────── */
router.get('/',     validate(v.getLabels, 'query'), ctrl.getLabels);
router.get('/:id',                                  ctrl.getLabel);

/* ── Job status (polled by frontend during async generation) ─────── */
router.get('/:id/status', ctrl.getLabelStatus);

/* ── Per-file download from a completed job ──────────────────────── */
router.get('/:id/download/:filename', ctrl.downloadFile);

/* ── PDF upload (store platform label PDF) ───────────────────────── */
router.post(
  '/upload-pdf',
  uploadLimiter,
  uploadPDF.single('file'),
  validate(v.uploadLabelPdf),
  ctrl.uploadLabelPdf
);

/* ── Generate (async split engine) ──────────────────────────────── */
router.post(
  '/generate',
  labelLimiter,
  validate(v.generateLabels),
  ctrl.generateLabels
);

/* ── Download / recompile ────────────────────────────────────────── */
router.post('/download', validate(v.downloadLabels), ctrl.downloadLabels);

/* ── Merge multiple label jobs into one PDF ──────────────────────── */
router.post('/merge', ctrl.mergeLabels);

/* ── Delete ──────────────────────────────────────────────────────── */
router.delete('/:id', ctrl.deleteLabel);

module.exports = router;
