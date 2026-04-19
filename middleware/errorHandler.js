const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.code === 11000) { message = `${Object.keys(err.keyValue)[0]} already exists`; status = 400; }
  if (err.name === 'ValidationError') { message = Object.values(err.errors).map(e => e.message).join(', '); status = 400; }
  if (err.name === 'CastError') { message = `Invalid ${err.path}`; status = 400; }
  if (['JsonWebTokenError','TokenExpiredError'].includes(err.name)) { message = 'Invalid token'; status = 401; }

  logger.error(`${status} - ${message} [${req.method} ${req.originalUrl}]`);
  res.status(status).json({ success: false, message, ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
};
