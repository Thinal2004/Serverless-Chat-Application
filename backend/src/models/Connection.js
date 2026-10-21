const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  connectionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  roomId: { type: String, default: null, index: true },
  connectedAt: { type: Date, default: Date.now, expires: 86400 }, // TTL: auto-delete after 24h
});

module.exports = mongoose.models.Connection || mongoose.model("Connection", connectionSchema);