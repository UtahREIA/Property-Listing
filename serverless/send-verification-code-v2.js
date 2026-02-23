const nodemailer = require("nodemailer");
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


function createVerificationToken(email, propertyId, code, expires) {
  const data = `${email}|${propertyId}|${code}|${expires}`;
  const hash = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  return Buffer.from(`${data}|${hash}`).toString("base64");
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

  // Rate limit per IP: max 5 code requests per 10 minutes
  const rl_ip = rateLimit("_vcodeIPMap", ip, 5, 10 * 60 * 1000);
  if (rl_ip.limited) {
    const mins = Math.ceil((rl_ip.resetAt - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many requests. Try again in ${mins} minutes.` });
  }

  const { email, propertyId } = req.body;
  if (!email || !propertyId) return res.status(400).json({ error: "Email and property ID required" });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Invalid email address" });

  // Rate limit per email: max 3 codes per 10 minutes (prevents email bombing)
  const rl_email = rateLimit("_vcodeEmailMap", email.toLowerCase(), 3, 10 * 60 * 1000);
  if (rl_email.limited) {
    return res.status(429).json({ error: "Too many codes sent to this email. Please wait 10 minutes." });
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: "Email service not configured" });
  }

  // Use cryptographically secure random code
  const code = crypto.randomInt(100000, 999999).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  const token = createVerificationToken(email, propertyId, code, expires);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 587, secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
    });

    await transporter.sendMail({
      from: `"Utah REIA Property Listing" <${GMAIL_USER}>`,
      to: email,
      subject: "Your Property Verification Code — Utah REIA",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#0f2340,#1a7a4a);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
            <h1 style="color:white;margin:0;">Email Verification</h1>
          </div>
          <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;">
            <p style="font-size:16px;color:#333;">Use this code to verify your identity for property management:</p>
            <div style="background:white;padding:20px;text-align:center;border-radius:8px;margin:25px 0;border:2px dashed #0f2340;">
              <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#0f2340;">${code}</div>
            </div>
            <p style="font-size:14px;color:#6b7280;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="font-size:14px;color:#6b7280;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>`
    });

    console.log(`[VERIFY CODE] Sent to ${email.substring(0,3)}***@*** for property ${propertyId} from IP ${ip}`);
    return res.status(200).json({ success: true, message: "Verification code sent", token });
  } catch (error) {
    console.error("[VERIFY CODE ERROR]", error.message);
    return res.status(500).json({ error: "Failed to send verification email", message: error.message });
  }
};