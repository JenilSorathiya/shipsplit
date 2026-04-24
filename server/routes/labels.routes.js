'use strict';

const router   = require('express').Router();
const path     = require('path');
const multer   = require('multer');
const ctrl     = require('../controllers/labels.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadLimiter, labelLimiter } = require('../middleware/rateLimiter.middleware');
const { uploadPDF } = require('../middleware/upload.middleware');
const v        = require('../validations/labels.validation');

/* ── Multer for split-upload (stores to uploads/temp) ───────────── */
const splitUpload = multer({
  dest: path.join(__dirname, '../uploads/temp'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

router.use(authenticate);

/* ── Download a previously created split ZIP (must be before /:id) ── */
router.get('/split-download/:splitId', ctrl.downloadSplitZIP);

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

/* ── Bulk PDF split: upload → auto-detect → ZIP ─────────────────── */
router.post(
  '/split-upload',
  uploadLimiter,
  splitUpload.single('labelPDF'),
  ctrl.splitUploadedPDF
);

/* ── Delete ──────────────────────────────────────────────────────── */
router.delete('/:id', ctrl.deleteLabel);

module.exports = router;
