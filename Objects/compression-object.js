const compression = require('compression');
const compressionObject = {
  filter: (req, res) => {
    // Skip compression for SSE endpoints
    if (req.url.includes('stream') || 
        req.url.includes('sse') || 
        res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
};

module.exports = compressionObject;