/**
 * AES-256-GCM encryption utilities for storing sensitive
 * platform tokens and API keys in the database.
 *
 * Requires ENCRYPT_KEY (32-byte hex) in .env:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey() {
  const key = process.env.ENCRYPT_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPT_KEY must be at least 32 characters in .env');
  }
  return Buffer.from(key.slice(0, 64), 'hex').slice(0, 32);
}

/**
 * Encrypt a plaintext string.
 * Returns base64 string: iv:tag:ciphertext
 */
exports.encrypt = (plaintext) => {
  if (!plaintext) return null;
  try {
    const iv         = crypto.randomBytes(IV_LENGTH);
    const cipher     = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted  = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag        = cipher.getAuthTag();
    return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
  } catch {
    return null;
  }
};

/**
 * Decrypt a previously encrypted string.
 * Returns plaintext or null on failure.
 */
exports.decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const [ivHex, tagHex, dataHex] = ciphertext.split(':');
    const iv        = Buffer.from(ivHex, 'hex');
    const tag       = Buffer.from(tagHex, 'hex');
    const data      = Buffer.from(dataHex, 'hex');
    const decipher  = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final('utf8');
  } catch {
    return null;
  }
};

/**
 * Mask a token for safe display (shows last 4 chars).
 */
exports.maskToken = (token) => {
  if (!token) return null;
  return `****_****_${token.slice(-4)}`;
};
