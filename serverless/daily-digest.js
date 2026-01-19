// serverless/daily-digest.js
// Sends a daily summary of new properties to all subscribers

const Airtable = require('airtable');
const nodemailer = require('nodemailer');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PROPERTIES_TABLE = 'Properties';
const SUBSCRIBERS_TABLE = 'Subscribers';

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

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
  // Only allow scheduled (GET) or manual POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Get all properties added in the last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const isoYesterday = yesterday.toISOString();

    // Airtable formula for created time in last 24 hours
    const filterFormula = `CREATED_TIME() >= '${isoYesterday}'`;
    const propertyRecords = await base(PROPERTIES_TABLE)
      .select({ filterByFormula: filterFormula })
      .all();

    if (propertyRecords.length === 0) {
      return res.status(200).json({ message: 'No new properties in the last 24 hours.' });
    }

    // 2. Get all active subscribers
    const subscriberRecords = await base(SUBSCRIBERS_TABLE)
      .select({ filterByFormula: 'Subscribed = TRUE()' })
      .all();
    const emails = subscriberRecords.map(r => r.fields.Email).filter(Boolean);
    if (emails.length === 0) {
      return res.status(200).json({ message: 'No subscribers to notify.' });
    }

    // 3. Build the email content with images
    const propertyList = propertyRecords.map(r => {
      const f = r.fields;
      let imageHtml = '';
      if (f.Image && Array.isArray(f.Image) && f.Image[0]) {
        // Use large thumbnail if available, else use url
        const imgUrl = f.Image[0].thumbnails?.large?.url || f.Image[0].url;
        const altText = f.Title ? `Image of ${f.Title}` : 'Property Image';
        imageHtml = `<div style="margin:8px 0;"><img src="${imgUrl}" alt="${altText}" style="max-width:320px;max-height:200px;border-radius:8px;box-shadow:0 2px 8px #ccc;"></div>`;
      }
      return `<li style="margin-bottom:24px;"><strong>${f.Title || 'Untitled'}</strong> - ${f.Location || ''} - $${f.Price || ''}<br>${imageHtml}${f.Description || ''}</li>`;
    }).join('');
    const html = `<h2>New Properties Listed in the Last 24 Hours</h2><ul style="padding-left:0;list-style:none;">${propertyList}</ul><p><a href="https://utahreia.org/property-listing-page">View All Listings</a></p>`;

    // 4. Send the email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      bcc: emails,
      subject: 'Utah REIA: New Properties Listed (Daily Digest)',
      html,
    });

    return res.status(200).json({ message: 'Daily digest sent', count: propertyRecords.length });
  } catch (err) {
    console.error('Daily digest error:', err);
    return res.status(500).json({ message: 'Failed to send daily digest', error: err.message });
  }
};
