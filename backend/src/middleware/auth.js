const { verifyToken } = require("../lib/auth");

module.exports = async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    req.user = await verifyToken(token);   // { userId, username, email }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};