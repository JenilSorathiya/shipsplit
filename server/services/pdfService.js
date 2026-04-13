'use strict';

/**
 * ShipSplit PDF Label Engine
 * --------------------------
 * Handles all PDF manipulation: splitting, merging, overlaying,
 * resizing, blank-page removal, and ZIP archiving.
 *
 * Page-to-order alignment:
 *   orders[i] is assumed to correspond to page i in the source PDF
 *   (the frontend must pass them in the same sequence as the PDF).
 *
 * Dependencies: pdf-lib, archiver
 */

const {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFName,
  PDFString,
} = require('pdf-lib');
const archiver   = require('archiver');
const fs         = require('fs');
const fsp        = require('fs/promises');
const path       = require('path');
const { Writable } = require('stream');
const logger     = require('../utils/logger');

/* ═══════════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════════ */

const PAGE_SIZES = {
  A4:     [595.28, 841.89],
  A5:     [419.53, 595.28],
  A6:     [297.64, 419.53],
  '4x6':  [288,    432   ],   // 4×6 inch label (72 pt/in)
  Letter: [612,    792   ],
};

const MAX_LABELS = 500;

/* ═══════════════════════════════════════════════════════════════════
   Directory helpers
═══════════════════════════════════════════════════════════════════ */

const UPLOADS_ROOT  = path.join(process.cwd(), 'uploads');
const SOURCE_DIR    = path.join(UPLOADS_ROOT, 'source');
const OUTPUT_DIR    = path.join(UPLOADS_ROOT, 'output');

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

/** Absolute path to a stored source PDF */
exports.sourcePath = (batchId) => path.join(SOURCE_DIR, `${batchId}.pdf`);

/** Absolute path for an output file inside a job folder */
exports.outputPath = (jobId, filename) => path.join(OUTPUT_DIR, jobId, filename);

/** Public URL for a file (Express serves /uploads statically) */
exports.publicUrl = (jobId, filename) =>
  `/uploads/output/${jobId}/${encodeURIComponent(filename)}`;

/* ═══════════════════════════════════════════════════════════════════
   Core pdf-lib helpers
═══════════════════════════════════════════════════════════════════ */

async function loadPdf(bufferOrPath) {
  const bytes = Buffer.isBuffer(bufferOrPath)
    ? bufferOrPath
    : await fsp.readFile(bufferOrPath);
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

async function extractPages(srcDoc, pageIndices) {
  if (!pageIndices.length) return null;
  const out   = await PDFDocument.create();
  const pages = await out.copyPages(srcDoc, pageIndices);
  pages.forEach((p) => out.addPage(p));
  return out;
}

async function toBuffer(doc) {
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

async function embedHelvetica(doc) {
  return doc.embedFont(StandardFonts.Helvetica);
}

async function embedHelveticaBold(doc) {
  return doc.embedFont(StandardFonts.HelveticaBold);
}

function safeFilename(str) {
  return String(str)
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

/* ═══════════════════════════════════════════════════════════════════
   Blank-page detection  (heuristic: tiny content stream ≈ blank)
═══════════════════════════════════════════════════════════════════ */

async function isBlankPage(srcDoc, pageIndex) {
  try {
    const page    = srcDoc.getPage(pageIndex);
    const content = page.node.get(PDFName.of('Contents'));
    if (!content) return true;
    // If the entire page node string representation is tiny it's blank
    return page.node.toString().length < 80;
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Overlay: info strip drawn at the bottom of a label page
═══════════════════════════════════════════════════════════════════ */

async function applyOverlay(page, order, settings, font) {
  const { width } = page.getSize();
  const stripH    = 28;
  const y0        = 0;
  const fontSize  = 6.5;
  const textColor = rgb(0.1, 0.1, 0.1);

  const parts = [];
  if (settings.showOrderId    !== false && order.orderId)
    parts.push(`Order: ${order.orderId}`);
  if (settings.showSKU        !== false && (order.sku || order.msku))
    parts.push(`SKU: ${order.sku || order.msku}`);
  if (settings.showProductName !== false && order.productName)
    parts.push(order.productName.slice(0, 30));
  if (settings.showAWB        !== false && order.awb)
    parts.push(`AWB: ${order.awb}`);

  if (!parts.length) return;

  // Light grey strip
  page.drawRectangle({
    x: 0, y: y0, width, height: stripH,
    color:       rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.4,
  });

  page.drawText(parts.join('   ·   '), {
    x: 5, y: y0 + 8,
    size: fontSize,
    font,
    color:    textColor,
    maxWidth: width - 10,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Overlay: diagonal courier watermark
═══════════════════════════════════════════════════════════════════ */

async function applyCourierWatermark(page, courierName, font) {
  const { width, height } = page.getSize();
  page.drawText(courierName.toUpperCase(), {
    x:       width  * 0.08,
    y:       height * 0.40,
    size:    46,
    font,
    color:   rgb(0.82, 0.82, 0.82),
    rotate:  degrees(32),
    opacity: 0.28,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Overlay: gift badge in top-right corner
═══════════════════════════════════════════════════════════════════ */

async function applyGiftBadge(page, font) {
  const { width, height } = page.getSize();
  const bw = 52, bh = 16;
  const x  = width - bw - 6;
  const y  = height - bh - 6;

  page.drawRectangle({
    x, y, width: bw, height: bh,
    color: rgb(0.95, 0.22, 0.22),
    borderWidth: 0,
  });
  page.drawText('GIFT ORDER', {
    x: x + 4, y: y + 4,
    size: 7.5,
    font,
    color: rgb(1, 1, 1),
  });
}

/* ═══════════════════════════════════════════════════════════════════
   PDF Bookmarks / Outlines
   pdf-lib doesn't expose a high-level outline API, so we add
   named destinations as page labels instead.
═══════════════════════════════════════════════════════════════════ */

async function addPageLabels(doc, sections) {
  // sections: [{ title, pageIndex }]
  // We set /UserUnit and draw an invisible bookmark anchor via annotations
  // For simplicity we just annotate the page dict with a label key
  for (const { title, pageIndex } of sections) {
    try {
      const page = doc.getPage(pageIndex);
      page.node.set(PDFName.of('SS_Label'), PDFString.of(title));
    } catch {
      // ignore
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ZIP archive builder
═══════════════════════════════════════════════════════════════════ */

async function buildZip(files) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const sink   = new Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); },
    });
    sink.on('finish', () => resolve(Buffer.concat(chunks)));
    sink.on('error', reject);

    const arc = archiver('zip', { zlib: { level: 6 } });
    arc.on('error', reject);
    arc.pipe(sink);

    for (const { name, buffer } of files) {
      arc.append(buffer, { name });
    }
    arc.finalize();
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Internal: group pages by key and produce output PDFs
═══════════════════════════════════════════════════════════════════ */

async function splitByGroup(srcDoc, orders, { keyFn, nameFn, settings = {}, onProgress }) {
  const pageCount = srcDoc.getPageCount();
  const effective = Math.min(pageCount, orders.length, MAX_LABELS);

  const needsOverlay = (settings.showOrderId    !== false ||
                        settings.showSKU        !== false ||
                        settings.showProductName !== false ||
                        settings.showAWB        !== false);
  const needsWatermark = !!settings.addCourierWatermark;
  const needsGiftBadge = !!settings.giftLabelSupport;

  // Group page indices by key
  const buckets = new Map();
  for (let i = 0; i < effective; i++) {
    const order = orders[i];
    const key   = keyFn(order, i) ?? 'unknown';
    if (!buckets.has(key)) buckets.set(key, { indices: [], orders: [] });
    buckets.get(key).indices.push(i);
    buckets.get(key).orders.push(order);
  }

  const results = [];
  let done = 0;

  for (const [key, { indices, orders: groupOrders }] of buckets) {
    const outDoc = await extractPages(srcDoc, indices);
    if (!outDoc) continue;

    // Apply per-page overlays
    if (needsOverlay || needsWatermark || needsGiftBadge) {
      const font     = await embedHelvetica(outDoc);
      const boldFont = needsGiftBadge ? await embedHelveticaBold(outDoc) : null;

      for (let p = 0; p < outDoc.getPageCount(); p++) {
        const order = groupOrders[p];
        const page  = outDoc.getPage(p);

        if (needsOverlay)    await applyOverlay(page, order, settings, font);
        if (needsWatermark && order.courierPartner)
          await applyCourierWatermark(page, order.courierPartner, font);
        if (needsGiftBadge && (order.isGift || order.giftMessage))
          await applyGiftBadge(page, boldFont);
      }
    }

    // Add bookmarks if requested
    if (settings.addBookmarks) {
      await addPageLabels(outDoc, groupOrders.map((o, i) => ({
        title:     o.orderId || `Page ${i + 1}`,
        pageIndex: i,
      })));
    }

    const buffer = await toBuffer(outDoc);
    results.push({
      key,
      name:      `${safeFilename(nameFn(key))}.pdf`,
      buffer,
      pageCount: outDoc.getPageCount(),
      orders:    groupOrders.map((o) => o.orderId),
    });

    done++;
    onProgress && onProgress(
      30 + Math.round((done / buckets.size) * 50),
      `Built ${done}/${buckets.size} files`
    );
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/* ═══════════════════════════════════════════════════════════════════
   Public: Split functions
═══════════════════════════════════════════════════════════════════ */

/**
 * Split PDF by courier partner.
 * Returns: [{ name: 'delhivery_labels.pdf', buffer, pageCount, orders }]
 */
exports.splitByCourier = async (pdfBuffer, orders, settings = {}, onProgress) => {
  const srcDoc = await loadPdf(pdfBuffer);
  return splitByGroup(srcDoc, orders, {
    keyFn:      (o) => o.courierPartner || 'unassigned',
    nameFn:     (k) => `${k}_labels`,
    settings,
    onProgress,
  });
};

/**
 * Split PDF by SKU / MSKU.
 * Returns: [{ name: 'SKU001_labels.pdf', buffer, pageCount, orders }]
 */
exports.splitBySku = async (pdfBuffer, orders, settings = {}, onProgress) => {
  const srcDoc = await loadPdf(pdfBuffer);
  return splitByGroup(srcDoc, orders, {
    keyFn:  (o) => o.sku || o.msku || 'no_sku',
    nameFn: (k) => `${k}_labels`,
    settings,
    onProgress,
  });
};

/**
 * Split PDF by product name.
 * Returns: [{ name: 'Product_Name_labels.pdf', buffer, pageCount, orders }]
 */
exports.splitByProduct = async (pdfBuffer, orders, settings = {}, onProgress) => {
  const srcDoc = await loadPdf(pdfBuffer);
  return splitByGroup(srcDoc, orders, {
    keyFn:  (o) => o.productName || 'unknown_product',
    nameFn: (k) => `${k}_labels`,
    settings,
    onProgress,
  });
};

/**
 * Split into one PDF per order ID.
 * Returns: [{ name: 'ORDER123.pdf', buffer, pageCount, orders }]
 */
exports.splitByOrderId = async (pdfBuffer, orders, settings = {}, onProgress) => {
  const srcDoc = await loadPdf(pdfBuffer);
  return splitByGroup(srcDoc, orders, {
    keyFn:  (o, i) => o.orderId || `page_${i + 1}`,
    nameFn: (k)    => k,
    settings,
    onProgress,
  });
};

/**
 * Amazon gift labels: separate gift orders into their own PDF.
 * Returns: [{ name: 'gift_labels.pdf', ... }, { name: 'standard_labels.pdf', ... }]
 */
exports.separateGiftLabels = async (pdfBuffer, orders, settings = {}, onProgress) => {
  const srcDoc = await loadPdf(pdfBuffer);
  return splitByGroup(srcDoc, orders, {
    keyFn:  (o) => (o.isGift || o.giftMessage) ? 'gift' : 'standard',
    nameFn: (k) => `${k}_labels`,
    settings: { ...settings, giftLabelSupport: true },
    onProgress,
  });
};

/* ═══════════════════════════════════════════════════════════════════
   Public: Merge
═══════════════════════════════════════════════════════════════════ */

/**
 * Merge multiple PDF buffers into a single PDF.
 */
exports.mergeLabels = async (pdfBuffers) => {
  const outDoc = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const src   = await loadPdf(buf);
    const count = src.getPageCount();
    const pages = await outDoc.copyPages(src, [...Array(count).keys()]);
    pages.forEach((p) => outDoc.addPage(p));
  }
  return toBuffer(outDoc);
};

/* ═══════════════════════════════════════════════════════════════════
   Public: Page utilities
═══════════════════════════════════════════════════════════════════ */

/**
 * Remove blank pages from a PDF.
 */
exports.removeBlankPages = async (pdfBuffer) => {
  const srcDoc = await loadPdf(pdfBuffer);
  const count  = srcDoc.getPageCount();
  const keep   = [];
  for (let i = 0; i < count; i++) {
    if (!(await isBlankPage(srcDoc, i))) keep.push(i);
  }
  if (keep.length === count) return pdfBuffer;
  const out = await extractPages(srcDoc, keep);
  return out ? toBuffer(out) : pdfBuffer;
};

/**
 * Resize every page to a target size.
 * @param {string} pageSize - 'A4'|'A5'|'A6'|'4x6'|'Letter'
 */
exports.resizePages = async (pdfBuffer, pageSize = 'A4') => {
  const [tw, th] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const srcDoc   = await loadPdf(pdfBuffer);
  const outDoc   = await PDFDocument.create();
  for (let i = 0; i < srcDoc.getPageCount(); i++) {
    const [page] = await outDoc.copyPages(srcDoc, [i]);
    page.setSize(tw, th);
    outDoc.addPage(page);
  }
  return toBuffer(outDoc);
};

/**
 * Return the page count of a PDF buffer.
 */
exports.getPageCount = async (pdfBuffer) => {
  const doc = await loadPdf(pdfBuffer);
  return doc.getPageCount();
};

/* ═══════════════════════════════════════════════════════════════════
   Public: ZIP
═══════════════════════════════════════════════════════════════════ */

exports.buildZip = buildZip;

/* ═══════════════════════════════════════════════════════════════════
   Public: Store / retrieve uploaded source PDFs
═══════════════════════════════════════════════════════════════════ */

/**
 * Persist an uploaded PDF to disk and return its page count.
 * @param {string} srcFilePath - multer temp path
 * @param {string} batchId
 * @returns {Promise<number>} pageCount
 */
exports.storeSourcePdf = async (srcFilePath, batchId) => {
  await ensureDir(SOURCE_DIR);
  const dest = exports.sourcePath(batchId);
  await fsp.copyFile(srcFilePath, dest);
  const buf   = await fsp.readFile(dest);
  const doc   = await loadPdf(buf);
  return doc.getPageCount();
};

/**
 * Load a stored source PDF as a Buffer.
 */
exports.loadSourcePdf = async (batchId) => {
  return fsp.readFile(exports.sourcePath(batchId));
};

/**
 * Delete stored source PDF (cleanup after job completes).
 */
exports.deleteSourcePdf = async (batchId) => {
  try { await fsp.unlink(exports.sourcePath(batchId)); } catch {}
};

/* ═══════════════════════════════════════════════════════════════════
   Public: Main orchestrator — processLabels
═══════════════════════════════════════════════════════════════════ */

/**
 * Process a batch of labels: split, overlay, optionally ZIP.
 *
 * @param {object}   opts
 * @param {Buffer}   opts.pdfBuffer     - source PDF (1 page = 1 label)
 * @param {Array}    opts.orders        - order docs aligned to PDF pages
 * @param {string}   opts.splitType     - 'courier'|'sku'|'product'|'orderid'|'gift'|'none'
 * @param {object}   opts.settings      - see below
 * @param {boolean}  opts.createZip     - bundle output files into ZIP
 * @param {string}   opts.jobId         - used to save files to disk
 * @param {Function} opts.onProgress    - (pct 0-100, message) => void
 *
 * settings shape:
 *   pageSize?          'A4'|'A5'|'A6'|'4x6'|'Letter'  (default: 'A4')
 *   removeBlankPages?  boolean
 *   showOrderId?       boolean (default true)
 *   showSKU?           boolean (default true)
 *   showProductName?   boolean (default true)
 *   showAWB?           boolean (default true)
 *   addCourierWatermark? boolean
 *   addBookmarks?      boolean
 *   giftLabelSupport?  boolean   (Amazon: split gift orders)
 *
 * @returns {Promise<{ files: Array<FileResult>, zipBuffer?: Buffer }>}
 *   FileResult: { name, buffer, pageCount, orders, url? }
 */
exports.processLabels = async ({
  pdfBuffer,
  orders,
  splitType   = 'none',
  settings    = {},
  createZip   = false,
  jobId,
  onProgress  = () => {},
}) => {
  if (!pdfBuffer || !orders?.length) {
    throw new Error('pdfBuffer and orders are required');
  }
  if (orders.length > MAX_LABELS) {
    throw new Error(`Maximum ${MAX_LABELS} labels per batch`);
  }

  onProgress(5, 'Loading PDF');

  let workBuffer = pdfBuffer;

  // ── 1. Remove blank pages ──────────────────────────────────────
  if (settings.removeBlankPages) {
    workBuffer = await exports.removeBlankPages(workBuffer);
    onProgress(12, 'Blank pages removed');
  }

  // ── 2. Resize pages ────────────────────────────────────────────
  if (settings.pageSize && settings.pageSize !== 'original') {
    workBuffer = await exports.resizePages(workBuffer, settings.pageSize);
    onProgress(20, 'Pages resized');
  }

  onProgress(25, `Splitting (${splitType})`);

  // ── 3. Split ───────────────────────────────────────────────────
  let files;
  const sp = { settings, onProgress };

  switch (splitType) {
    case 'courier':
      files = await exports.splitByCourier(workBuffer, orders, settings, onProgress);
      break;
    case 'sku':
      files = await exports.splitBySku(workBuffer, orders, settings, onProgress);
      break;
    case 'product':
      files = await exports.splitByProduct(workBuffer, orders, settings, onProgress);
      break;
    case 'orderid':
    case 'order':
      files = await exports.splitByOrderId(workBuffer, orders, settings, onProgress);
      break;
    case 'gift':
      files = await exports.separateGiftLabels(workBuffer, orders, settings, onProgress);
      break;
    default:
      // No split — single output with overlays applied
      files = await exports.splitByOrderId(workBuffer, orders, settings, onProgress);
  }

  onProgress(80, `${files.length} file(s) ready`);

  // ── 4. Save to disk ────────────────────────────────────────────
  if (jobId) {
    const outDir = path.join(OUTPUT_DIR, jobId);
    await ensureDir(outDir);

    for (const file of files) {
      const dest = path.join(outDir, file.name);
      await fsp.writeFile(dest, file.buffer);
      file.url = exports.publicUrl(jobId, file.name);
    }
  }

  // ── 5. ZIP ─────────────────────────────────────────────────────
  let zipBuffer;
  if (createZip && files.length > 1) {
    onProgress(85, 'Building ZIP');
    zipBuffer = await buildZip(files);

    if (jobId) {
      const zipName = 'all_labels.zip';
      const zipPath = path.join(OUTPUT_DIR, jobId, zipName);
      await fsp.writeFile(zipPath, zipBuffer);
      // expose zip URL as well
      files._zipUrl = exports.publicUrl(jobId, zipName);
    }

    onProgress(96, 'ZIP ready');
  }

  onProgress(100, 'Done');
  return { files, zipBuffer, zipUrl: files._zipUrl };
};

/* ═══════════════════════════════════════════════════════════════════
   Public: Compile labels into a printable sheet  (legacy + download)
═══════════════════════════════════════════════════════════════════ */

/**
 * Lay out orders as label cells on A4/Letter sheets.
 * Used when no source PDF exists (generates labels from DB data).
 */
exports.compileLabelsIntoPdf = async (orders, {
  pageSize      = 'A4',
  labelsPerPage = 4,
  settings      = {},
} = {}) => {
  const [pageW, pageH] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const cols  = labelsPerPage <= 2 ? labelsPerPage : 2;
  const rows  = Math.ceil(labelsPerPage / cols);
  const cellW = pageW / cols;
  const cellH = pageH / rows;

  const outDoc = await PDFDocument.create();
  const font   = await embedHelvetica(outDoc);
  const bold   = await embedHelveticaBold(outDoc);

  let page      = null;
  let cellIndex = 0;

  for (const order of orders) {
    if (cellIndex % labelsPerPage === 0) {
      page      = outDoc.addPage([pageW, pageH]);
      cellIndex = 0;
    }

    const col  = cellIndex % cols;
    const row  = Math.floor(cellIndex / cols);
    const x    = col * cellW;
    const y    = pageH - (row + 1) * cellH;
    const pad  = 8;
    let   lineY = y + cellH - 18;

    // Cell border
    page.drawRectangle({
      x: x + 2, y: y + 2,
      width:  cellW - 4,
      height: cellH - 4,
      borderWidth: 0.75,
      borderColor: rgb(0.65, 0.65, 0.65),
    });

    // ── Platform badge ─────────────────────────────────────────
    const badgeColors = {
      amazon:   rgb(1, 0.6, 0),
      flipkart: rgb(0.27, 0.22, 0.65),
      meesho:   rgb(0.73, 0.2, 0.87),
      myntra:   rgb(0.87, 0.23, 0.45),
    };
    const badgeColor = badgeColors[order.platform] || rgb(0.4, 0.4, 0.4);
    page.drawRectangle({ x: x + 2, y: y + cellH - 16, width: cellW - 4, height: 14,
      color: badgeColor });
    page.drawText((order.platform || '').toUpperCase(), {
      x: x + pad, y: y + cellH - 12, size: 7, font: bold, color: rgb(1, 1, 1),
    });
    lineY = y + cellH - 26;

    // ── Label content ──────────────────────────────────────────
    const draw = (text, size = 7.5, f = font) => {
      if (!text) return;
      page.drawText(String(text).slice(0, 46), {
        x: x + pad, y: lineY,
        size, font: f, color: rgb(0.08, 0.08, 0.08),
      });
      lineY -= size + 3.5;
    };

    if (settings.showOrderId    !== false) draw(`Order: ${order.orderId || '—'}`, 7.5, bold);
    if (settings.showProductName !== false) draw(order.productName, 7);
    if (settings.showSKU        !== false && (order.sku || order.msku))
      draw(`SKU: ${order.sku || order.msku}`, 7);
    if (settings.showAWB        !== false && order.awb) draw(`AWB: ${order.awb}`, 7);
    if (order.courierPartner)   draw(order.courierPartner.toUpperCase(), 6.5);
    if (order.buyerName)        draw(order.buyerName, 6.5);
    if (order.address?.city)
      draw(`${order.address.city}${order.address.pincode ? ' – ' + order.address.pincode : ''}`, 6.5);
    if (order.isCOD)
      page.drawText('COD', {
        x: x + cellW - 28, y: y + 6, size: 7, font: bold, color: rgb(0.8, 0.1, 0.1),
      });

    // ── Gift badge ─────────────────────────────────────────────
    if (order.isGift || order.giftMessage) {
      page.drawRectangle({ x: x + cellW - 40, y: y + cellH - 32, width: 36, height: 12,
        color: rgb(0.95, 0.22, 0.22) });
      page.drawText('GIFT', {
        x: x + cellW - 34, y: y + cellH - 28, size: 6.5, font: bold, color: rgb(1, 1, 1),
      });
    }

    cellIndex++;
  }

  return Buffer.from(await outDoc.save({ useObjectStreams: false }));
};

/* ═══════════════════════════════════════════════════════════════════
   Public: Upload-flow helper  (used by labels controller)
═══════════════════════════════════════════════════════════════════ */

/**
 * Store the uploaded platform PDF and count its pages.
 * Does NOT create Label DB records — controller handles that.
 */
exports.splitAndExtractLabels = async ({ filePath, platform, userId, batchId }) => {
  logger.info(`[PDF] storeSource platform=${platform} batchId=${batchId}`);

  // Persist the source PDF
  const pageCount = await exports.storeSourcePdf(filePath, batchId);

  logger.info(`[PDF] stored ${pageCount} pages, batchId=${batchId}`);
  return pageCount;  // caller creates Label records
};
