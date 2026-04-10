const nodemailer = require('nodemailer');

// ── Configuration ──────────────────────────────────────────────────────────
const EXPIRATION_DAYS = 90; // Listings expire after 90 days
const WARNING_DAYS    = 14; // Send warning 14 days before expiration

// ── Email transporter (shared) ─────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   587,
    secure: false,
    auth:   { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    tls:    { rejectUnauthorized: false },
  });
}

// ── Generic expiration check ───────────────────────────────────────────────
async function checkExpiration({ apiKey, baseId, tableName, type, transporter }) {
  const now = new Date();
  const results = { checked: 0, warned: 0, deleted: 0, errors: [] };

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=100`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );
  if (!response.ok) throw new Error(`Airtable API error (${type}): ${response.status}`);

  const { records } = await response.json();
  results.checked = records.length;

  const isNote = type === 'note';

  for (const record of records) {
    try {
      const fields            = record.fields;
      const createdTime       = new Date(record.createdTime);
      const daysSinceCreated  = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
      const daysUntilExpiry   = EXPIRATION_DAYS - daysSinceCreated;
      const warningSent       = fields['Expiration Warning Sent'] === true;
      const contactEmail      = fields["Contact's Email"];

      // ── Build a human-readable detail block ──────────────────────
      const detailLines = isNote
        ? [
            fields.Title           ? `📋 ${fields.Title}`                                              : null,
            fields['Asking Price'] ? `💰 $${Number(fields['Asking Price']).toLocaleString()}`          : null,
            fields.State           ? `📍 ${fields.State}`                                              : null,
          ]
        : [
            fields.Address         ? `📍 ${fields.Address}`                                            : null,
            fields.Price           ? `💰 $${Number(fields.Price).toLocaleString()}`                    : null,
            fields['Property ID']  ? `🆔 ${fields['Property ID']}`                                    : null,
          ];
      const detailHtml = detailLines.filter(Boolean).join('<br>');

      const listedStr  = createdTime.toLocaleDateString();
      const expiryDate = new Date(createdTime.getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
      const label      = isNote ? 'note listing' : 'property listing';
      const Label      = isNote ? 'Note Listing'  : 'Property Listing';

      // ── EXPIRED: delete the record and notify ────────────────────
      if (daysSinceCreated >= EXPIRATION_DAYS) {
        await fetch(
          `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${record.id}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${apiKey}` } }
        );

        if (contactEmail) {
          await transporter.sendMail({
            from:    `"Utah REIA Marketplace" <${process.env.GMAIL_USER}>`,
            to:      contactEmail,
            subject: `🗑️ Your ${Label} Has Expired — Utah REIA`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
                <div style="background:white;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                  <h2 style="color:#dc2626;margin-bottom:20px;">${Label} Expired</h2>
                  <p style="color:#374151;font-size:16px;line-height:1.6;">
                    Your ${label} has expired after <strong>${EXPIRATION_DAYS} days</strong> and has been automatically removed from the marketplace.
                  </p>
                  <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:15px;margin:20px 0;border-radius:6px;">
                    <strong style="color:#991b1b;">Listing Details:</strong><br>
                    ${detailHtml}
                    <br><strong>Listed:</strong> ${listedStr}
                    <br><strong>Deleted:</strong> ${now.toLocaleDateString()}
                  </div>
                  <p style="color:#374151;font-size:16px;line-height:1.6;">
                    If you'd like to relist, please submit it again through our website.
                  </p>
                  <div style="text-align:center;margin-top:30px;">
                    <a href="https://utahreia.org/property-listing-page"
                       style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:600;">
                      ${isNote ? 'List a Note' : 'List a Property'}
                    </a>
                  </div>
                  <p style="color:#6b7280;font-size:13px;margin-top:30px;text-align:center;">
                    Utah REIA Marketplace — This is an automated notification.
                  </p>
                </div>
              </div>`,
          });
        }

        results.deleted++;
        console.log(`✅ Deleted ${type}: ${record.id} (${daysSinceCreated} days old)`);

      // ── WARNING: approaching expiry, haven't warned yet ──────────
      } else if (daysUntilExpiry <= WARNING_DAYS && !warningSent && contactEmail) {
        await transporter.sendMail({
          from:    `"Utah REIA Marketplace" <${process.env.GMAIL_USER}>`,
          to:      contactEmail,
          subject: `⚠️ Your ${Label} Is Expiring Soon — Utah REIA`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
              <div style="background:white;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color:#f59e0b;margin-bottom:20px;">⚠️ ${Label} Expiring Soon</h2>
                <p style="color:#374151;font-size:16px;line-height:1.6;">
                  Your ${label} will expire in <strong style="color:#dc2626;">${daysUntilExpiry} days</strong>
                  and will be automatically removed from the marketplace.
                </p>
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:6px;">
                  <strong style="color:#92400e;">Listing Details:</strong><br>
                  ${detailHtml}
                  <br><strong>Listed:</strong>  ${listedStr}
                  <br><strong>Expires:</strong> ${expiryDate.toLocaleDateString()}
                </div>
                <p style="color:#374151;font-size:16px;line-height:1.6;">
                  If your ${label} is still available, you'll need to relist it after expiration.
                  If it has been sold or is no longer available, no action is needed.
                </p>
                <div style="text-align:center;margin-top:30px;">
                  <a href="https://utahreia.org/property-listing-page"
                     style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:600;">
                    View Marketplace
                  </a>
                </div>
                <p style="color:#6b7280;font-size:13px;margin-top:30px;text-align:center;">
                  Utah REIA Marketplace — This is an automated notification.
                </p>
              </div>
            </div>`,
        });

        // Mark warning as sent in Airtable
        await fetch(
          `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${record.id}`,
          {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { 'Expiration Warning Sent': true } }),
          }
        );

        results.warned++;
        console.log(`📧 Warning sent for ${type}: ${record.id} (expires in ${daysUntilExpiry} days)`);
      }
    } catch (err) {
      console.error(`Error processing ${type} ${record.id}:`, err);
      results.errors.push({ id: record.id, error: err.message });
    }
  }

  return results;
}

// ── Handler ────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'your-secure-cron-secret';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const AIRTABLE_API_KEY      = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID      = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_NOTE_API_KEY = process.env.AIRTABLE_NOTE_API_KEY;
    const AIRTABLE_NOTE_BASE_ID = process.env.AIRTABLE_NOTE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID)
      throw new Error('Missing property Airtable credentials');
    if (!AIRTABLE_NOTE_API_KEY || !AIRTABLE_NOTE_BASE_ID)
      throw new Error('Missing notes Airtable credentials');

    const transporter = createTransporter();

    // Run both checks concurrently
    const [propertyResults, noteResults] = await Promise.all([
      checkExpiration({
        apiKey:    AIRTABLE_API_KEY,
        baseId:    AIRTABLE_BASE_ID,
        tableName: process.env.AIRTABLE_TABLE_NAME || 'Properties',
        type:      'property',
        transporter,
      }),
      checkExpiration({
        apiKey:    AIRTABLE_NOTE_API_KEY,
        baseId:    AIRTABLE_NOTE_BASE_ID,
        tableName: 'Notes',
        type:      'note',
        transporter,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Expiration check completed for properties and notes',
      properties: propertyResults,
      notes:      noteResults,
    });

  } catch (error) {
    console.error('Error in expiration check:', error);
    return res.status(500).json({ error: 'Failed to run expiration check', details: error.message });
  }
};
