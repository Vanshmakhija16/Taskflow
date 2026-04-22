const { validationResult } = require('express-validator');
const logger = require('../config/logger');

// Runs express-validator results and returns 422 on failure
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

// Central error handler (registered last in app.js)
const errorHandler = (err, req, res, _next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = { validate, errorHandler };
