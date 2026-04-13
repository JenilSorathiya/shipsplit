const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TTL  = process.env.JWT_EXPIRES_IN         || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const IS_PROD     = process.env.NODE_ENV === 'production';

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
  secure:   IS_PROD,
  sameSite: IS_PROD ? 'strict' : 'lax',
  path:     '/',
};

exports.setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken',  accessToken,  { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...COOKIE_BASE, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

exports.clearTokenCookies = (res) => {
  res.clearCookie('accessToken',  { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

/* ── One-time token (email verify / password reset) ── */
exports.generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');

exports.hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
