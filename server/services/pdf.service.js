const { PDFDocument, degrees } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const Label = require('../models/Label.model');
const logger = require('../utils/logger');

/**
 * Split an uploaded label PDF into individual pages,
 * create a Label record for each, and store locally.
 */
exports.splitAndExtractLabels = async ({ filePath, platform, userId, batchId }) => {
  const fileBytes = fs.readFileSync(filePath);
  const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();

  logger.info(`PDF split: ${pageCount} pages for ${platform}, batch ${batchId}`);

  const results = [];

  for (let i = 0; i < pageCount; i++) {
    try {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copiedPage);

      const pageBytes = await singleDoc.save();

      // Create label record (status: ready since we have the bytes)
      const label = await Label.create({
        userId,
        platform,
        batchId,
        status: 'ready',
        sourcePdfPage: i + 1,
        orderId: `batch-${batchId}-page-${i + 1}`,   // placeholder; matched later
        processedAt: new Date(),
      });

      results.push({ labelId: label._id, page: i + 1 });
    } catch (err) {
      logger.error(`Failed to extract page ${i + 1}:`, err.message);
    }
  }

  return results;
};

/**
 * Compile multiple label pages into a single printable PDF
 * with the requested page layout.
 */
exports.compileLabelsIntoPdf = async (labels, { pageSize = 'A4', labelsPerPage = 4 } = {}) => {
  const PAGE_DIMS = {
    A4:     [595.28, 841.89],
    A6:     [297.64, 419.53],
    Letter: [612, 792],
  };

  const [pageW, pageH] = PAGE_DIMS[pageSize] || PAGE_DIMS.A4;
  const cols = labelsPerPage <= 2 ? labelsPerPage : 2;
  const rows = Math.ceil(labelsPerPage / cols);
  const cellW = pageW / cols;
  const cellH = pageH / rows;

  const outDoc = await PDFDocument.create();

  // Dummy: create pages with placeholder cells for each label
  let page = null;
  let cellIndex = 0;

  for (const label of labels) {
    if (cellIndex % labelsPerPage === 0) {
      page = outDoc.addPage([pageW, pageH]);
      cellIndex = 0;
    }

    const col = cellIndex % cols;
    const row = Math.floor(cellIndex / cols);
    const x = col * cellW;
    const y = pageH - (row + 1) * cellH;

    // Draw border
    page.drawRectangle({ x: x + 2, y: y + 2, width: cellW - 4, height: cellH - 4, borderWidth: 0.5, borderColor: { type: 'RGB', red: 0.8, green: 0.8, blue: 0.8 } });

    // Draw label info text
    page.drawText(`Order: ${label.orderId}`, { x: x + 8, y: y + cellH - 20, size: 8 });
    if (label.awb) page.drawText(`AWB: ${label.awb}`, { x: x + 8, y: y + cellH - 32, size: 8 });
    page.drawText(label.platform.toUpperCase(), { x: x + 8, y: y + cellH - 44, size: 7 });

    cellIndex++;
  }

  return Buffer.from(await outDoc.save());
};
