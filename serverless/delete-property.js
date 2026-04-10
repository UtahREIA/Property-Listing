// Handles deletion for both Properties and Notes.
// Pass type: 'property' (default) or type: 'note' in the request body.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { recordId, type } = req.body;

    if (!recordId)
      return res.status(400).json({ error: 'Missing required field: recordId' });

    const isNote = type === 'note';

    const AIRTABLE_API_KEY = isNote
      ? process.env.AIRTABLE_NOTE_API_KEY
      : process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = isNote
      ? process.env.AIRTABLE_NOTE_BASE_ID
      : process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE   = isNote ? 'Notes' : 'Properties';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID)
      return res.status(500).json({ error: 'Server configuration error' });

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}/${recordId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Airtable error:', err);
      return res.status(response.status).json({ error: `Failed to delete ${isNote ? 'note' : 'property'}` });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      message: `${isNote ? 'Note' : 'Property'} deleted successfully`,
      deleted: data.deleted,
    });

  } catch (error) {
    console.error('Error deleting record:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
