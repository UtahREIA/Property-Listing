// Serverless function to fetch notes from Airtable
const AIRTABLE_API_KEY  = process.env.AIRTABLE_NOTE_API_KEY;
const AIRTABLE_BASE_ID  = process.env.AIRTABLE_NOTE_BASE_ID;
const AIRTABLE_TABLE    = 'Notes';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  try {
    const fields = [
      'Title', 'Asking Price', 'Original Balance', 'Current Balance',
      'Interest Rate', 'Monthly Payment', 'Note Position', 'Performance Status',
      'Property Type', 'Property Address', 'State', 'LTV',
      'Maturity Date', 'Origination Date', 'Months Remaining',
      'Status', 'Description', 'Images', 'Documents',
      "Contact's Name", "Contact's Email", "Contact's Phone Number",
      'Date Listed', 'Yield', 'Discount',
    ];

    const fieldParams = fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}?maxRecords=100&${fieldParams}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch notes');
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error fetching notes:', error);
    return res.status(500).json({ error: 'Failed to fetch notes', message: error.message });
  }
};