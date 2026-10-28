const router = require("express").Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { roomId, dmId } = require("../lib/conversation");

const ROOM_NAME = /^[a-z0-9_-]{1,30}$/i;

// Newest N messages (optionally older than ?before=<ISO date>), returned oldest-first
async function loadHistory(conversationId, query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
  const filter = { conversationId };
  if (typeof query.before === "string") {
    const d = new Date(query.before);
    if (!isNaN(d)) filter.timestamp = { $lt: d };
  }
  const msgs = await Message.find(filter)
    .sort({ timestamp: -1 }).limit(limit)
    .select("senderId senderName content timestamp").lean();
  return msgs.reverse();
}

// GET /messages/room/general
router.get("/room/:name", async (req, res) => {
  if (!ROOM_NAME.test(req.params.name)) return res.status(400).json({ error: "Invalid room name" });
  res.json(await loadHistory(roomId(req.params.name), req.query));
});

// GET /messages/dm/bob
router.get("/dm/:username", async (req, res) => {
  const other = await User.findOne({ username: req.params.username }).select("userId").lean();
  if (!other) return res.status(404).json({ error: "User not found" });
  // Built from the VERIFIED user's ID, so you can only ever read your own DMs
  res.json(await loadHistory(dmId(req.user.userId, other.userId), req.query));
});

module.exports = router;