// serverless/notify-subscribers.js
// Called when a new property is added. Sends email to all subscribers.

const Airtable = require('airtable');
const nodemailer = require('nodemailer');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB }).base(process.env.AIRTABLE_BASE_ID_SUB);
const SUBSCRIBERS_TABLE = 'Subscribers';

const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_HOST,
  port: parseInt(process.env.GMAIL_PORT, 10),
  secure: process.env.GMAIL_SECURE === 'true',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { property } = req.body || {};
  if (!property || !property.Title || !property.Location) {
    return res.status(400).json({ message: 'Missing property data' });
  }

  try {
    // Get all subscribers
    const records = await base(SUBSCRIBERS_TABLE).select().all();
    const emails = records.map(r => r.fields.Email).filter(Boolean);
    if (emails.length === 0) {
      return res.status(200).json({ message: 'No subscribers to notify' });
    }

    // Email content
    const subject = `New Property Listed: ${property.Title}`;
    const url = 'https://utahreia.org/property-listing-page';
    const html = `<h2>New Property Listed!</h2>
      <p><strong>${property.Title}</strong></p>
      <p>${property.Location}</p>
      <p>${property.Description || ''}</p>
      <a href="${url}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">View All Listings</a>
      <p style="margin-top:24px;font-size:13px;color:#888;">To unsubscribe, click <a href="${url}?unsubscribe={{email}}">here</a>.</p>`;

    // Send to all
    console.log('Sending notification email...');
    console.log('From:', process.env.GMAIL_USER);
    console.log('BCC:', emails);
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      bcc: emails,
      subject,
      html,
    });
    console.log('Notification email sent successfully.');
    return res.status(200).json({ message: 'Notification sent' });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ message: 'Failed to send notifications' });
  }
};
