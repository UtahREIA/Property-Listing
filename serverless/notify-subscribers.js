const Airtable = require('airtable');
const nodemailer = require('nodemailer');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB }).base(process.env.AIRTABLE_BASE_ID_SUB);
const SUBSCRIBERS_TABLE = 'Subscribers';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

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
  // This is an INTERNAL endpoint — no browser CORS needed
  // Only callable from add-property.js using the shared INTERNAL_SECRET
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  // Verify internal secret — reject all outside callers
  const secret = req.headers['x-internal-secret'];
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    console.warn('[NOTIFY] Unauthorized call — bad internal secret');
    return res.status(403).json({ message: 'Forbidden' });
  }

  const ip = getIP(req);
  // Rate limit: max 20 notify calls per hour (fire-and-forget protection)
  const rl = rateLimit('_notifyMap', ip, 20, 60 * 60 * 1000);
  if (rl.limited) return res.status(429).json({ message: 'Rate limit exceeded' });

  const { property } = req.body || {};
  if (!property || !property.Title || !property.Location) {
    return res.status(400).json({ message: 'Missing property data' });
  }

  try {
    const records = await base(SUBSCRIBERS_TABLE).select({ filterByFormula: 'Subscribed = TRUE()' }).all();
    const emails = records.map(r => r.fields.Email).filter(Boolean);
    if (emails.length === 0) return res.status(200).json({ message: 'No subscribers to notify' });

    const transporter = nodemailer.createTransport({
      host: process.env.GMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.GMAIL_PORT || '587', 10),
      secure: process.env.GMAIL_SECURE === 'true',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });

    const subject = `New Property Listed: ${property.Title}`;
    const listUrl = 'https://utahreia.org/property-listing-page';

    // Send individual emails so unsubscribe link has real email
    let sent = 0;
    for (const email of emails) {
      try {
        const html = `<h2>New Property Listed!</h2>
          <p><strong>${property.Title}</strong></p>
          <p>${property.Location}</p>
          <p>${property.Description || ''}</p>
          <a href="${listUrl}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">View All Listings</a>
          <p style="margin-top:24px;font-size:13px;color:#888;">
            To unsubscribe, <a href="${listUrl}?unsubscribe=${encodeURIComponent(email)}">click here</a>.
          </p>`;
        await transporter.sendMail({ from: process.env.GMAIL_USER, to: email, subject, html });
        sent++;
      } catch (emailErr) {
        console.error(`[NOTIFY] Failed to email ${email}:`, emailErr.message);
      }
    }

    console.log(`[NOTIFY] Sent to ${sent}/${emails.length} subscribers for: ${property.Title}`);
    return res.status(200).json({ message: 'Notifications sent', sent });
  } catch (err) {
    console.error('[NOTIFY ERROR]', err.message);
    return res.status(500).json({ message: 'Failed to send notifications' });
  }
};