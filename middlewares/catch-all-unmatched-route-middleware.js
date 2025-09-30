function catchAllUnmatchedRouteMiddleware(req, res , next) {
  res.status(404).json({
    error: '404 - Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    suggestion: 'Check robots.txt file for any disallowed routes.'
  });
}

module.exports = catchAllUnmatchedRouteMiddleware;
