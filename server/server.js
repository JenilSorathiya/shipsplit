// Load .env in development; in production Render injects env vars directly
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

// ── Required env var check ────────────────────────────────────────────
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('FATAL: Missing required environment variables:', missing.join(', '));
  process.exit(1);
}
// JWT_REFRESH_SECRET falls back to JWT_SECRET if not set
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
}
const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const passport     = require('passport');

const logger       = require('./utils/logger');
require('./middleware/passport');

// ── Routes ────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth.routes');
const orderRoutes        = require('./routes/orders.routes');
const labelRoutes        = require('./routes/labels.routes');
const reportRoutes       = require('./routes/reports.routes');
const settingsRoutes     = require('./routes/settings.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const platformRoutes     = require('./routes/platforms.routes');
const returnsRoutes        = require('./routes/returns.routes');
const remittancesRoutes    = require('./routes/remittances.routes');

// ── Middleware ────────────────────────────────────────────────────────
const errorHandler = require('./middleware/errorHandler.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');

const app = express();

// ── Security ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

// ── CORS ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Webhook route needs raw body — register BEFORE express.json() ─────
app.use('/api/subscription/webhook',
  express.raw({ type: 'application/json' }),
  require('./controllers/subscription.controller').handleWebhook
);

// ── Body parsers ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Request logging ───────────────────────────────────────────────────
app.use(morgan('combined', { stream: logger.stream }));

// ── Passport ──────────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Global rate limiter ───────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── API routes ─────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/labels',       labelRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/settings',     settingsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/platforms',    platformRoutes);
app.use('/api/returns',      returnsRoutes);
app.use('/api/remittances',  remittancesRoutes);

// ── Static: serve generated label PDFs & ZIPs ────────────────────
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads'), {
  dotfiles: 'deny',
  index:    false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.pdf'))  res.setHeader('Content-Type', 'application/pdf');
    if (filePath.endsWith('.zip'))  res.setHeader('Content-Type', 'application/zip');
  },
}));

// ── Health check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV })
);

// ── 404 ────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
);

// ── Global error handler (MUST be last) ───────────────────────────────
app.use(errorHandler);

// ── Database & startup ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('MongoDB connected');
    require('./services/syncJob').start();
    app.listen(PORT, () =>
      logger.info(`ShipSplit server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message, err.stack);
    process.exit(1);
  });

// ── Graceful shutdown ─────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing connections...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
