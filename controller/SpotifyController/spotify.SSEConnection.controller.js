const { getCurrentPlayingTrack , clients} = require("../../Utils/spotify.utility");
const { SpotifyError } = require("../../ErrorTypes/AppErrors");
require("dotenv").config();

const isProduction = process.env.PRODUCTION === "true";

async function handleSSEConnection(req , res , next){
  const clientIP = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  const connectionId = `${clientIP}-${Date.now()}`;
  try {
    
    if (clients.size >= 300) {
      return next(
        new SpotifyError("Max SSE connections reached, try again later", {
          details: {
            reason: "MAX_SSE_CONNECTIONS",
            MAX_SAFE_SSE_CONNECTIONS: 300,
            currentConnections: clients.size,
            clientIP,
          },
          status: 503,
        })
      );
    }

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": isProduction ? "https://rudyy.tech" : "*",
      "Access-Control-Allow-Headers": "Cache-Control , Content-Type",
      "X-Accel-Buffering": "no",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.spotify.com https://accounts.spotify.com; frame-ancestors 'none';",
    });

    const clientInfo = {
      ip: clientIP,
      id: connectionId,
      userAgent,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Add client to the set
    clients.set(res, clientInfo);
    console.log(
      `Client connected: ${connectionId} | Total clients: ${clients.size}`
    );

    try {
      // Send initial data
      const initialData = await getCurrentPlayingTrack();
      res.write(`data: ${JSON.stringify(initialData)}\n\n`);
    } catch (err) {
      const errorData = {
        error: isProduction ? "Service initializing" : err.message,
        timestamp: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }

    // Send keep-alive ping every 15 seconds
    const keepAlive = setInterval(() => {
      try {
        if (res.writableEnded || res.destroyed) {
          clearInterval(keepAlive);
          clients.delete(res);
          console.log(
            `Client disconnected: ${connectionId} | Total clients: ${clients.size}`
          );
          return;
        }
        res.write(`: keep-alive\n\n`);
        clientInfo.lastActivity = Date.now();
      } catch (error) {
        clearInterval(keepAlive);
        clients.delete(res);
        console.log(
          `Client disconnected due to error: ${connectionId} | Total clients: ${clients.size}`
        );

        const keepAliveError = new SpotifyError(
          "SSE keep-alive failed",
          {
            details: {
              reason: "SSE_KEEP_ALIVE_FAILED",
              clientIP,
              connectionDuration: Date.now() - clientInfo.connectedAt,
              error: error.code || error.message,
            },
          },
          499
        );

        next(keepAliveError);
      }
    }, 15000);

    // Handle client disconnect
    req.on("close", () => {
      clients.delete(res);
      clearInterval(keepAlive);
    });

    req.on("error", (_) => {
      // console.error('SSE connection error:', err);
      clients.delete(res);
      clearInterval(keepAlive);

      next(
        new SpotifyError("SSE connection error", {
          details: {
            connectionId: connectionId,
          },
        })
      );
    });

    // Production: Auto-cleanup stale connections (every 5 minutes)
    if (isProduction) {
      const cleanupInterval = setInterval(() => {
        const now = Date.now();
        const staleClients = [];

        clients.forEach((clientInfo, client) => {
          // Remove clients inactive for more than 10 minutes
          if (now - clientInfo.lastActivity > 10 * 60 * 1000) {
            staleClients.push(client);
          }
        });

        staleClients.forEach((client) => {
          console.log("🧹 Cleaning up stale SSE connection");
          client.end();
          clients.delete(client);
        });

        // Clear interval if no clients
        if (clients.size === 0) {
          clearInterval(cleanupInterval);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    }
  } catch (error) {
    console.error("💥 Unexpected error in SSE:");
    next(error);
  }
}

module.exports = handleSSEConnection;