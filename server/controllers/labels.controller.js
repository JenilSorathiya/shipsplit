'use strict';

const fs          = require('fs');
const fsp         = require('fs/promises');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');

const Label     = require('../models/Label.model');
const Order     = require('../models/Order.model');
const pdfSvc    = require('../services/pdfService');
const AppError  = require('../utils/AppError');
const { success, created, paginated } = require('../utils/response');
const logger    = require('../utils/logger');

/* ── Progress store (in-memory; replace with Redis for multi-process) ─ */
const progressStore = new Map();  // jobId → { pct, message, status }

function setProgress(jobId, pct, message, status = 'processing') {
  progressStore.set(jobId, { pct, message, status, updatedAt: Date.now() });
}
function clearProgress(jobId) {
  setTimeout(() => progressStore.delete(jobId), 5 * 60 * 1000);  // keep 5 min
}

/* ══════════════════════════════════════════════════════════════════
   GET /labels
══════════════════════════════════════════════════════════════════ */
exports.getLabels = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const skip   = (page - 1) * limit;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const [labels, total] = await Promise.all([
      Label.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Label.countDocuments(filter),
    ]);

    paginated(res, labels, { page, limit, total });
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════
   GET /labels/:id
══════════════════════════════════════════════════════════════════ */
exports.getLabel = async (req, res, next) => {
  try {
    const label = await Label.findOne({ _id: req.params.id, userId: req.user._id });
    if (!label) return next(AppError.notFound('Label not found'));
    success(res, { label });
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════
   GET /labels/:id/status   — poll generation progress
══════════════════════════════════════════════════════════════════ */
exports.getLabelStatus = async (req, res, next) => {
  try {
    const label = await Label.findOne(
      { _id: req.params.id, userId: req.user._id },
      'status error labelCount pageCount files generatedAt'
    ).lean();
    if (!label) return next(AppError.notFound('Label job not found'));

    const progress = progressStore.get(req.params.id) || null;
    success(res, { label, progress });
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════
   POST /labels/upload-pdf
   Upload a platform-generated PDF; store it; return batchId + page count.
══════════════════════════════════════════════════════════════════ */
exports.uploadLabelPdf = async (req, res, next) => {
  try {
    if (!req.file) return next(AppError.badRequest('PDF file is required'));
    const { platform } = req.body;
    const batchId      = uuidv4();

    // Store PDF and get page count
    const pageCount = await pdfSvc.splitAndExtractLabels({
      filePath: req.file.path,
      platform,
      userId:   req.user._id.toString(),
      batchId,
    });

    // Clean up multer temp file (already copied to uploads/source/)
    fs.unlink(req.file.path, () => {});

    // Create a placeholder Label record representing the uploaded source
    const label = await Label.create({
      userId:    req.user._id,
      batchId,
      status:    'ready',          // ready to be split/generated
      pageCount,
      labelCount: pageCount,
      sourcePdfKey: pdfSvc.sourcePath(batchId),
      generatedAt: new Date(),
    });

    created(res, {
      labelId:   label._id,
      batchId,
      pageCount,
      message:   `${pageCount} label pages detected. Map your orders and click Generate.`,
    });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

/* ══════════════════════════════════════════════════════════════════
   POST /labels/generate
   Core endpoint: split a source PDF (or compile from order data)
   and produce downloadable output PDFs.

   Body:
     orderIds[]   - DB order IDs (aligned to PDF pages if batchId given)
     splitType    - 'courier'|'sku'|'product'|'orderid'|'gift'|'none'
     batchId?     - reference to uploaded source PDF (upload-pdf flow)
     settings?    - label customisation options
     createZip?   - bundle outputs into ZIP (default true when >1 file)
══════════════════════════════════════════════════════════════════ */
exports.generateLabels = async (req, res, next) => {
  try {
    const {
      orderIds,
      splitType  = 'none',
      batchId,
      settings   = {},
      createZip,
    } = req.body;

    // ── Fetch & validate orders ─────────────────────────────────
    const orders = await Order.find({
      _id:    { $in: orderIds },
      userId: req.user._id,
    }).lean();

    if (!orders.length) return next(AppError.badRequest('No matching orders found'));

    if (orders.length > 500) {
      return next(AppError.badRequest('Maximum 500 orders per batch'));
    }

    // ── Create job record ────────────────────────────────────────
    const jobId   = uuidv4();
    const labelJob = await Label.create({
      userId:    req.user._id,
      orderIds:  orders.map((o) => o._id),
      batchId:   batchId || null,
      splitType,
      settings,
      status:    'processing',
      labelCount: orders.length,
    });

    const jid = labelJob._id.toString();
    setProgress(jid, 0, 'Queued');

    // ── Respond immediately — processing is async ────────────────
    created(res, {
      labelId:    labelJob._id,
      jobId,
      orderCount: orders.length,
    }, 'Label generation started');

    // ── Background processing ────────────────────────────────────
    setImmediate(async () => {
      try {
        setProgress(jid, 5, 'Loading source PDF');

        let pdfBuffer;
        if (batchId) {
          // User uploaded a platform PDF → use it
          try {
            pdfBuffer = await pdfSvc.loadSourcePdf(batchId);
          } catch {
            throw new Error(`Source PDF not found for batchId=${batchId}`);
          }

          // Validate page count vs order count
          const pageCount = await pdfSvc.getPageCount(pdfBuffer);
          if (pageCount < orders.length) {
            logger.warn(
              `[PDF] page count ${pageCount} < order count ${orders.length}; ` +
              'extra orders will be ignored'
            );
          }
        } else {
          // No uploaded PDF → compile from order data
          setProgress(jid, 10, 'Compiling labels from order data');
          pdfBuffer = await pdfSvc.compileLabelsIntoPdf(orders, {
            pageSize:      settings.pageSize      || 'A4',
            labelsPerPage: settings.labelsPerPage || 4,
            settings,
          });
        }

        // ── Run the split engine ─────────────────────────────────
        const { files, zipUrl } = await pdfSvc.processLabels({
          pdfBuffer,
          orders,
          splitType,
          settings,
          createZip: createZip !== false && orders.length > 1,
          jobId,
          onProgress: (pct, msg) => setProgress(jid, pct, msg),
        });

        // ── Persist results to DB ────────────────────────────────
        const outputFiles = files.map((f) => ({
          name:      f.name,
          url:       f.url,
          pageCount: f.pageCount,
          orders:    f.orders,
          key:       f.key,
        }));

        await Label.findByIdAndUpdate(labelJob._id, {
          status:      'ready',
          pageCount:   files.reduce((s, f) => s + f.pageCount, 0),
          files:       outputFiles,
          zipUrl:      zipUrl || null,
          generatedAt: new Date(),
        });

        setProgress(jid, 100, 'Done', 'ready');
        clearProgress(jid);

        logger.info(
          `[PDF] job ${jid} complete — ${files.length} file(s), splitType=${splitType}`
        );
      } catch (err) {
        logger.error(`[PDF] job ${jid} failed:`, err.message);
        await Label.findByIdAndUpdate(labelJob._id, {
          status: 'failed',
          error:  err.message,
        });
        setProgress(jid, 0, err.message, 'failed');
        clearProgress(jid);
      }
    });
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════
   POST /labels/download
   Compile and stream a PDF from ready label job(s).
   Used when user wants to re-download without going through /generate.
══════════════════════════════════════════════════════════════════ */
exports.downloadLabels = async (req, res, next) => {
  try {
    const { labelIds, settings = {} } = req.body;

    const labelJobs = await Label.find({
      _id:    { $in: labelIds },
      userId: req.user._id,
    }).populate('orderIds').lean();

    if (!labelJobs.length) return next(AppError.notFound('No labels found'));

    // ── If all jobs have saved files, redirect to the first one ─
    const firstWithFiles = labelJobs.find((lj) => lj.files?.length);
    if (firstWithFiles?.files?.[0]?.url && labelIds.length === 1) {
      return res.redirect(firstWithFiles.files[0].url);
    }

    // ── Otherwise compile from order data ───────────────────────
    const allOrders = labelJobs.flatMap((lj) => lj.orderIds || []);
    if (!allOrders.length) return next(AppError.badRequest('No orders in selected labels'));

    const pdfBuffer = await pdfSvc.compileLabelsIntoPdf(allOrders, {
      pageSize:      settings.pageSize      || 'A4',
      labelsPerPage: settings.labelsPerPage || 4,
      settings,
    });

    await Label.updateMany(
      { _id: { $in: labelIds } },
      { $inc: { downloadCount: 1 }, $set: { lastDownloadAt: new Date() } }
    );

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="shipsplit-labels-${Date.now()}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════
   GET /labels/:id/download/:filename
   Stream a specific output file from a completed job.
══════════════════════════════════════════════════════════════════ */
exports.downloadFile = async (req, res, next) => {
  try {
    const { id, filename } = req.params;

    // Verify ownership
    const label = await Label.findOne({ _id: id, userId: req.user._id }).lean();
    if (!label) return next(AppError.notFound('Label job not found'));
    if (label.status !== 'ready') return next(AppError.badRequest('Label job is not ready'));

    // Verify filename is one of the recorded output files
    const validName = label.files?.some((f) => f.name === filename) ||
                      filename === 'all_labels.zip';
    if (!validName) return next(AppError.notFound('File not found'));

    const filePath = path.join(
      process.cwd(), 'uploads', 'output',
      label._id.toString(), filename
    );

    try { await fsp.access(filePath); } catch {
      return next(AppError.notFound('File not found on disk'));
    }

    const isZip = filename.endsWith('.zip');
    res.set({
      'Content-Type':        isZip ? 'application/zip' : 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    // Update download counter
    await Label.updateOne(
      { _id: id },
      { $inc: { downloadCount: 1 }, $set: { lastDownloadAt: new Date() } }
    );

    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════
   POST /labels/merge
   Merge multiple existing label PDFs into one.
══════════════════════════════════════════════════════════════════ */
exports.mergeLabels = async (req, res, next) => {
  try {
    const { labelIds } = req.body;
    if (!labelIds?.length) return next(AppError.badRequest('labelIds required'));

    const labels = await Label.find({ _id: { $in: labelIds }, userId: req.user._id }).lean();
    if (!labels.length) return next(AppError.notFound('No labels found'));

    const buffers = [];
    for (const label of labels) {
      const f = label.files?.[0];
      if (!f) continue;
      const p = path.join(process.cwd(), 'uploads', 'output', label._id.toString(), f.name);
      try {
        buffers.push(await fsp.readFile(p));
      } catch {
        logger.warn(`[PDF] merge: file missing for label ${label._id}`);
      }
    }

    if (!buffers.length) return next(AppError.badRequest('No PDF files available to merge'));

    const merged = await pdfSvc.mergeLabels(buffers);

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="merged-labels-${Date.now()}.pdf"`,
      'Content-Length':      merged.length,
    });
    res.send(merged);
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════════════════════════════
   DELETE /labels/:id
══════════════════════════════════════════════════════════════════ */
exports.deleteLabel = async (req, res, next) => {
  try {
    const label = await Label.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!label) return next(AppError.notFound('Label not found'));

    // Clean up output files
    if (label._id) {
      const dir = path.join(process.cwd(), 'uploads', 'output', label._id.toString());
      fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    if (label.batchId) {
      pdfSvc.deleteSourcePdf(label.batchId).catch(() => {});
    }

    success(res, null, 'Label deleted');
  } catch (err) { next(err); }
};
