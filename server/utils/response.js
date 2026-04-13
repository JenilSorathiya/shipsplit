/**
 * Unified API response helpers.
 * Every route should respond through one of these helpers
 * so clients always receive a predictable envelope.
 */

/**
 * Success response
 * @param {Response} res
 * @param {*}        data     - payload to send
 * @param {string}   message
 * @param {number}   status   - HTTP status code (default 200)
 * @param {object}   meta     - optional pagination / extras
 */
exports.success = (res, data = null, message = 'Success', status = 200, meta = null) => {
  const body = { success: true, message };
  if (data !== null && data !== undefined) body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

/**
 * Created response (201)
 */
exports.created = (res, data = null, message = 'Created successfully') =>
  exports.success(res, data, message, 201);

/**
 * No content (204)
 */
exports.noContent = (res) => res.status(204).end();

/**
 * Error response
 * @param {Response} res
 * @param {string}   message
 * @param {number}   status
 * @param {string}   code     - machine-readable error code
 * @param {Array}    details  - validation error details
 */
exports.error = (res, message = 'An error occurred', status = 500, code = null, details = null) => {
  const body = { success: false, message };
  if (code)    body.error = { code };
  if (details) body.error = { ...(body.error || {}), details };
  return res.status(status).json(body);
};

/**
 * Paginated list response
 * @param {Response} res
 * @param {Array}    items
 * @param {object}   pagination - { page, limit, total }
 */
exports.paginated = (res, items, { page, limit, total }, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    message,
    data:    items,
    meta: {
      page:       Number(page),
      limit:      Number(limit),
      total,
      totalPages,
      hasNext:    page < totalPages,
      hasPrev:    page > 1,
    },
  });
};
