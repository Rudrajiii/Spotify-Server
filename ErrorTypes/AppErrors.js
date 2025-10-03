class AppError extends Error {
    constructor(message , { status = 500 , code = 'INTERNAL_ERROR', details = null } = {}) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
};

class MongooseError extends AppError {
    constructor(message="Mongoose connection close API changed. Use Promise instead of callback." , options={}){
        const { details , status = 499 , code = "MONGO_CONN_CLOSE_API" } = options;
        super(message , {
            status,
            code,
            details
        })
    }
};

class SpotifyError extends AppError {
    constructor(message="Spotify Error" , options = {}){
        const { details , status = 500 , code = "SPOTIFY_ERROR" } = options;
        super(message , {
            code,
            details,
            status
        })
    }
};

class TrustProxyValidationError extends AppError {
    constructor(message="The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default)." , options = {}){
        const { details , status = 500 , code = "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR" } = options;
        super(message , {
            code,
            details,
            status
        })
    }
};

module.exports = {
    AppError,
    SpotifyError,
    TrustProxyValidationError,
    MongooseError
};
