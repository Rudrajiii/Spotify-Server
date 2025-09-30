const corsOptions = {
  origin: [
          'http://localhost:5173',
          'https://rudyy.vercel.app',
          'https://rudyy.tech',    
          'https://www.rudyy.tech' 
        ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match'],
  exposedHeaders: ['ETag', 'Cache-Control'],
  credentials: true
};

module.exports = corsOptions;