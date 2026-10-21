const mongoose = require("mongoose");

let connecting = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI, {
        maxPoolSize: 5,              // keep small: M0 has a connection limit
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,           
      })
      .catch((err) => { connecting = null; throw err; });
  }
  await connecting;
  return mongoose;
}

module.exports = { connectDB };