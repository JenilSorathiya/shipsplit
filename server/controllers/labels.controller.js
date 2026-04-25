'use strict';

const fs          = require('fs');
const fsp         = require('fs/promises');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver    = require('archiver');
const { PDFDocument } = require('pdf-lib');

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
   Courier & platform detection constants
══════════════════════════════════════════════════════════════════ */
const pdfParse = require('pdf-parse');

const COURIER_PATTERNS = {
  'Delhivery':  [/delhivery/i],
  'Ekart':      [/ekart/i, /flipkart\s*log/i],
  'Bluedart':   [/blue\s*dart/i, /bluedart/i],
  'DTDC':       [/\bdtdc\b/i],
  'XpressBees': [/xpress\s*bees/i, /xpressbees/i],
  'Shadowfax':  [/shadowfax/i],
  'Shiprocket': [/shiprocket/i],
  'Valmo':      [/\bvalmo\b/i],
  'Amazon':     [/amazon\s*log/i, /amzl/i, /amazon\s*shipping/i],
  'Ecom':       [/ecom\s*express/i],
  'Smartr':     [/smartr/i],
};

/* ── Proper PDF text extraction using pdf-parse ──────────────────── */
async function extractPageText(pageBuffer) {
  try {
    const data = await pdfParse(pageBuffer);
    return data.text || '';
  } catch {
    return '';
  }
}

/* ── Auto-detect platform from label text ────────────────────────── */
function autoDetectPlatform(text) {
  // Meesho: has long numeric order IDs (18+ digits) and "Check the payable amount on the app"
  if (/check the payable amount on the app/i.test(text)) return 'meesho';
  if (/\d{3}-\d{7}-\d{7}/.test(text))                   return 'amazon';
  if (/\bOD\d{12}\b/.test(text))                         return 'flipkart';
  if (/\bStyle\s*ID\b/i.test(text))                      return 'myntra';
  return 'meesho'; // default for Meesho-style bulk labels
}

/* ── Detect courier from page text ──────────────────────────────── */
function detectCourier(text) {
  for (const [courier, patterns] of Object.entries(COURIER_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return courier;
    }
  }
  return 'Unknown';
}

/* ── Detect SKU/product from page text ──────────────────────────── */
function detectProduct(text, platform) {
  // ── Meesho: columns run together, e.g. "3500 2 pscFree Size1Multicolor..." ──
  if (platform === 'meesho' || /check the payable amount on the app/i.test(text)) {
    // After "Order No." header line, the SKU immediately precedes a size token
    const m = text.match(/Order\s+No\.?[^\n]*\n(.+?)(?:Free\s+Size|XS|XL|XXL|\bS\b|\bM\b|\bL\b)/i);
    if (m) return m[1].trim().slice(0, 60);
  }

  // ── Amazon: SKU or ASIN ──
  if (platform === 'amazon') {
    const asin = text.match(/\b(B0[A-Z0-9]{8})\b/);
    if (asin) return asin[1];
    const sku = text.match(/SKU[:\s]+([A-Z0-9\-_]+)/i);
    if (sku) return sku[1].trim().slice(0, 60);
    const order = text.match(/\d{3}-\d{7}-\d{7}/);
    if (order) return `Order-${order[0]}`;
  }

  // ── Flipkart: FSN ──
  if (platform === 'flipkart') {
    const fsn = text.match(/FSN[:\s]+([A-Z0-9]+)/i);
    if (fsn) return fsn[1].trim().slice(0, 60);
    const order = text.match(/OD\d{12}/);
    if (order) return `Order-${order[0]}`;
  }

  // ── Myntra: Style ID ──
  if (platform === 'myntra') {
    const style = text.match(/Style\s*ID[:\s]+(\d+)/i);
    if (style) return style[1];
  }

  // ── Generic fallback: look for Order No. pattern ──
  const genericSku = text.match(/Order\s+No\.[\s\S]{0,10}?\n\s*(.+?)\s{2,}/i);
  if (genericSku) return genericSku[1].trim().slice(0, 60);

  return 'Unknown-Product';
}

/* ── Sanitize name for use as filename/folder ────────────────────── */
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9\-_.() ]/g, '_').trim().slice(0, 50) || 'Unknown';
}

/* ══════════════════════════════════════════════════════════════════
   POST /labels/split-upload
   Upload a bulk PDF → detect couriers & products → create ZIP
══════════════════════════════════════════════════════════════════ */
exports.splitUploadedPDF = async (req, res, next) => {
  const tempFiles = [];
  try {
    if (!req.file) return next(AppError.badRequest('PDF file is required'));

    const platform = (req.body.platform || 'amazon').toLowerCase();
    const splitId  = uuidv4();

    // Ensure output directories exist
    const splitsDir = path.join(process.cwd(), 'uploads', 'splits');
    const tempDir   = path.join(process.cwd(), 'uploads', 'temp');
    fs.mkdirSync(splitsDir, { recursive: true });
    fs.mkdirSync(tempDir,   { recursive: true });

    // 1. Load the uploaded PDF
    const pdfBytes = await fsp.readFile(req.file.path);
    tempFiles.push(req.file.path);

    const srcPdf    = await PDFDocument.load(pdfBytes);
    const pageCount = srcPdf.getPageCount();

    if (pageCount === 0) return next(AppError.badRequest('PDF has no pages'));
    if (pageCount > 500) return next(AppError.badRequest('PDF too large — max 500 pages'));

    // 2. Process each page: extract text, detect courier & product, split into individual PDFs
    const pages = [];
    let detectedPlatform = platform; // may be overridden by auto-detection on first page

    for (let i = 0; i < pageCount; i++) {
      // Extract a single-page PDF buffer
      const singlePdf  = await PDFDocument.create();
      const [copiedPage] = await singlePdf.copyPages(srcPdf, [i]);
      singlePdf.addPage(copiedPage);
      const pageBytes = await singlePdf.save();

      // Extract text using pdf-parse (handles compressed streams & font encoding)
      const pageText = await extractPageText(Buffer.from(pageBytes));

      // Auto-detect platform from first page if not explicitly set
      if (i === 0) {
        detectedPlatform = autoDetectPlatform(pageText) || platform;
        logger.info(`[split-upload] auto-detected platform: ${detectedPlatform}`);
      }

      const courier = detectCourier(pageText);
      const product = detectProduct(pageText, detectedPlatform);

      logger.info(`[split-upload] page ${i + 1}: courier=${courier}, product=${product}`);

      pages.push({ index: i, courier, product, pageBytes });
    }

    // 3. Group pages by courier and by product
    // 3. Build nested groups: courier → product → [pageBytes]
    // e.g. { 'Shadowfax': { '3500 2 psc': [buf, buf], 'Gym_Hand_Gripper': [buf] } }
    const nested = {};
    for (const pg of pages) {
      if (!nested[pg.courier])               nested[pg.courier] = {};
      if (!nested[pg.courier][pg.product])   nested[pg.courier][pg.product] = [];
      nested[pg.courier][pg.product].push(pg.pageBytes);
    }

    // Summary for API response
    const courierMap = {};
    const productMap = {};
    for (const pg of pages) {
      courierMap[pg.courier] = (courierMap[pg.courier] || 0) + 1;
      productMap[pg.product] = (productMap[pg.product] || 0) + 1;
    }
    const couriers = Object.entries(courierMap).map(([name, count]) => ({ name, count }));
    const products = Object.entries(productMap).map(([name, count]) => ({ name, count }));

    // Helper: merge single-page buffers into one multi-page PDF
    async function mergePageBuffers(bufs) {
      const merged = await PDFDocument.create();
      for (const buf of bufs) {
        const src = await PDFDocument.load(buf);
        const [p] = await merged.copyPages(src, [0]);
        merged.addPage(p);
      }
      return Buffer.from(await merged.save());
    }

    // 4. Build ZIP
    const zipFileName = `shipsplit_${splitId}.zip`;
    const zipFilePath = path.join(splitsDir, zipFileName);

    const archive = archiver('zip', { zlib: { level: 6 } });
    const zipWritePromise = new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
    });

    // ── Courier → Product nested structure ──────────────────────────
    // by_courier/<Courier>/<Product>/<Product>.pdf
    for (const [courier, productMap] of Object.entries(nested)) {
      const cName = sanitizeName(courier);
      for (const [product, bufs] of Object.entries(productMap)) {
        const pName  = sanitizeName(product);
        const merged = await mergePageBuffers(bufs);
        archive.append(merged, { name: `by_courier/${cName}/${pName}/${pName}.pdf` });
      }
    }

    // ── Product → Courier nested structure ──────────────────────────
    // by_product/<Product>/<Courier>/<Courier>.pdf
    const nestedByProduct = {};
    for (const pg of pages) {
      if (!nestedByProduct[pg.product])              nestedByProduct[pg.product] = {};
      if (!nestedByProduct[pg.product][pg.courier])  nestedByProduct[pg.product][pg.courier] = [];
      nestedByProduct[pg.product][pg.courier].push(pg.pageBytes);
    }
    for (const [product, courierMap] of Object.entries(nestedByProduct)) {
      const pName = sanitizeName(product);
      for (const [courier, bufs] of Object.entries(courierMap)) {
        const cName  = sanitizeName(courier);
        const merged = await mergePageBuffers(bufs);
        archive.append(merged, { name: `by_product/${pName}/${cName}/${cName}.pdf` });
      }
    }

    // ── All labels in one PDF ────────────────────────────────────────
    // all_labels/all_labels.pdf
    const allMerged = await mergePageBuffers(pages.map(p => p.pageBytes));
    archive.append(allMerged, { name: 'all_labels/all_labels.pdf' });

    archive.finalize();
    await zipWritePromise;

    // 5. Clean up temp files
    for (const f of tempFiles) {
      fsp.unlink(f).catch(() => {});
    }

    // 6. Return summary
    const downloadUrl = `/api/labels/split-download/${splitId}`;
    return success(res, {
      splitId,
      totalPages: pageCount,
      platform: detectedPlatform,
      couriers,
      products,
      downloadUrl,
    }, `Split complete — ${pageCount} label(s) processed`);

  } catch (err) {
    // Clean up on error
    for (const f of tempFiles) {
      fsp.unlink(f).catch(() => {});
    }
    next(err);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /labels/split-download/:splitId
   Stream the ZIP file for a previous split operation.
   Optional query param: type = courier | product | all (default: all)
══════════════════════════════════════════════════════════════════ */
exports.downloadSplitZIP = async (req, res, next) => {
  try {
    const { splitId } = req.params;
    const type        = req.query.type || 'all'; // courier | product | all

    // Validate splitId is a UUID (basic safety check)
    if (!/^[0-9a-f-]{36}$/i.test(splitId)) {
      return next(AppError.badRequest('Invalid splitId'));
    }

    const splitsDir  = path.join(process.cwd(), 'uploads', 'splits');
    const zipPath    = path.join(splitsDir, `shipsplit_${splitId}.zip`);

    try { await fsp.access(zipPath); } catch {
      return next(AppError.notFound('Split ZIP not found. It may have expired.'));
    }

    const AdmZip   = require('adm-zip');
    const zip      = new AdmZip(zipPath);
    const allEntries = zip.getEntries().filter(e => !e.isDirectory);

    // 'all' → include everything (by_courier + by_product + all_labels folders)
    // 'courier' → only by_courier/<Name>/<Name>.pdf
    // 'product' → only by_product/<Name>/<Name>.pdf
    const folderPrefix =
      type === 'courier' ? 'by_courier/' :
      type === 'product' ? 'by_product/' : null; // null = all

    const entries = folderPrefix
      ? allEntries.filter(e => e.entryName.startsWith(folderPrefix))
      : allEntries; // all three sections

    res.set({
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="shipsplit_${type}_labels.zip"`,
    });

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => logger.error('[split-download] archiver error', err));
    archive.pipe(res);

    for (const entry of entries) {
      // For courier/product: strip top prefix so Shadowfax/Shadowfax.pdf is at root
      // For all: keep full path (by_courier/Shadowfax/Shadowfax.pdf, by_product/..., all_labels/...)
      const name = folderPrefix
        ? entry.entryName.slice(folderPrefix.length)
        : entry.entryName;
      archive.append(entry.getData(), { name });
    }

    await archive.finalize();
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
