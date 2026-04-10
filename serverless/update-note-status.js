// Serverless function to update a note's status in Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_NOTE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_NOTE_BASE_ID;
const AIRTABLE_TABLE   = 'Notes';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { recordId, status } = req.body;

    if (!recordId || !status)
      return res.status(400).json({ error: 'Missing required fields: recordId and status' });

    const validStatuses = ['Available', 'Under Contract', 'Sold'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid status. Must be: Available, Under Contract, or Sold' });

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID)
      return res.status(500).json({ error: 'Server configuration error' });

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}/${recordId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ fields: { 'Status': status } }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Airtable error:', err);
      return res.status(response.status).json({ error: 'Failed to update note status' });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, message: 'Note status updated successfully', record: data });

  } catch (error) {
    console.error('Error updating note status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
