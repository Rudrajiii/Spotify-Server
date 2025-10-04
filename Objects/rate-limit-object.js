const { ipKeyGenerator } = require('express-rate-limit'); 

const rateLimitObject = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5000, // Limit each IP to 5000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _) => {
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