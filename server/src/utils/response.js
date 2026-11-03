'use strict';

/**
 * Every API response has the same shape: { success, data, message }.
 * (Validation failures additionally carry an `errors` array - see errorHandler.)
 */
function sendSuccess(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

const sendCreated = (res, data, message = 'Created') => sendSuccess(res, data, message, 201);

module.exports = { sendSuccess, sendCreated };
