const { ipKeyGenerator } = require('express-rate-limit'); 

const rateLimitObject = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
 		if (req.query.apiKey) return req.query.apiKey

 		// fallback to IP for unauthenticated users
		// return req.ip // vulnerable
		return ipKeyGenerator(req.ip) // better
	},
  
  // Handle rate limit exceeded
  handler: (req, res) => {
    console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = rateLimitObject;