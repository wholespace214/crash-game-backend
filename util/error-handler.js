const logger = require('../util/logger');
const { getBanData } = require('./user');

class ErrorHandler extends Error {
  constructor(statusCode, message, errors) {
    super();
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
  }
}

const handleError = (err, res) => {
  const { statusCode = 500, message, errors } = err;
  logger.error(err);

  return res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    errors,
  });
};

class ForbiddenError extends ErrorHandler {
  constructor() {
    super(403, 'The credentials provided are insufficient to access the requested resource');
  }
}

class BannedError extends ErrorHandler {
  constructor(userData) {
    super(403, 'Your account is banned', { banData: getBanData(userData) });
  }
}

class NotFoundError extends ErrorHandler {
  constructor() {
    super(404, "The requested resource wasn't found");
  }
}

class ValidationError extends ErrorHandler {
  constructor(errors) {
    super(422, 'Invalid input passed, please check it.', errors);
  }
}

module.exports = {
  ErrorHandler,
  handleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  BannedError
};
