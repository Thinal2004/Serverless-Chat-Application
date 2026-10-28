require("dotenv").config();
const { connectDB } = require("../src/lib/db");
const Message = require("../src/models/Message");

(async () => {
  const mongoose = await connectDB();
  console.log(await Message.syncIndexes());
  await mongoose.disconnect();
})();