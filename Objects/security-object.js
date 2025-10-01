const securityObject = {
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com", 
        ],
        fontSrc: [
          "'self'",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
          "data:",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", 
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:",
          "https://i.scdn.co", 
          "https://mosaic.scdn.co", 
          "https://lineup-images.scdn.co", 
        ],
        connectSrc: [
          "'self'",
          "https://api.spotify.com",
          "https://accounts.spotify.com",
          "wss:", 
        ],
        mediaSrc: ["'self'", "https:", "blob:"],
        frameSrc: [
          "'self'",
          "https://open.spotify.com", 
        ],
      },
    },
};

module.exports = securityObject;
