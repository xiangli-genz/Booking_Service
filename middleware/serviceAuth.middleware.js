// services/booking-service/middleware/serviceAuth.middleware.js
module.exports = function serviceAuth(req, res, next) {
  // Allow bypass in development if SERVICE_TOKEN is not set
  const expected = process.env.SERVICE_TOKEN;
  if (!expected) {
    // Development mode - warn and allow
    console.warn('SERVICE_TOKEN not set; service auth is bypassed');
    return next();
  }

  const token = req.get('X-Service-Token');
  if (!token || token !== expected) {
    return res.status(401).json({ code: 'error', message: 'Unauthorized' });
  }

  next();
};
