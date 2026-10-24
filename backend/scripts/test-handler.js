require("dotenv").config();
const mongoose = require("mongoose");
const { handler } = require("../src/ws");
const Connection = require("../src/models/Connection");

const ev = (routeKey, extra = {}) => ({
  requestContext: { routeKey, connectionId: "test-conn-1" },
  ...extra,
});

(async () => {
  const token = process.argv[2];
  console.log("no token   ->", (await handler(ev("$connect"))).statusCode);
  console.log("bad token  ->", (await handler(ev("$connect", { queryStringParameters: { token: "bad" } }))).statusCode);
  console.log("good token ->", (await handler(ev("$connect", { queryStringParameters: { token } }))).statusCode);
  console.log("saved:", await Connection.findOne({ connectionId: "test-conn-1" }).lean());
  console.log("disconnect ->", (await handler(ev("$disconnect"))).statusCode);
  console.log("after disconnect:", await Connection.findOne({ connectionId: "test-conn-1" }).lean());
  await mongoose.disconnect();
})();