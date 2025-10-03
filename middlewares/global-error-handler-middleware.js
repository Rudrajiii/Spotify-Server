function globalErrorHandler(err, req, res, next) {
    const isProduction = process.env.PRODUCTION === "true";
    console.error(`[${new Date().toISOString()}] Error in ${isProduction ? 'production' : 'development'} request ${req.id || "SYSTEM"}:`);

    // Handle SSE connections where headers are already sent
    if(res.headersSent){
        // Special handling for SSE connections
        if (req.url && req.url.includes('/now-playing-stream')) {
            console.error(`[${err.constructor.name}]:`, {
                message: isProduction ? 'MUSIC_SERVICE_DOWN' : err.message,
                error_info: isProduction ? null : {
                  code: err.code || 'SSE_ERROR',
                  connectionId: err?.details?.connectionId || 'unknown',
                  timestamp: new Date().toISOString()
                },
            });
            
            // Try to write error to SSE stream
            try {
                if (!res.writableEnded && !res.destroyed) {
                    const errorData = {
                        error: isProduction ? 'Connection lost' : err.message,
                        code: err.code || 'SSE_ERROR',
                        timestamp: new Date().toISOString(),
                        type: 'error'
                    };
                    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
                }
            } catch (writeError) {
                console.error('Failed to write error to SSE stream');
            }
            
            return; // Don't pass to Express default handler
        }
        
        return next(err); // Pass to Express default handler for non-SSE
    }

    // Handle SpotifyError specifically
    if(err.constructor.name === "SpotifyError"){
        return res.status(err.status || 500).json({
            error: isProduction ? 'Music service down' : err.message,
            code: err.code || "SPOTIFY_ERROR",
            requestId: req.id,
            timestamp: new Date().toISOString(),
            ...(isProduction ? {} : { stack: err.stack, details: err.details })
        });
    }

    // Handle other errors
    const message = isProduction ? 'Internal Server Error' : err.message;
    res.status(err.status || 500).json({
        error: message,
        code: err.code || "INTERNAL_ERROR",
        requestId: req.id,
        timestamp: new Date().toISOString(),
        ...(isProduction ? {} : { stack: err.stack, details: err.details })
    });
}

module.exports = globalErrorHandler;