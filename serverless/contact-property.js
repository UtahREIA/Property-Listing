// Serverless function to send contact email to property owner
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { senderName, senderEmail, senderPhone, message, propertyId, propertyTitle, propertyLocation, recipientEmail, recipientName } = req.body;

    if (!senderName || !senderEmail || !message || !recipientEmail) {
      return res.status(400).json({ error: 'Missing required fields: senderName, senderEmail, message, recipientEmail' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) return res.status(400).json({ error: 'Invalid sender email format' });
    if (!emailRegex.test(recipientEmail)) return res.status(400).json({ error: 'Invalid recipient email format' });

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return res.status(500).json({ error: 'Email service not configured' });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      tls: { rejectUnauthorized: false }
    });

    const toContactHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">📬 New Property Inquiry</h1>
        </div>
        <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;">
          <p style="font-size:16px;color:#374151;margin-bottom:20px;">Hi <strong>${recipientName || 'there'}</strong>, someone is interested in your property listing!</p>
          <div style="background:white;border-left:4px solid #667eea;padding:20px;border-radius:0 8px 8px 0;margin-bottom:25px;">
            <h3 style="color:#1f2937;margin:0 0 10px 0;">🏠 Property</h3>
            <p style="margin:0;color:#4b5563;"><strong>${propertyTitle || 'Your Property'}</strong></p>
            ${propertyLocation ? `<p style="margin:5px 0 0 0;color:#6b7280;">📍 ${propertyLocation}</p>` : ''}
          </div>
          <div style="background:white;border-left:4px solid #10b981;padding:20px;border-radius:0 8px 8px 0;margin-bottom:25px;">
            <h3 style="color:#1f2937;margin:0 0 15px 0;">👤 Interested Buyer</h3>
            <p style="margin:0 0 8px 0;color:#374151;">👤 <strong>${senderName}</strong></p>
            <p style="margin:0 0 8px 0;color:#374151;">✉️ <a href="mailto:${senderEmail}" style="color:#2563eb;">${senderEmail}</a></p>
            ${senderPhone ? `<p style="margin:0;color:#374151;">📞 <a href="tel:${senderPhone}" style="color:#2563eb;">${senderPhone}</a></p>` : ''}
          </div>
          <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:25px;">
            <h3 style="color:#1f2937;margin:0 0 12px 0;">💬 Their Message</h3>
            <p style="color:#4b5563;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
          </div>
          <div style="text-align:center;">
            <a href="mailto:${senderEmail}?subject=Re: Your inquiry about ${encodeURIComponent(propertyTitle || 'my property')}"
               style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
              Reply to ${senderName}
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:30px;">Sent via Utah REIA Property Listings</p>
        </div>
      </div>`;

    const toSenderHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">✅ Message Sent!</h1>
        </div>
        <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;">
          <p style="font-size:16px;color:#374151;">Hi <strong>${senderName}</strong>, your message has been sent to the property contact.</p>
          <div style="background:white;border-left:4px solid #667eea;padding:20px;border-radius:0 8px 8px 0;margin:20px 0;">
            <h3 style="color:#1f2937;margin:0 0 10px 0;">🏠 Property You Inquired About</h3>
            <p style="margin:0;color:#4b5563;"><strong>${propertyTitle || 'Property'}</strong></p>
            ${propertyLocation ? `<p style="margin:5px 0 0 0;color:#6b7280;">📍 ${propertyLocation}</p>` : ''}
          </div>
          <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:25px;">
            <h3 style="color:#1f2937;margin:0 0 12px 0;">💬 Your Message</h3>
            <p style="color:#4b5563;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="color:#374151;font-size:15px;">The property contact should get back to you at <strong>${senderEmail}</strong> soon.</p>
          <div style="text-align:center;margin-top:25px;">
            <a href="https://utahreia.org/property-listing-page" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Browse More Properties</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:30px;">Utah REIA Property Listings</p>
        </div>
      </div>`;

    await Promise.all([
      transporter.sendMail({
        from: `"Utah REIA Listings" <${GMAIL_USER}>`,
        to: recipientEmail,
        replyTo: senderEmail,
        subject: `New Inquiry: ${propertyTitle || 'Your Property Listing'} - from ${senderName}`,
        html: toContactHtml
      }),
      transporter.sendMail({
        from: `"Utah REIA Listings" <${GMAIL_USER}>`,
        to: senderEmail,
        subject: `✅ Your inquiry about "${propertyTitle || 'Property'}" was sent`,
        html: toSenderHtml
      })
    ]);

    // Mark as Contacted in Airtable (non-fatal)
    if (propertyId) {
      try {
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
          await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Properties/${propertyId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { 'Contacted': true } })
          });
        }
      } catch (e) { console.error('Airtable update failed:', e); }
    }

    return res.status(200).json({ success: true, message: 'Your message has been sent successfully!' });

  } catch (error) {
    console.error('Error sending contact email:', error);
    return res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
};
