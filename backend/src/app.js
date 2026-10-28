const express = require("express");
const cors = require("cors");
const { connectDB } = require("./lib/db");
const requireAuth = require("./middleware/auth");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "10kb" }));            

app.get("/health", (req, res) => res.json({ ok: true }));   // public, no DB needed

// needs the database
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (e) { console.error("DB error:", e.message); res.status(503).json({ error: "Database unavailable" }); }
});

app.use("/users", requireAuth, require("./routes/users"));
app.use("/conversations", requireAuth, require("./routes/conversations"));
app.use("/messages", requireAuth, require("./routes/messages"));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {                   
  console.error("Error:", err.message);
  res.status(500).json({ error: "Server error" });
});

module.exports = app;