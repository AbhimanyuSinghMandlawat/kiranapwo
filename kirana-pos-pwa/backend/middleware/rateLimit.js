/**
 * Simple in-memory rate limiter middleware.
 */
const rateLimitMap = new Map();

function rateLimit(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
    }
    entry.count += 1;
    rateLimitMap.set(ip, entry);
    if (entry.count > limit) {
      return res.status(429).json({ message: "Too many requests." });
    }
    next();
  };
}

module.exports = rateLimit;
