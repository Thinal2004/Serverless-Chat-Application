const router = require("express").Router();
const Message = require("../models/Message");
const User = require("../models/User");

// GET /conversations  -> my DMs, most recent first
router.get("/", async (req, res) => {
  const me = req.user.userId;

  const rows = await Message.aggregate([
    { $match: { participants: me } },
    { $sort: { timestamp: -1 } },
    { $group: {
        _id: "$conversationId",
        participants: { $first: "$participants" },
        lastMessage: { $first: "$content" },
        lastSender: { $first: "$senderName" },
        lastTimestamp: { $first: "$timestamp" },
    } },
    { $sort: { lastTimestamp: -1 } },
    { $limit: 50 },
  ]);

  const otherIds = rows.map((r) => r.participants.find((p) => p !== me)).filter(Boolean);
  const users = await User.find({ userId: { $in: otherIds } }).select("userId username").lean();
  const nameOf = Object.fromEntries(users.map((u) => [u.userId, u.username]));

  res.json(rows.map((r) => ({
    conversationId: r._id,
    with: nameOf[r.participants.find((p) => p !== me)] || "unknown",
    lastMessage: r.lastMessage,
    lastSender: r.lastSender,
    lastTimestamp: r.lastTimestamp,
  })));
});

module.exports = router;