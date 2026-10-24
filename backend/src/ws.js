const { connectDB } = require("./lib/db");
const { verifyToken } = require("./lib/auth");
const User = require("./models/User");
const Connection = require("./models/Connection");

const ok = () => ({ statusCode: 200, body: "OK" });

async function onConnect(event) {
  const { connectionId } = event.requestContext;
  const token = event.queryStringParameters?.token;
  if (!token) return { statusCode: 401, body: "Missing token" };

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    return { statusCode: 401, body: "Invalid token" };   // non-200 = handshake refused
  }

  await connectDB();
  await User.findOneAndUpdate(
    { userId: user.userId },
    { username: user.username, email: user.email },
    { upsert: true }
  );
  await Connection.findOneAndUpdate(
    { connectionId },
    { connectionId, userId: user.userId, roomId: null, connectedAt: new Date() },
    { upsert: true }
  );

  console.log("Connected:", user.username);   // never log the token
  return ok();
}

async function onDisconnect(event) {
  await connectDB();
  await Connection.deleteOne({ connectionId: event.requestContext.connectionId });
  return ok();
}

exports.handler = async (event) => {
  const route = event.requestContext.routeKey;
  try {
    switch (route) {
      case "$connect":    return await onConnect(event);
      case "$disconnect": return await onDisconnect(event);
      case "joinroom":
      case "sendmessage": return { statusCode: 501, body: "Not implemented yet" }; // Step 6
      default:            return { statusCode: 400, body: "Unknown action" };
    }
  } catch (err) {
    console.error("Handler error on", route, err.message);
    return { statusCode: 500, body: "Server error" };
  }
};