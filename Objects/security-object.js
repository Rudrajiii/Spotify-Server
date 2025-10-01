function securityObject() {
  return {
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com", // If you use any CDN stylesheets
        ],
        fontSrc: [
          "'self'",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
          "data:",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Only if you have inline scripts
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:",
          "https://i.scdn.co", // Spotify album covers
          "https://mosaic.scdn.co", // Spotify playlist images
          "https://lineup-images.scdn.co", // Spotify artist images
        ],
        connectSrc: [
          "'self'",
          "https://api.spotify.com",
          "https://accounts.spotify.com",
          "wss:", // For WebSocket connections if you use any
        ],
        mediaSrc: ["'self'", "https:", "blob:"],
        frameSrc: [
          "'self'",
          "https://open.spotify.com", // If you embed Spotify players
        ],
      },
    },
  };
}
module.exports = securityObject;
