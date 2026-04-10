// Serverless function to add a new note listing to Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_NOTE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_NOTE_BASE_ID;
const AIRTABLE_TABLE   = 'Notes';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      title, askingPrice, originalBalance, currentBalance,
      interestRate, monthlyPayment, notePosition, performanceStatus,
      noteType, term, balloon, substitutionOfCollateral, itb, itv,
      propertyType, propertyAddress, state, ltv,
      maturityDate, originationDate, status, description,
      contactName, contactEmail, contactPhone,
      imageUrls,
    } = req.body;

    // Required field validation
    if (!title)           return res.status(400).json({ error: 'Title is required' });
    if (!askingPrice)     return res.status(400).json({ error: 'Asking price is required' });
    if (!contactEmail)    return res.status(400).json({ error: 'Contact email is required' });
    if (!performanceStatus) return res.status(400).json({ error: 'Performance status is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return res.status(400).json({ error: 'Invalid contact email address' });
    }

    const fields = {
      'Title':              title,
      'Asking Price':       parseFloat(askingPrice) || 0,
      'Performance Status': performanceStatus,
      'Status':             status || 'Available',
      "Contact's Name":     contactName  || '',
      "Contact's Email":    contactEmail,
      "Contact's Phone Number": contactPhone || '',
      'Date Listed':        new Date().toISOString().split('T')[0],
    };

    // Optional numeric fields
    if (originalBalance)  fields['Original Balance']  = parseFloat(originalBalance);
    if (currentBalance)   fields['Current Balance']   = parseFloat(currentBalance);
    if (interestRate)     fields['Interest Rate']      = parseFloat(interestRate);
    if (monthlyPayment)   fields['Monthly Payment']   = parseFloat(monthlyPayment);
    if (ltv)              fields['LTV']                = parseFloat(ltv);

    // Optional numeric fields — new
    if (term)    fields['Term']    = parseInt(term);
    if (balloon) fields['Balloon'] = parseInt(balloon);
    if (itb)     fields['ITB']     = parseFloat(itb);
    if (itv)     fields['ITV']     = parseFloat(itv);

    // Optional text / select fields
    if (notePosition)     fields['Note Position']     = notePosition;
    if (noteType)         fields['Note Type']          = noteType;
    if (propertyType)     fields['Property Type']     = propertyType;
    if (propertyAddress)  fields['Property Address']  = propertyAddress;
    if (state)            fields['State']              = state.toUpperCase();
    if (description)      fields['Description']       = description;
    if (maturityDate)     fields['Maturity Date']     = maturityDate;
    if (originationDate)  fields['Origination Date']  = originationDate;

    // Checkbox field — Airtable expects a boolean
    if (substitutionOfCollateral !== undefined) {
      fields['Substitution of Collateral'] = substitutionOfCollateral === true || substitutionOfCollateral === 'true' || substitutionOfCollateral === 'Yes';
    }

    // Airtable attachment fields require an array of { url } objects
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      fields['Images'] = imageUrls.map(u => ({ url: u }));
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create note listing');
    }

    const data = await response.json();

    // Notify subscribers in the background — don't let a failure block the response
    try {
      const notifyUrl = `${process.env.VERCEL_URL
        ? 'https://' + process.env.VERCEL_URL
        : 'https://property-listing-32ax.vercel.app'}/api/notify-note`;
      fetch(notifyUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note: fields }),
      }).catch(e => console.warn('Note notify failed (non-blocking):', e.message));
    } catch (e) {
      console.warn('Could not trigger note notification:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Note listed successfully',
      id: data.id,
    });

  } catch (error) {
    console.error('Error adding note:', error);
    return res.status(500).json({ error: 'Failed to add note', message: error.message });
  }
};