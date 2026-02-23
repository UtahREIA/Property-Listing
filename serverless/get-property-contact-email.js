const AIRTABLE_API_KEY   = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID   = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = "Properties";

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
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ip = getIP(req);

  // Rate limit: 30 lookups per IP per 15 minutes (prevents email harvesting)
  const rl = rateLimit("_contactMap", ip, 30, 15 * 60 * 1000);
  if (rl.limited) {
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }

  const { propertyId, token } = req.query;
  if (!propertyId) return res.status(400).json({ error: "Property ID required" });

  // Require a verification token — user must have completed email verification first
  if (!token) return res.status(401).json({ error: "Verification token required to view contact info" });

  // Validate token format (ureia_ prefix with expiry timestamp)
  const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET;
  if (!VERIFICATION_SECRET) return res.status(500).json({ error: "Server configuration error" });

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length < 4) return res.status(401).json({ error: "Invalid token" });
    const [tokenEmail, tokenPropertyId, , tokenExpires, tokenHash] = parts;
    if (Date.now() > parseInt(tokenExpires)) return res.status(401).json({ error: "Token expired. Please verify again." });
    // Confirm token is for this property
    if (tokenPropertyId !== propertyId) return res.status(403).json({ error: "Token not valid for this property" });

    const crypto = require("crypto");
    const data = parts.slice(0, 4).join("|");
    const expectedHash = crypto.createHmac("sha256", VERIFICATION_SECRET).update(data).digest("hex");
    if (tokenHash !== expectedHash) return res.status(401).json({ error: "Invalid token signature" });

    // Fetch property from Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${propertyId}`;
    const response = await fetch(url, { headers: { "Authorization": `Bearer ${AIRTABLE_API_KEY}` } });
    if (!response.ok) throw new Error("Failed to fetch property");

    const record = await response.json();
    const contactEmail = record.fields["Contact's Email"];
    console.log(`[CONTACT EMAIL] Accessed by ${tokenEmail} for property ${propertyId} from IP ${ip}`);
    return res.status(200).json({ contactEmail });
  } catch (error) {
    console.error("[CONTACT EMAIL ERROR]", error.message);
    return res.status(500).json({ error: "Failed to fetch contact email" });
  }
};