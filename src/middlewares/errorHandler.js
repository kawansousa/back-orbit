const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Erro não tratado');

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor.'
    : err.message;

  res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
