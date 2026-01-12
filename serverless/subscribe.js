// serverless/subscribe.js
// Accepts POST { email } and stores in Airtable 'Subscribers' table if not already present

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SUB }).base(process.env.AIRTABLE_BASE_ID_SUB);
const SUBSCRIBERS_TABLE = 'Subscribers';

module.exports = async (req, res) => {
  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.json({ message: 'Method not allowed' });
    return;
  }

  const { email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.json({ message: 'Invalid email address' });
    return;
  }

  try {
    // Check if already subscribed
    const existing = await base(SUBSCRIBERS_TABLE).select({ filterByFormula: `{Email} = '${email}'` }).firstPage();
    if (existing && existing.length > 0) {
      res.status(200).json({ message: 'Already subscribed' });
      return;
    }
    // Add new subscriber
    await base(SUBSCRIBERS_TABLE).create([{ fields: { Email: email } }]);
    res.status(200).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Airtable error:', err);
    res.status(500).setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.json({ message: 'Failed to subscribe' });
  }
};
