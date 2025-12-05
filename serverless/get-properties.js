// Serverless function to fetch properties from Airtable
// Deploy this to Vercel, Netlify, AWS Lambda, or any serverless platform

// Set these as environment variables in your serverless platform
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = 'Properties';

module.exports = async (req, res) => {
  // Enable CORS for your GHL domain
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your specific domain in production
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch properties from Airtable
    const fields = [
      'Title', 'Price', 'Location', 'Property Type', 'Bedrooms', 
      'Bathrooms', 'Square Feet', 'Status', 'Image', 'Description', 
      'Amenities', 'Year Built', "Agent's Name", "Agent's Email", 
      "Agent's Phone Number"
    ];
    
    const fieldParams = fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?maxRecords=50&${fieldParams}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch properties');
    }

    const data = await response.json();
    
    // Return the properties
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error fetching properties:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch properties',
      message: error.message 
    });
  }
};
