const storage = require('node-persist');
const initializeStorage = async () => {
    await storage.init({
    dir: './cache', 
    stringify: JSON.stringify,
    parse: JSON.parse,
    encoding: 'utf8',
    logging: false,
    ttl: false,
    expiredInterval: 0,
    forgiveParseErrors: false
  });
}
module.exports = initializeStorage;
