const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TTL  = process.env.JWT_EXPIRES_IN         || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Use secure cross-origin cookies when:
//  (a) NODE_ENV is explicitly 'production', OR
//  (b) CLIENT_URL is a non-localhost HTTPS URL  ← already set on Render
// This avoids depending solely on NODE_ENV being set correctly.
const IS_PROD    = process.env.NODE_ENV === 'production';
const clientUrl  = process.env.CLIENT_URL || '';
const IS_CROSS   = clientUrl.startsWith('https://') && !clientUrl.includes('localhost');
const USE_SECURE = IS_PROD || IS_CROSS;

/* ── Token generation ─────────────────────────────── */
exports.generateTokens = (userId) => {
  const accessToken  = jwt.sign({ sub: userId, type: 'access'  }, process.env.JWT_SECRET,         { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken };
};

exports.signAccessToken = (userId) =>
  jwt.sign({ sub: userId, type: 'access' }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

/* ── Token verification ───────────────────────────── */
exports.verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

exports.verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

/* ── Cookie helpers ───────────────────────────────── */
const COOKIE_BASE = {
  httpOnly: true,
  secure:   USE_SECURE,
  // 'none' required for cross-domain cookies (Vercel frontend → Render backend)
  // 'lax' is fine for local dev (same-site)
  sameSite: USE_SECURE ? 'none' : 'lax',
  path:     '/',
};

exports.setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken',  accessToken,  { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...COOKIE_BASE, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

exports.clearTokenCookies = (res) => {
  // Must pass same sameSite/secure attributes to correctly clear the cookie
  res.clearCookie('accessToken',  { ...COOKIE_BASE });
  res.clearCookie('refreshToken', { ...COOKIE_BASE });
};

/* ── One-time token (email verify / password reset) ── */
exports.generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');

exports.hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
