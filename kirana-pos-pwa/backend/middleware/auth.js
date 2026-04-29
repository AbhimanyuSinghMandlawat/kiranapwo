/**
 * JWT authentication middleware.
 */
const jwt = require("jsonwebtoken");

const JWTSECRET = process.env.JWTSECRET;

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });

  const token = header.split(" ")[1];
  jwt.verify(token, JWTSECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.shop = decoded;
    next();
  });
}

module.exports = auth;
