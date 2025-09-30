const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const spotifyRoutes = require('./routes/spotify');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const __BACKEND25xEXPRESS__ = require('./routes/__special__/entry');

const catchAllUnmatchedRouteMiddleware = require('./middlewares/catch-all-unmatched-route-middleware');
const globalErrorHandler = require('./middlewares/global-error-handler-middleware');
const adminLimiter = require('./middlewares/admin-rate-limiter-middleware');
const generateRandomReqId = require('./middlewares/generate-random-req-id-middleware');

const corsOptions = require('./Objects/cors-object');
const securityObject = require('./Objects/security-object');
const rateLimitObject = require('./Objects/rate-limit-object');

const helmet = require('helmet'); // Security middleware
const morgan = require('morgan'); // Logging middleware
const rateLimit = require('express-rate-limit'); // Rate limiting
const compression = require('compression'); // Response compression

require('./database/mongoConnection');
const { initializeDefaultUpdates } = require('./database/defaultUpdates');
require('dotenv').config();

const app = express();

/**
 * @security {helmet}
 * @description Security middleware for setting various HTTP headers
 */
app.use(helmet(securityObject()));

/**
 * @compression {compression}
 * @description Compress response bodies for better performance
 */
app.use(compression());

/**
 * @logging {morgan}
 * @description HTTP request logger middleware
 */
const isProduction = process.env.PRODUCTION === 'true';
app.use(morgan(isProduction ? 'combined' : 'dev'));

/**
 * @rateLimit {rateLimit}
 * @description Rate limiting to prevent abuse
 */
app.use(rateLimit(rateLimitObject));

/**
 * @all {middlewares}
 * @cors setup
 */
app.use(cors(corsOptions));

/**
 * @requestSizeLimit {express.json}
 * @description Limit request body size to prevent large payload attacks
 */
app.use(express.json({ limit: '10mb' })); 

/**
 * @requestId {middleware}
 * @description Add unique request ID for tracking
 */
app.use(generateRandomReqId);

/**
 * @defaultUpdates {initializeDefaultUpdates}
 * @description Initializes default life updates if none exist
 */
mongoose.connection.once('open', initializeDefaultUpdates);

/**
 * @routes {all routers}
 * @spotify {spotifyRoutes}
 * @description Routes for Spotify-related functionality
 * @admin {adminRoutes}
 * @description Routes for Admin-related functionality
 * @public {publicRoutes}
 * @description Routes for Public access functionality - no authentication required
 */

app.use('/api', spotifyRoutes);
/**
 * @adminRateLimit {rateLimit}
 * @description Stricter rate limiting for admin routes
 */
app.use('/admin', adminLimiter, adminRoutes);
app.use("/public" , publicRoutes);


/**
 * @specialRoute {__BACKEND25xEXPRESS__}
 * @description basic entry description route
 */
app.use("/" , __BACKEND25xEXPRESS__);

/**
 * @globalErrorHandler {middleware}
 * @description Global error handling middleware
 */
app.use(globalErrorHandler);

/**
 * @catchAllUnmatchedRouteMiddleware {catchAllUnmatchedRouteMiddleware}
 * @description Middleware to handle unmatched routes
 * @note This should be the last middleware to ensure all routes are checked first
 */
app.use(catchAllUnmatchedRouteMiddleware);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`==> Server running on http://localhost:${port}`);
  console.log(`==> Environment: ${process.env.PRODUCTION === 'true' ? 'Production' : 'Development'}`);
  console.log(`==> Health check: http://localhost:${port}/public/health`);

});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});
