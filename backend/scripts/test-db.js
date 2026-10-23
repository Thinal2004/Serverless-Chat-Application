require("dotenv").config();
const { connectDB } = require("../src/lib/db");
const { dmId } = require("../src/lib/conversation");
const User = require("../src/models/User");
const Connection = require("../src/models/Connection");
const Message = require("../src/models/Message");

(async () => {
  const mongoose = await connectDB();
  console.log("Connected");

  // Build the indexes once, since autoIndex is off
  await Promise.all([User.syncIndexes(), Connection.syncIndexes(), Message.syncIndexes()]);

  // Upsert = create if missing, update if it exists (we'll use this on login)
  await User.findOneAndUpdate(
    { userId: "u1" }, { username: "alice", email: "alice@example.com" }, { upsert: true }
  );
  await User.findOneAndUpdate(
    { userId: "u2" }, { username: "bob" }, { upsert: true }
  );

  const conversationId = dmId("u1", "u2");
  await Message.create({ conversationId, type: "dm", senderId: "u1", senderName: "alice", content: "Hi Bob!" });
  await Message.create({ conversationId, type: "dm", senderId: "u2", senderName: "bob", content: "Hey Alice" });

  const history = await Message.find({ conversationId }).sort({ timestamp: -1 }).limit(10).lean();
  console.log(conversationId, history.map((m) => `${m.senderName}: ${m.content}`));

  // Test validation: this should fail
  try { await Message.create({ conversationId, type: "dm", senderId: "u1" }); }
  catch (e) { console.log("Validation works:", e.message); }

  await mongoose.disconnect();
})();