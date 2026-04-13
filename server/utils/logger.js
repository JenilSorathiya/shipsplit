const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, errors, printf, colorize, json } = format;

const isProd = process.env.NODE_ENV === 'production';

/* ── Console format (dev) ─────────────────────────── */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp: ts, level, message, stack, ...meta }) => {
    let out = `${ts} [${level}] ${stack || message}`;
    const extras = Object.keys(meta).filter((k) => !['service'].includes(k));
    if (extras.length) out += `\n  ${JSON.stringify(meta, null, 2)}`;
    return out;
  })
);

/* ── JSON format (prod) ───────────────────────────── */
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level:           isProd ? 'info' : 'debug',
  defaultMeta:     { service: 'shipsplit-api' },
  format:          isProd ? prodFormat : devFormat,
  transports:      [new transports.Console()],
  exceptionHandlers: [new transports.Console()],
  rejectionHandlers: [new transports.Console()],
});

/* ── HTTP request stream for Morgan ──────────────── */
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
