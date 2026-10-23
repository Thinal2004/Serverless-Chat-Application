require("dotenv").config();
const { verifyToken } = require("../src/lib/auth");

(async () => {
  const token = process.argv[2];
  if (!token) return console.log("Usage: node scripts/test-auth.js <IdToken>");

  console.log("Valid token ->", await verifyToken(token));

  const tampered = token.slice(0, -4) + "AAAA"; // corrupt the signature
  try { await verifyToken(tampered); console.log("PROBLEM: tampered token accepted"); }
  catch (e) { console.log("Tampered token rejected:", e.message); }

  try { await verifyToken("not.a.token"); }
  catch (e) { console.log("Garbage rejected:", e.message); }
})();