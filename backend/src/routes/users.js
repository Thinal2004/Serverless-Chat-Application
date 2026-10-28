const router = require("express").Router();
const User = require("../models/User");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /users?search=al
router.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search.length < 1 || search.length > 30) {
    return res.status(400).json({ error: "search must be 1-30 characters" });
  }
  const users = await User.find({
    username: { $regex: "^" + escapeRegex(search), $options: "i" },
    userId: { $ne: req.user.userId },
  }).select("username -_id").limit(20).lean();     // only usernames: no emails or IDs leak
  res.json(users);
});

module.exports = router;