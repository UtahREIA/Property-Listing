const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
const NOTIFY_URL = process.env.NOTIFY_URL || 'https://property-listing-32ax.vercel.app/api/notify-subscribers';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = 'Properties';

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


function sanitizeFields(data) {
  const allowed = ['Title','Price','Location','Property Type','Bedrooms','Bathrooms',
                   'Square Feet','Description','Amenities','Year Built',
                   "Contact's Name","Contact's Email","Contact's Phone Number"];
  const clean = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      const val = String(data[key]).substring(0, 500).trim();
      clean[key] = val;
    }
  }
  // Numeric fields
  if (clean.Price)        clean.Price        = parseFloat(clean.Price) || 0;
  if (clean.Bedrooms)     clean.Bedrooms     = parseInt(clean.Bedrooms) || 0;
  if (clean.Bathrooms)    clean.Bathrooms    = parseFloat(clean.Bathrooms) || 0;
  if (clean['Square Feet']) clean['Square Feet'] = parseInt(clean['Square Feet']) || 0;
  if (clean['Year Built'])  clean['Year Built']  = parseInt(clean['Year Built']) || 0;
  // Email validation
  if (clean["Contact's Email"] && !/^\S+@\S+\.\S+$/.test(clean["Contact's Email"])) {
    delete clean["Contact's Email"];
  }
  return clean;
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);

  // Rate limit: 5 submissions per IP per hour
  const rl = rateLimit('_addPropMap', ip, 5, 60 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil((rl.resetAt - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many submissions. Try again in ${mins} minutes.` });
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  // reCAPTCHA verification
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
  if (!RECAPTCHA_SECRET) return res.status(500).json({ error: 'Server configuration error: missing reCAPTCHA secret' });
  if (!body.recaptchaToken) return res.status(400).json({ error: 'Missing reCAPTCHA token' });

  const recaptchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${body.recaptchaToken}`, { method: 'POST' });
  const recaptchaJson = await recaptchaRes.json();
  if (!recaptchaJson.success) {
    console.warn(`[CAPTCHA FAIL] IP: ${ip}`);
    return res.status(400).json({ error: 'reCAPTCHA verification failed' });
  }

  // Sanitize and validate fields
  const airtableFields = sanitizeFields(body);
  if (!airtableFields.Title || !airtableFields.Price || !airtableFields.Location) {
    return res.status(400).json({ error: 'Missing required fields: Title, Price, Location' });
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: airtableFields })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[AIRTABLE ERROR]', error);
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    console.log('[PROPERTY ADDED]', JSON.stringify({ ip, title: airtableFields.Title, time: new Date().toISOString() }));

    // Notify subscribers (server-to-server with internal secret)
    try {
      await fetch(NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET || '' },
        body: JSON.stringify({ property: airtableFields })
      });
    } catch (notifyErr) {
      console.error('[NOTIFY ERROR]', notifyErr.message);
    }

    return res.status(200).json({ success: true, message: 'Property added successfully', data });
  } catch (error) {
    console.error('[ADD PROPERTY ERROR]', error.message);
    return res.status(500).json({ error: 'Failed to add property', message: error.message });
  }
};