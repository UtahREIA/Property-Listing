// serverless/subscribe.js
// Accepts POST { email } and stores in Airtable 'Subscribers' table if not already present

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB }).base(process.env.AIRTABLE_BASE_ID_SUB);
const SUBSCRIBERS_TABLE = 'Subscribers';

module.exports = async (req, res) => {
  // Always set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  try {
    // Check if already subscribed
    const existing = await base(SUBSCRIBERS_TABLE).select({ filterByFormula: `{Email} = '${email}'` }).firstPage();
    if (existing && existing.length > 0) {
      return res.status(200).json({ message: 'Already subscribed' });
    }
    // Add new subscriber
    await base(SUBSCRIBERS_TABLE).create([{ fields: { Email: email } }]);
    return res.status(200).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Airtable error:', err);
    return res.status(500).json({ message: 'Failed to subscribe' });
  }
};
