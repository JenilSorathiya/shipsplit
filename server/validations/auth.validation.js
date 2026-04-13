const Joi = require('joi');

const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[0-9]/, 'number')
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.name': 'Password must contain at least one {{#name}} character',
  });

exports.register = Joi.object({
  name:     Joi.string().trim().min(2).max(100).required(),
  email:    Joi.string().email().lowercase().required(),
  password: password.required(),
  phone:    Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
});

exports.login = Joi.object({
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

exports.forgotPassword = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

exports.resetPassword = Joi.object({
  password: password.required(),
});

exports.updateProfile = Joi.object({
  name:         Joi.string().trim().min(2).max(100),
  phone:        Joi.string().pattern(/^[6-9]\d{9}$/).allow('').optional(),
  businessName: Joi.string().trim().max(200).allow(''),
  gstin:        Joi.string().uppercase().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).allow('').optional(),
});

exports.changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword:     password.required(),
});
