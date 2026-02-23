const crypto = require("crypto");
const SECRET = process.env.VERIFICATION_SECRET;

// Shared CORS + Rate Limiting helper — paste at top of each file

const ALLOWED_ORIGINS = [
  "https://utahreia.org",
  "https://www.utahreia.org",
  "https://app.gohighlevel.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const isGHL = origin.endsWith(".gohighlevel.com") ||
                origin.endsWith(".leadconnectorhq.com") ||
                origin.endsWith(".msgsndr.com");
  const allowed = ALLOWED_ORIGINS.includes(origin) || isGHL;
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  return allowed;
}

function rateLimit(map, key, max, windowMs) {
  if (!global[map]) global[map] = new Map();
  const now = Date.now();
  const rec = global[map].get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  rec.count++;
  global[map].set(key, rec);
  return { limited: rec.count > max, resetAt: rec.resetAt, count: rec.count };
}

function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
         req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}


module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!SECRET) return res.status(500).json({ error: "Server configuration error" });

  const ip = getIP(req);
  const rl = rateLimit("_deletePropMap", ip, 10, 60 * 60 * 1000);
  if (rl.limited) return res.status(429).json({ error: "Too many requests" });

  const { recordId, token, email } = req.body || {};
  if (!recordId) return res.status(400).json({ error: "Missing required field: recordId" });
  if (!token || !email) return res.status(401).json({ error: "Verification token and email required" });

  // Validate the token matches this property and hasn't expired
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 5) return res.status(401).json({ error: "Invalid token" });
    const [tokenEmail, tokenPropertyId, , tokenExpires, tokenHash] = parts;

    if (Date.now() > parseInt(tokenExpires)) return res.status(401).json({ error: "Token expired. Please verify again." });
    if (tokenPropertyId !== recordId) return res.status(403).json({ error: "Token not valid for this property" });
    if (tokenEmail.toLowerCase() !== email.toLowerCase()) return res.status(403).json({ error: "Email mismatch" });

    const data = parts.slice(0, 4).join("|");
    const expectedHash = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
    const expectedBuf = Buffer.from(expectedHash);
    const actualBuf = Buffer.from(tokenHash);
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return res.status(401).json({ error: "Invalid token signature" });
    }
  } catch (err) {
    return res.status(401).json({ error: "Token verification failed" });
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return res.status(500).json({ error: "Server configuration error" });

  // First confirm the contact email on the property matches the verified email
  try {
    const fetchRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Properties/${recordId}`,
      { headers: { "Authorization": `Bearer ${AIRTABLE_API_KEY}` } }
    );
    if (!fetchRes.ok) return res.status(404).json({ error: "Property not found" });
    const record = await fetchRes.json();
    const contactEmail = record.fields["Contact\'s Email"] || "";
    if (contactEmail.toLowerCase() !== email.toLowerCase()) {
      console.warn(`[DELETE BLOCKED] Email mismatch for property ${recordId} from IP ${ip}`);
      return res.status(403).json({ error: "You are not authorized to delete this property" });
    }

    // Delete
    const deleteRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Properties/${recordId}`,
      { method: "DELETE", headers: { "Authorization": `Bearer ${AIRTABLE_API_KEY}` } }
    );
    if (!deleteRes.ok) return res.status(deleteRes.status).json({ error: "Failed to delete property" });

    const data = await deleteRes.json();
    console.log(`[DELETE] Property ${recordId} deleted by ${email.substring(0,3)}***@*** from IP ${ip}`);
    return res.status(200).json({ success: true, message: "Property deleted successfully", deleted: data.deleted });
  } catch (error) {
    console.error("[DELETE ERROR]", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};