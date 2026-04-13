const multer = require('multer');
const path   = require('path');
const os     = require('os');

const tmpDir = os.tmpdir();

const storage = (prefix) => multer.diskStorage({
  destination: tmpDir,
  filename: (req, file, cb) =>
    cb(null, `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});

const csvFilter = (req, file, cb) => {
  if (
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.originalname.toLowerCase().endsWith('.csv')
  ) cb(null, true);
  else cb(new Error('Only CSV files are allowed'), false);
};

const pdfFilter = (req, file, cb) => {
  if (
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf')
  ) cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const uploadCSV = multer({
  storage:    storage('csv'),
  fileFilter: csvFilter,
  limits:     { fileSize: 10 * 1024 * 1024 },   // 10 MB
});

const uploadPDF = multer({
  storage:    storage('pdf'),
  fileFilter: pdfFilter,
  limits:     { fileSize: 50 * 1024 * 1024 },   // 50 MB
});

module.exports = { uploadCSV, uploadPDF };
