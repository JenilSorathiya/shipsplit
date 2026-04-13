// ============================================================
// ShipSplit - Shared Validators
// ============================================================

const { PLATFORMS } = require('./constants');

const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const isValidPhone = (phone) => {
  const re = /^[6-9]\d{9}$/;
  return re.test(String(phone));
};

const isValidGSTIN = (gstin) => {
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return re.test(String(gstin).toUpperCase());
};

const isValidPincode = (pincode) => {
  const re = /^[1-9][0-9]{5}$/;
  return re.test(String(pincode));
};

const isValidPlatform = (platform) => {
  return Object.values(PLATFORMS).includes(platform);
};

const isValidAWBNumber = (awb) => {
  return typeof awb === 'string' && awb.trim().length >= 6 && awb.trim().length <= 30;
};

const validateOrderId = (orderId) => {
  return typeof orderId === 'string' && orderId.trim().length > 0;
};

const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
  return { valid: errors.length === 0, errors };
};

const validateRegisterInput = ({ name, email, password, phone }) => {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!email || !isValidEmail(email)) errors.email = 'Valid email is required';
  if (!password) {
    errors.password = 'Password is required';
  } else {
    const pwResult = validatePassword(password);
    if (!pwResult.valid) errors.password = pwResult.errors[0];
  }
  if (phone && !isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number';
  return { valid: Object.keys(errors).length === 0, errors };
};

const validateLoginInput = ({ email, password }) => {
  const errors = {};
  if (!email || !isValidEmail(email)) errors.email = 'Valid email is required';
  if (!password) errors.password = 'Password is required';
  return { valid: Object.keys(errors).length === 0, errors };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidGSTIN,
  isValidPincode,
  isValidPlatform,
  isValidAWBNumber,
  validateOrderId,
  validatePassword,
  validateRegisterInput,
  validateLoginInput,
};
