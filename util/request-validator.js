const { validationResult } = require('express-validator');
const { ValidationError } = require('./error-handler');

/**
 * Checks if the request is valid, and eventually returns an http 422 error
 */
exports.validateRequest = (nextController) => (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return nextController(req, res, next);
  }

  next(new ValidationError(result.array()));
};
