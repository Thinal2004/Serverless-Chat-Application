const { connectDB } = require("./lib/db");
const { verifyToken } = require("./lib/auth");
const { roomId, dmId } = require("./lib/conversation");
const { pushToConnections } = require("./lib/push");
const User = require("./models/User");
const Connection = require("./models/Connection");
const Message = require("./models/Message");

const ok = () => ({ statusCode: 200, body: "OK" });
const ROOM_NAME = /^[a-z0-9_-]{1,30}$/i;

const parseBody = (event) => {
  try { return JSON.parse(event.body || "{}"); } catch { return null; }
};
// Reply to the sender's own connection only
const reply = (event, payload) =>
  pushToConnections(event, [event.requestContext.connectionId], payload);

async function onConnect(event) {
  const { connectionId } = event.requestContext;
  const token = event.queryStringParameters?.token;
  if (!token) { console.log("Reject: missing token"); return { statusCode: 401, body: "Missing token" }; }

  let user;
  try {
    user = await verifyToken(token);
  } catch (e) {
    console.log("Reject: invalid token:", e.message);   // reason only, never the token
    return { statusCode: 401, body: "Invalid token" };
  }

  await connectDB();
  await User.findOneAndUpdate(
    { userId: user.userId },
    { username: user.username, email: user.email },
    { upsert: true }
  );
  await Connection.findOneAndUpdate(
    { connectionId },
    { connectionId, userId: user.userId, username: user.username, roomId: null, connectedAt: new Date() },
    { upsert: true }
  );
  console.log("Connected:", user.username);
  return ok();
}

async function onDisconnect(event) {
  await connectDB();
  await Connection.deleteOne({ connectionId: event.requestContext.connectionId });
  return ok();
}

async function onJoinRoom(event) {
  const body = parseBody(event);
  const name = typeof body?.room === "string" ? body.room.trim() : "";
  if (!ROOM_NAME.test(name)) {
    await reply(event, { type: "error", message: "Invalid room name (letters, numbers, - and _ only, max 30)" });
    return ok();
  }

  await connectDB();
  const conn = await Connection.findOneAndUpdate(
    { connectionId: event.requestContext.connectionId },
    { roomId: roomId(name) },
    { new: true }
  );
  if (!conn) return { statusCode: 403, body: "Unknown connection" };

  await reply(event, { type: "joined", conversationId: conn.roomId });
  return ok();
}

async function onSendMessage(event) {
  const body = parseBody(event);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content || content.length > 2000) {
    await reply(event, { type: "error", message: "Message must be 1-2000 characters" });
    return ok();
  }

  await connectDB();
  // Identity comes from the verified connection record, never from the message body
  const sender = await Connection.findOne({ connectionId: event.requestContext.connectionId }).lean();
  if (!sender) return { statusCode: 403, body: "Unknown connection" };

  const type = body.type === "dm" ? "dm" : "room";
  let conversationId, targetFilter;

  if (type === "dm") {
    // typeof check blocks NoSQL operator injection like {"$ne": ""}
    const target = typeof body.to === "string" ? await User.findOne({ username: body.to.trim() }).lean() : null;
    if (!target) {
      await reply(event, { type: "error", message: "User not found" });
      return ok();
    }
    conversationId = dmId(sender.userId, target.userId);
    targetFilter = { userId: { $in: [sender.userId, target.userId] } };   // both people, all their tabs
  } else {
    if (!sender.roomId) {
      await reply(event, { type: "error", message: "Join a room first" });
      return ok();
    }
    conversationId = sender.roomId;
    targetFilter = { roomId: sender.roomId };
  }

  const msg = await Message.create({
    conversationId, type, senderId: sender.userId, senderName: sender.username, content,
  });

  const targets = await Connection.find(targetFilter).select("connectionId").lean();
  await pushToConnections(event, targets.map((t) => t.connectionId), {
    type: "message",
    conversationId,
    messageType: type,
    senderId: sender.userId,
    senderName: sender.username,
    content,
    timestamp: msg.timestamp,
  });
  return ok();
}

exports.handler = async (event) => {
  const route = event?.requestContext?.routeKey;
  console.log("Route:", route);
  try {
    switch (route) {
      case "$connect":    return await onConnect(event);
      case "$disconnect": return await onDisconnect(event);
      case "joinroom":    return await onJoinRoom(event);
      case "sendmessage": return await onSendMessage(event);
      default:
        await reply(event, { type: "error", message: 'Send JSON like {"action":"sendmessage",...}' });
        return ok();
    }
  } catch (err) {
    console.error("Handler error on", route, err.message);
    return { statusCode: 500, body: "Server error" };
  }
};