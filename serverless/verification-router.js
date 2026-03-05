// verification-router.js
// Handles 3 legacy endpoints routed through one serverless function:
//   POST /api/send-verification-code   → send-code
//   POST /api/verify-code              → verify-code
//   GET  /api/get-property-contact-email?propertyId=XXX → get-contact-email
// Also supports ?action= style for future use.

const nodemailer = require('nodemailer');
const crypto = require('crypto');

const SECRET = process.env.VERIFICATION_SECRET || 'your-secret-key-change-in-production';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function createVerificationToken(email, propertyId, code, expires) {
  const data = `${email}|${propertyId}|${code}|${expires}`;
  const hash = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return Buffer.from(`${data}|${hash}`).toString('base64');
}

function verifyToken(token, email, propertyId, code) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 5) return { valid: false, error: 'Invalid token format' };
    const [tokenEmail, tokenPropertyId, tokenCode, tokenExpires, tokenHash] = parts;
    const data = `${tokenEmail}|${tokenPropertyId}|${tokenCode}|${tokenExpires}`;
    const expectedHash = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    if (tokenHash !== expectedHash) return { valid: false, error: 'Invalid token signature' };
    if (Date.now() > parseInt(tokenExpires)) return { valid: false, error: 'Verification code expired' };
    if (tokenEmail !== email || tokenPropertyId !== propertyId || tokenCode !== code)
      return { valid: false, error: 'Invalid verification code' };
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Token verification failed' };
  }
}

async function handleSendCode(req, res) {
  const { email, propertyId } = req.body || {};
  if (!email || !propertyId)
    return res.status(400).json({ error: 'Email and property ID required' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000;
  const token = createVerificationToken(email, propertyId, code, expires);

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD)
    return res.status(500).json({ error: 'Email service not configured' });

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      tls: { rejectUnauthorized: false }
    });
    await transporter.sendMail({
      from: `"Property Listing" <${GMAIL_USER}>`,
      to: email,
      subject: 'Property Management - Email Verification Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
            <h1 style="color:white;margin:0;">🔐 Email Verification</h1>
          </div>
          <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;">
            <p style="font-size:16px;color:#333;margin-bottom:20px;">Use the code below to manage your property:</p>
            <div style="background:white;padding:20px;text-align:center;border-radius:8px;margin:25px 0;">
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;">${code}</div>
            </div>
            <p style="font-size:14px;color:#6b7280;">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
          </div>
        </div>`
    });
    console.log(`✅ Verification code sent to ${email}`);
    return res.status(200).json({ success: true, message: 'Verification code sent', token });
  } catch (err) {
    console.error('Send code error:', err);
    return res.status(500).json({ error: 'Failed to send verification email', message: err.message });
  }
}

async function handleVerifyCode(req, res) {
  const { email, propertyId, code, token } = req.body || {};
  if (!email || !propertyId || !code || !token)
    return res.status(400).json({ success: false, error: 'Email, propertyId, code and token required' });
  const result = verifyToken(token, email, propertyId, code);
  if (!result.valid) return res.status(400).json({ success: false, error: result.error });
  return res.status(200).json({ success: true, message: 'Verification successful' });
}

async function handleGetContactEmail(req, res) {
  const propertyId = req.query.propertyId;
  if (!propertyId) return res.status(400).json({ error: 'Property ID required' });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Properties/${propertyId}`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch property');
    }
    const data = await response.json();
    return res.status(200).json({ contactEmail: data.fields["Contact's Email"] });
  } catch (err) {
    console.error('Get contact email error:', err);
    return res.status(500).json({ error: 'Failed to fetch contact email', message: err.message });
  }
}

// Detect which endpoint is being called based on the request URL path
function detectAction(req) {
  const url = req.url || '';
  const action = req.query.action || '';

  if (url.includes('send-verification-code') || action === 'send-code') return 'send-code';
  if (url.includes('verify-code') || action === 'verify-code') return 'verify-code';
  if (url.includes('get-property-contact-email') || action === 'get-contact-email') return 'get-contact-email';
  return null;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = detectAction(req);

  if (action === 'send-code' && req.method === 'POST') return handleSendCode(req, res);
  if (action === 'verify-code' && req.method === 'POST') return handleVerifyCode(req, res);
  if (action === 'get-contact-email' && req.method === 'GET') return handleGetContactEmail(req, res);

  return res.status(400).json({
    error: 'Unknown endpoint. Supported: /api/send-verification-code, /api/verify-code, /api/get-property-contact-email'
  });
};
