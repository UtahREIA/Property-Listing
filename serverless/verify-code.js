const crypto = require("crypto");

// FAIL LOUDLY if secret not set — no weak fallback
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


function verifyToken(token, email, propertyId, code) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 5) return { valid: false, error: "Invalid token format" };
    const [tokenEmail, tokenPropertyId, tokenCode, tokenExpires, tokenHash] = parts;

    // Check expiration first (fast fail)
    if (Date.now() > parseInt(tokenExpires)) return { valid: false, error: "Verification code expired" };

    // Timing-safe hash comparison (prevents timing attacks)
    const data = `${tokenEmail}|${tokenPropertyId}|${tokenCode}|${tokenExpires}`;
    const expectedHash = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
    const expectedBuf = Buffer.from(expectedHash);
    const actualBuf   = Buffer.from(tokenHash);
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { valid: false, error: "Invalid token signature" };
    }

    // Verify all data matches
    if (tokenEmail !== email || tokenPropertyId !== propertyId || tokenCode !== code) {
      return { valid: false, error: "Invalid verification code" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Token verification failed" };
  }
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!SECRET) {
    console.error("[CONFIG] VERIFICATION_SECRET env var not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const ip = getIP(req);

  // Rate limit: max 5 verify attempts per token per 10 minutes (prevents brute force)
  const { token } = req.body || {};
  const rateLimitKey = token ? `verify_${token.substring(0, 16)}` : ip;
  const rl = rateLimit("_verifyCodeMap", rateLimitKey, 5, 10 * 60 * 1000);
  if (rl.limited) {
    console.warn(`[BRUTE FORCE ATTEMPT] IP: ${ip}, attempts: ${rl.count}`);
    return res.status(429).json({ error: "Too many attempts. Please request a new code." });
  }

  const { email, propertyId, code } = req.body || {};
  if (!email || !propertyId || !code || !token) {
    return res.status(400).json({ error: "Email, property ID, code, and token required" });
  }

  const result = verifyToken(token, email, propertyId, code);
  if (!result.valid) {
    console.warn(`[VERIFY FAIL] IP: ${ip}, reason: ${result.error}`);
    return res.status(400).json({ success: false, error: result.error });
  }

  console.log(`[VERIFY SUCCESS] Email: ${email.substring(0,3)}***@***, Property: ${propertyId}, IP: ${ip}`);
  return res.status(200).json({ success: true, message: "Verification successful" });
};