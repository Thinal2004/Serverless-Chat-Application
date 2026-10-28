const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  type: { type: String, enum: ["room", "dm"], required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  participants: { type: [String], default: undefined },   // only set for DMs
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ participants: 1, timestamp: -1 });

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);