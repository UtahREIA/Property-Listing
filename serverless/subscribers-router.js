// subscribers-router.js
// Handles 3 legacy endpoints in one serverless function:
//   POST /api/subscribe         → subscribe
//   POST /api/notify-subscribers → notify
//   GET or POST /api/daily-digest → daily-digest

const Airtable = require('airtable');
const nodemailer = require('nodemailer');

const SUBSCRIBERS_TABLE = 'Subscribers';
const PROPERTIES_TABLE = 'Properties';

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
  });
}

function escapeAirtableString(v) { return String(v).replace(/'/g, "''"); }

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

async function handleNotify(req, res) {
  const { property } = req.body || {};
  if (!property || !property.Title || !property.Location)
    return res.status(400).json({ message: 'Missing property data' });

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB }).base(process.env.AIRTABLE_BASE_ID_SUB);
  const records = await base(SUBSCRIBERS_TABLE).select().all();
  const emails = records.map(r => r.fields.Email).filter(Boolean);
  if (!emails.length) return res.status(200).json({ message: 'No subscribers to notify' });

  const html = `<h2>New Property Listed!</h2>
    <p><strong>${property.Title}</strong></p><p>${property.Location}</p>
    <p>${property.Description || ''}</p>
    <a href="https://utahreia.org/property-listing-page" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">View All Listings</a>
    <p style="margin-top:24px;font-size:13px;color:#888;">To unsubscribe, <a href="https://utahreia.org/unsubscribe">click here</a>.</p>`;

  await getTransporter().sendMail({
    from: process.env.GMAIL_USER, bcc: emails,
    subject: `New Property Listed: ${property.Title}`, html,
  });
  return res.status(200).json({ message: 'Notification sent' });
}

async function handleDailyDigest(req, res) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`)
    return res.status(401).json({ error: 'Unauthorized' });

  const propertiesBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
  const subscribersBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB }).base(process.env.AIRTABLE_BASE_ID_SUB);

  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const propertyRecords = await propertiesBase(PROPERTIES_TABLE)
    .select({ filterByFormula: `CREATED_TIME() >= '${yesterday}'` }).all();

  if (!propertyRecords.length)
    return res.status(200).json({ message: 'No new properties in the last 24 hours.' });

  const subscriberRecords = await subscribersBase(SUBSCRIBERS_TABLE)
    .select({ filterByFormula: 'Subscribed = TRUE()' }).all();
  const emails = subscriberRecords.map(r => r.fields.Email).filter(Boolean);
  if (!emails.length) return res.status(200).json({ message: 'No subscribers to notify.' });

  const propertyList = propertyRecords.map(r => {
    const f = r.fields;
    let img = '';
    if (f.Image?.[0]) {
      const url = f.Image[0].thumbnails?.large?.url || f.Image[0].url;
      img = `<div style="margin:8px 0;"><img src="${url}" alt="${f.Title||''}" style="max-width:320px;max-height:200px;border-radius:8px;"></div>`;
    }
    return `<li style="margin-bottom:24px;"><strong>${f.Title||'Untitled'}</strong> - ${f.Location||''} - $${f.Price||''}<br>${img}${f.Description||''}</li>`;
  }).join('');

  await getTransporter().sendMail({
    from: process.env.GMAIL_USER, bcc: emails,
    subject: 'Utah REIA: New Properties Listed (Daily Digest)',
    html: `<h2>New Properties Listed in the Last 24 Hours</h2><ul style="padding-left:0;list-style:none;">${propertyList}</ul><p><a href="https://utahreia.org/property-listing-page">View All Listings</a></p>`,
  });

  return res.status(200).json({ message: 'Daily digest sent', count: propertyRecords.length });
}

function detectAction(req) {
  const url = req.url || '';
  const action = req.query.action || '';
  if (url.includes('notify-subscribers') || action === 'notify') return 'notify';
  if (url.includes('daily-digest') || action === 'daily-digest') return 'daily-digest';
  if (url.includes('subscribe') || action === 'subscribe') return 'subscribe';
  return null;
}

module.exports = async (req, res) => {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();

    const action = detectAction(req);
    if (action === 'subscribe' && req.method === 'POST') return await handleSubscribe(req, res);
    if (action === 'notify' && req.method === 'POST') return await handleNotify(req, res);
    if (action === 'daily-digest') return await handleDailyDigest(req, res);

    return res.status(400).json({ error: 'Unknown endpoint' });
  } catch (err) {
    console.error('subscribers-router error:', err);
    return res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};
