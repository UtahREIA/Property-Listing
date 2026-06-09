// Serverless function to add properties to Airtable
// Deploy this to Vercel, Netlify, AWS Lambda, or any serverless platform

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = 'Properties';

// Whitelist of every field that exists in the Airtable Properties table.
// Any key sent from the frontend that is NOT in this list will be silently
// skipped so Airtable never sees an unknown field and throws a 500.
const ALLOWED_FIELDS = new Set([
  'Title',
  'Category',
  'Property Type',
  'Price',
  'Location',
  'Status',
  'Description',
  "Contact's Name",
  "Contact's Email",
  "Contact's Phone Number",
  'Image',
  'Bedrooms',
  'Bathrooms',
  'Square Feet',
  'Year Built',
  'Amenities',
  'Contacted',
  'Expiration Warning Sent',
]);

module.exports = async (req, res) => {
  // 1. Set CORS Headers IMMEDIATELY so errors are visible to frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Ensure request body is parsed as JSON
  if (!req.body || typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('❌ Missing Airtable credentials');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Missing Airtable credentials'
      });
    }

    const propertyData = req.body;
    console.log('📥 Received fields:', Object.keys(propertyData || {}));

    // --- reCAPTCHA v2 verification ---
    const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

    if (!RECAPTCHA_SECRET) {
      console.error('❌ Missing RECAPTCHA_SECRET env var');
      return res.status(500).json({ error: 'Server configuration error: Missing reCAPTCHA secret' });
    }

    const recaptchaToken = propertyData.recaptchaToken;
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'Missing reCAPTCHA token' });
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`;
    const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
    const recaptchaJson = await recaptchaRes.json();

    if (!recaptchaJson.success) {
      console.error('❌ reCAPTCHA failed:', recaptchaJson);
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }
    // --- end reCAPTCHA verification ---

    // Validate required fields
    if (!propertyData.Title || !propertyData.Price || !propertyData.Location) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['Title', 'Price', 'Location']
      });
    }

    // Strip recaptchaToken from the payload
    const { recaptchaToken: _unused, ...allFields } = propertyData;

    // Only send fields that exist in Airtable.
    // Unknown fields cause Airtable to return a 422/500, crashing the whole request.
    const airtableFields = {};
    for (const [key, value] of Object.entries(allFields)) {
      if (ALLOWED_FIELDS.has(key)) {
        airtableFields[key] = value;
      } else {
        console.warn(`⚠️  Skipping unknown field: "${key}"`);
      }
    }

    console.log('📤 Sending to Airtable:', Object.keys(airtableFields));

    // Add to Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: airtableFields })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Airtable API Error:', JSON.stringify(error));
      // Return the actual Airtable error so it shows in the browser console
      return res.status(response.status).json({
        error: 'Airtable rejected the record',
        airtableError: error,
        fieldsSent: Object.keys(airtableFields)
      });
    }

    const data = await response.json();
    console.log('✅ Property added:', data.id);

    // Notify subscribers (fire and forget — non-fatal)
    try {
      const notifyUrl = 'https://property-listing-32ax.vercel.app/api/notify-subscribers';
      console.log('📣 Calling notify-subscribers');
      const notifyRes = await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: airtableFields })
      });
      if (notifyRes.ok) console.log('✅ Subscribers notified');
      else console.warn('⚠️  Notify returned:', notifyRes.status);
    } catch (notifyErr) {
      console.error('⚠️  Failed to notify subscribers (non-fatal):', notifyErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Property added successfully',
      data: data
    });

  } catch (error) {
    console.error('❌ Unhandled error in add-property:', error);
    return res.status(500).json({
      error: 'Failed to add property',
      message: error.message
    });
  }
};