/**
 * Joi validation middleware factory.
 * Usage: validate(schema) or validate(schema, 'params')
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;

  const { error, value } = schema.validate(data, {
    abortEarly:      false,
    stripUnknown:    true,
    allowUnknown:    false,
    convert:         true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return res.status(422).json({
      success: false,
      message: details[0].message,
      errors:  details,
    });
  }

  // Attach validated & coerced value back to the source
  if (source === 'query')  req.query  = value;
  else if (source === 'params') req.params = value;
  else req.body = value;

  next();
};

module.exports = validate;
