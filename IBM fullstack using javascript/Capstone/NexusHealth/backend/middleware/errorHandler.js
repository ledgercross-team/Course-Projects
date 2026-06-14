// backend/middleware/errorHandler.js
const errorHandler = (err, req, res, _next) => {
  console.error(
    JSON.stringify({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      error: err.message,
    })
  );

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message,
    requestId: req.requestId,
  });
};

module.exports = { errorHandler };
