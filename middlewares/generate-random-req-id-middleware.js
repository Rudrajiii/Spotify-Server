async function generateRandomReqId(req, res, next) {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  await next();
}

module.exports = generateRandomReqId;