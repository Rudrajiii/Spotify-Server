function globalErrorHandler(err, req, res, next) {
    console.error(`[${new Date().toISOString()}] Error in request ${req.id}:`, err);
    /**
     * @env {isProduction}
     * @description Check if the environment is production
     * @response {500 - Internal Server Error}
     * @caution Avoid exposing detailed error messages in production
     */
    const isProduction = process.env.PRODUCTION;
    const message = isProduction === 'true' ? 'Internal Server Error' : err.message;
    res.status(err.status || 500).json({
    error: message,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...(isProduction === 'true' ? {} : { stack: err.stack })
  });
}

module.exports = globalErrorHandler;