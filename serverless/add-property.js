// Serverless function to add properties to Airtable
// Deploy this to Vercel, Netlify, AWS Lambda, or any serverless platform

// Set these as environment variables in your serverless platform
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = 'Properties';

module.exports = async (req, res) => {
  // Enable CORS for your GHL domain
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your specific domain in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get property data from request body
    const propertyData = req.body;

    // Validate required fields
    if (!propertyData.Title || !propertyData.Price || !propertyData.Location) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['Title', 'Price', 'Location', 'Status', 'Description', "Agent's Name", "Agent's Email", "Agent's Phone Number"]
      });
    }

    // Add to Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: propertyData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to add property');
    }

    const data = await response.json();
    
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
