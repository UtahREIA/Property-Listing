// Serverless function to add properties to Airtable
// Deploy this to Vercel, Netlify, AWS Lambda, or any serverless platform

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = 'Properties';

module.exports = async (req, res) => {
  // 1. Set CORS Headers IMMEDIATELY so errors are visible to frontend
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your specific domain in production
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
      console.error('Missing Airtable Credentials');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Missing Airtable credentials'
      });
    }

    // Get property data from request body
    const propertyData = req.body;

    // --- reCAPTCHA v2 verification ---
    const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
    
    // Safety check for Secret
    if (!RECAPTCHA_SECRET) {
         console.error('Missing RECAPTCHA_SECRET env var');
         return res.status(500).json({ error: 'Server configuration error: Missing reCAPTCHA secret' });
    }

    const recaptchaToken = propertyData.recaptchaToken;
    
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'Missing reCAPTCHA token' });
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`;
    
    // Note: 'fetch' requires Node 18+. If using older Node, install 'node-fetch'
    const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
    const recaptchaJson = await recaptchaRes.json();
    
    if (!recaptchaJson.success) {
      console.error('reCAPTCHA failed:', recaptchaJson);
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

    // --- FIX IS HERE ---
    // We assign the extracted token to an unused variable (_unused) 
    // to avoid the "Identifier has already been declared" error.
    const { recaptchaToken: _unused, ...airtableFields } = propertyData;

    // Add to Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    console.log('Attempting to add property to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: airtableFields
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Airtable API Error:', error);
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();

    // Notify subscribers (fire and forget)
    try {
      // It is good practice to ensure propertyData still has the token removed if sending elsewhere
      // or simply send the 'airtableFields' object
      const notifyUrl = 'https://property-listing-32ax.vercel.app/api/notify-subscribers';
      console.log('Calling notify-subscribers.js');
      
      // We don't await the result of the fetch strictly if we want fire-and-forget, 
      // but inside a serverless function, you MUST await it, 
      // otherwise the function freezes/closes before the request is sent.
      const notifyRes = await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: airtableFields })
      });
      
      if(notifyRes.ok) console.log('Subscribers notified successfully');
      
    } catch (notifyErr) {
      // Don't fail the whole request just because notification failed
      console.error('Failed to notify subscribers:', notifyErr);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Property added successfully',
      data: data
    });

  } catch (error) {
    console.error('Error adding property:', error);
    return res.status(500).json({ 
      error: 'Failed to add property',
      message: error.message
    });
  }
};