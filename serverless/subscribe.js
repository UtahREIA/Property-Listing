const Airtable = require("airtable");
const SUBSCRIBERS_TABLE = "Subscribers";

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
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const ip = getIP(req);

  // Rate limit: 5 subscribe attempts per IP per hour
  const rl = rateLimit('_subMap', ip, 5, 60 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil((rl.resetAt - Date.now()) / 60000);
    return res.status(429).json({ message: `Too many attempts. Try again in ${mins} minutes.` });
  }

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ message: "Invalid JSON body" }); }

  const { email, captcha } = body || {};

  // reCAPTCHA verification
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
  if (!RECAPTCHA_SECRET) return res.status(500).json({ message: "Server misconfigured" });
  if (!captcha) return res.status(400).json({ message: "CAPTCHA token required" });

  try {
    const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: captcha })
    });
    const recaptchaData = await recaptchaRes.json();
    if (!recaptchaData.success) {
      console.warn(`[SUBSCRIBE CAPTCHA FAIL] IP: ${ip}`);
      return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
    }
  } catch (err) {
    return res.status(502).json({ message: "Could not verify CAPTCHA" });
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  const apiKey = process.env.AIRTABLE_API_KEY_SUB;
  const baseId = process.env.AIRTABLE_BASE_ID_SUB;
  if (!apiKey || !baseId) return res.status(500).json({ message: "Server misconfigured" });

  try {
    const base = new Airtable({ apiKey }).base(baseId);
    // Safe: use filterByFormula with proper escaping
    const safeEmail = email.replace(/'/g, "''");
    const existing = await base(SUBSCRIBERS_TABLE)
      .select({ filterByFormula: `{Email} = '${safeEmail}'` })
      .firstPage();

    if (existing?.length) return res.status(200).json({ message: "Already subscribed" });

    await base(SUBSCRIBERS_TABLE).create([{ fields: { Email: email, Subscribed: true } }]);
    console.log(`[SUBSCRIBE] New subscriber: ${email.substring(0,3)}***@*** from IP ${ip}`);
    return res.status(200).json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("[SUBSCRIBE ERROR]", err.message);
    return res.status(500).json({ message: "Subscription failed", error: err.message });
  }
};