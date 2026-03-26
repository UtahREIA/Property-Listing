// subscribers-router.js
// Handles 3 legacy endpoints in one serverless function:
//   POST /api/subscribe          → subscribe
//   POST /api/notify-subscribers → notify (instant, single property)
//   GET or POST /api/daily-digest → daily-digest (batch)

const Airtable = require('airtable');
const nodemailer = require('nodemailer');

const SUBSCRIBERS_TABLE = 'Subscribers';
const PROPERTIES_TABLE  = 'Properties';
const SITE_URL          = 'https://utahreia.org/property-listing-page';
const UNSUBSCRIBE_URL   = 'https://utahreia.org/unsubscribe';
const BRAND_COLOR       = '#667eea';
const BRAND_GRADIENT    = 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)';

// ── CORS ─────────────────────────────────────────────────────────────────────
function setCors(req, res) {
  const origin = req.headers.origin || '';
  const exactAllowed = new Set([
    'https://utahreia.org', 'https://www.utahreia.org',
    'https://app.gohighlevel.com', 'http://localhost:3000', 'http://127.0.0.1:3000',
  ]);
  const isGHL = origin.endsWith('.gohighlevel.com') ||
    origin.endsWith('.leadconnectorhq.com') || origin.endsWith('.msgsndr.com');
  if (exactAllowed.has(origin) || isGHL) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.GMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.GMAIL_PORT || '587', 10),
    secure: process.env.GMAIL_SECURE === 'true',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    tls: { rejectUnauthorized: false }
  });
}

function escapeAirtableString(v) { return String(v).replace(/'/g, "''"); }

function formatPrice(p) {
  if (!p) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(p);
}

// ── Email wrapper (shared header/footer) ─────────────────────────────────────
function emailWrapper(headingHtml, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Utah REIA Property Listings</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:620px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="${BRAND_GRADIENT};padding:36px 40px;text-align:center;">
            <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:8px;">Utah REIA</div>
            ${headingHtml}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
              You're receiving this because you subscribed to Utah REIA property alerts.
            </p>
            <p style="margin:0;font-size:13px;">
              <a href="${UNSUBSCRIBE_URL}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
              &nbsp;·&nbsp;
              <a href="${SITE_URL}" style="color:#9ca3af;text-decoration:underline;">View all listings</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Single property card HTML (used in both notify + digest) ─────────────────
function propertyCard(f, isFirst = false) {
  const imgUrl   = f.Image?.[0]?.thumbnails?.large?.url || f.Image?.[0]?.url || null;
  const price    = formatPrice(f.Price);
  const status   = f.Status || 'Available';
  const statusBg = status === 'Available' ? '#d1fae5' : status === 'Sold' ? '#fee2e2' : '#fef3c7';
  const statusColor = status === 'Available' ? '#065f46' : status === 'Sold' ? '#991b1b' : '#92400e';

  // Trim description to ~200 chars
  const desc = f.Description
    ? (f.Description.length > 220 ? f.Description.slice(0, 220).trimEnd() + '…' : f.Description)
    : '';

  return `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;${isFirst ? '' : ''}">

    <!-- Property image -->
    ${imgUrl ? `
    <tr>
      <td style="padding:0;line-height:0;">
        <img src="${imgUrl}" alt="${f.Title || 'Property'}"
          width="100%"
          style="width:100%;max-height:260px;object-fit:cover;display:block;border-radius:12px 12px 0 0;">
      </td>
    </tr>` : ''}

    <!-- Property details -->
    <tr>
      <td style="padding:24px 24px 20px 24px;background:#ffffff;">

        <!-- Title + status badge -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr>
            <td style="vertical-align:middle;">
              <span style="font-size:19px;font-weight:700;color:#1f2937;line-height:1.3;">${f.Title || 'Untitled Property'}</span>
            </td>
            <td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
              <span style="background:${statusBg};color:${statusColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">
                ${status.toUpperCase()}
              </span>
            </td>
          </tr>
        </table>

        <!-- Location -->
        ${f.Location ? `
        <p style="margin:0 0 14px 0;font-size:14px;color:#6b7280;">
          📍 ${f.Location}
        </p>` : ''}

        <!-- Price -->
        ${price ? `
        <p style="margin:0 0 16px 0;font-size:26px;font-weight:800;color:${BRAND_COLOR};">
          ${price}
        </p>` : ''}

        <!-- Specs pills -->
        ${(f.Bedrooms || f.Bathrooms || f['Square Feet'] || f['Property Type']) ? `
        <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            ${f['Property Type'] ? `<td style="padding-right:8px;"><span style="background:#f3f4f6;color:#374151;font-size:12px;font-weight:600;padding:5px 12px;border-radius:20px;display:inline-block;">🏠 ${f['Property Type']}</span></td>` : ''}
            ${f.Bedrooms        ? `<td style="padding-right:8px;"><span style="background:#f3f4f6;color:#374151;font-size:12px;font-weight:600;padding:5px 12px;border-radius:20px;display:inline-block;">🛏 ${f.Bedrooms} Bed${f.Bedrooms > 1 ? 's' : ''}</span></td>` : ''}
            ${f.Bathrooms       ? `<td style="padding-right:8px;"><span style="background:#f3f4f6;color:#374151;font-size:12px;font-weight:600;padding:5px 12px;border-radius:20px;display:inline-block;">🛁 ${f.Bathrooms} Bath${f.Bathrooms > 1 ? 's' : ''}</span></td>` : ''}
            ${f['Square Feet']  ? `<td><span style="background:#f3f4f6;color:#374151;font-size:12px;font-weight:600;padding:5px 12px;border-radius:20px;display:inline-block;">📐 ${Number(f['Square Feet']).toLocaleString()} sqft</span></td>` : ''}
          </tr>
        </table>` : ''}

        <!-- Description -->
        ${desc ? `
        <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;line-height:1.7;">
          ${desc}
        </p>` : ''}

        <!-- CTA button -->
        <a href="${SITE_URL}"
          style="display:inline-block;${BRAND_GRADIENT};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;letter-spacing:0.3px;">
          View Property →
        </a>

      </td>
    </tr>
  </table>`;
}

// ── Action: Subscribe ─────────────────────────────────────────────────────────
async function handleSubscribe(req, res) {
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch (e) { return res.status(400).json({ message: 'Invalid JSON body' }); }

  const { email } = body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ message: 'Invalid email address' });

  const apiKey = process.env.AIRTABLE_API_KEY_SUB;
  const baseId = process.env.AIRTABLE_BASE_ID_SUB;
  if (!apiKey || !baseId) return res.status(500).json({ message: 'Server misconfigured' });

  const base = new Airtable({ apiKey }).base(baseId);
  const existing = await base(SUBSCRIBERS_TABLE)
    .select({ filterByFormula: `{Email} = '${escapeAirtableString(email)}'` })
    .firstPage();
  if (existing?.length) return res.status(200).json({ message: 'Already subscribed' });

  await base(SUBSCRIBERS_TABLE).create([{ fields: { Email: email, Subscribed: true } }]);
  return res.status(200).json({ message: 'Subscribed successfully' });
}

// ── Action: Instant notify (single new property) ──────────────────────────────
async function handleNotify(req, res) {
  const { property } = req.body || {};
  if (!property || !property.Title || !property.Location)
    return res.status(400).json({ message: 'Missing property data' });

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB })
    .base(process.env.AIRTABLE_BASE_ID_SUB);
  const records = await base(SUBSCRIBERS_TABLE).select().all();
  const emails  = records.map(r => r.fields.Email).filter(Boolean);
  if (!emails.length) return res.status(200).json({ message: 'No subscribers to notify' });

  const heading = `
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;">🏠 New Listing Alert</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:15px;">A new property just hit the Utah REIA marketplace</p>`;

  const body = `
    ${propertyCard(property, true)}
    <p style="margin:0;font-size:14px;color:#6b7280;text-align:center;">
      Browse more deals on the Utah REIA platform
    </p>`;

  await getTransporter().sendMail({
    from: `"Utah REIA Listings" <${process.env.GMAIL_USER}>`,
    bcc: emails,
    subject: `🏠 New Listing: ${property.Title}${property.Location ? ' — ' + property.Location : ''}`,
    html: emailWrapper(heading, body),
  });

  return res.status(200).json({ message: 'Notification sent', count: emails.length });
}

// ── Action: Daily digest ──────────────────────────────────────────────────────
async function handleDailyDigest(req, res) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`)
    return res.status(401).json({ error: 'Unauthorized' });

  const propertiesBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);
  const subscribersBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB })
    .base(process.env.AIRTABLE_BASE_ID_SUB);

  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const propertyRecords = await propertiesBase(PROPERTIES_TABLE)
    .select({ filterByFormula: `CREATED_TIME() >= '${yesterday}'` })
    .all();

  if (!propertyRecords.length)
    return res.status(200).json({ message: 'No new properties in the last 24 hours.' });

  const subscriberRecords = await subscribersBase(SUBSCRIBERS_TABLE)
    .select({ filterByFormula: 'Subscribed = TRUE()' })
    .all();
  const emails = subscriberRecords.map(r => r.fields.Email).filter(Boolean);
  if (!emails.length) return res.status(200).json({ message: 'No subscribers to notify.' });

  const count = propertyRecords.length;
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  const heading = `
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;">📋 Daily Property Digest</h1>
    <p style="color:rgba(255,255,255,0.85);margin:10px 0 0 0;font-size:15px;">
      ${count} new listing${count > 1 ? 's' : ''} added on ${today}
    </p>`;

  const cards = propertyRecords
    .map((r, i) => propertyCard(r.fields, i === 0))
    .join('');

  const body = `
    <p style="margin:0 0 28px 0;font-size:15px;color:#374151;line-height:1.6;">
      Here's what was listed on Utah REIA in the last 24 hours. Click any property to view full details and contact the listing owner.
    </p>

    ${cards}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td align="center">
          <a href="${SITE_URL}"
            style="display:inline-block;${BRAND_GRADIENT};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
            View All Listings →
          </a>
        </td>
      </tr>
    </table>`;

  await getTransporter().sendMail({
    from: `"Utah REIA Listings" <${process.env.GMAIL_USER}>`,
    bcc: emails,
    subject: `📋 Utah REIA Daily Digest — ${count} new listing${count > 1 ? 's' : ''} (${today})`,
    html: emailWrapper(heading, body),
  });

  return res.status(200).json({ message: 'Daily digest sent', count });
}

// ── Route detection ───────────────────────────────────────────────────────────
function detectAction(req) {
  const url    = req.url    || '';
  const action = req.query?.action || '';
  if (url.includes('notify-subscribers') || action === 'notify')       return 'notify';
  if (url.includes('daily-digest')       || action === 'daily-digest') return 'daily-digest';
  if (url.includes('subscribe')          || action === 'subscribe')    return 'subscribe';
  return null;
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();

    const action = detectAction(req);
    if (action === 'subscribe'    && req.method === 'POST') return await handleSubscribe(req, res);
    if (action === 'notify'       && req.method === 'POST') return await handleNotify(req, res);
    if (action === 'daily-digest')                          return await handleDailyDigest(req, res);

    return res.status(400).json({ error: 'Unknown endpoint' });
  } catch (err) {
    console.error('subscribers-router error:', err);
    return res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};