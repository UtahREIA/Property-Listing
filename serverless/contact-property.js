// Serverless function to send contact email to property owner
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      senderName, senderEmail, senderPhone,
      message, propertyId, propertyTitle, propertyLocation,
      recipientEmail, recipientName
    } = req.body;

    // Log all incoming values so we can debug in Vercel logs
    console.log('📬 contact-property called');
    console.log('  recipientEmail:', recipientEmail);
    console.log('  senderEmail:', senderEmail);
    console.log('  senderName:', senderName);
    console.log('  propertyTitle:', propertyTitle);

    if (!senderName || !senderEmail || !message || !recipientEmail) {
      console.error('❌ Missing required fields:', { senderName: !!senderName, senderEmail: !!senderEmail, message: !!message, recipientEmail: !!recipientEmail });
      return res.status(400).json({
        error: `Missing required fields. Got: senderName=${!!senderName}, senderEmail=${!!senderEmail}, message=${!!message}, recipientEmail=${!!recipientEmail}`
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) return res.status(400).json({ error: 'Invalid sender email format' });
    if (!emailRegex.test(recipientEmail)) return res.status(400).json({ error: `Invalid recipient email format: "${recipientEmail}"` });

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

    console.log('  GMAIL_USER configured:', !!GMAIL_USER);

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD)
      return res.status(500).json({ error: 'Email service not configured on server' });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      tls: { rejectUnauthorized: false }
    });

    // ── Email 1: To the PROPERTY CONTACT ────────────────────────────────────
    const toContactHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">📬 New Property Inquiry</h1>
        </div>
        <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;">
          <p style="font-size:16px;color:#374151;margin-bottom:20px;">
            Hi <strong>${recipientName || 'there'}</strong>, someone is interested in your property listing on Utah REIA!
          </p>

          <div style="background:white;border-left:4px solid #667eea;padding:20px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <h3 style="color:#1f2937;margin:0 0 8px 0;">🏠 Property</h3>
            <p style="margin:0;color:#4b5563;font-size:16px;"><strong>${propertyTitle || 'Your Property'}</strong></p>
            ${propertyLocation ? `<p style="margin:6px 0 0 0;color:#6b7280;">📍 ${propertyLocation}</p>` : ''}
          </div>

          <div style="background:white;border-left:4px solid #10b981;padding:20px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <h3 style="color:#1f2937;margin:0 0 12px 0;">👤 Interested Party</h3>
            <p style="margin:0 0 8px 0;color:#374151;font-size:15px;">👤 <strong>${senderName}</strong></p>
            <p style="margin:0 0 8px 0;color:#374151;font-size:15px;">✉️ <a href="mailto:${senderEmail}" style="color:#2563eb;">${senderEmail}</a></p>
            ${senderPhone ? `<p style="margin:0;color:#374151;font-size:15px;">📞 <a href="tel:${senderPhone}" style="color:#2563eb;">${senderPhone}</a></p>` : ''}
          </div>

          <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:25px;">
            <h3 style="color:#1f2937;margin:0 0 12px 0;">💬 Their Message</h3>
            <p style="color:#4b5563;line-height:1.8;margin:0;font-size:15px;white-space:pre-wrap;">${message}</p>
          </div>

          <div style="text-align:center;">
            <a href="mailto:${senderEmail}?subject=Re: Your inquiry about ${encodeURIComponent(propertyTitle || 'my property')}"
               style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
              Reply to ${senderName}
            </a>
          </div>

          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:30px;">
            This inquiry was submitted via Utah REIA Property Listings.<br>
            You are receiving this because you listed a property on our platform.
          </p>
        </div>
      </div>`;

    // ── Email 2: Confirmation to the SENDER ─────────────────────────────────
    const toSenderHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">✅ Message Sent!</h1>
        </div>
        <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;">
          <p style="font-size:16px;color:#374151;">
            Hi <strong>${senderName}</strong>, your message has been delivered to the property contact.
          </p>

          <div style="background:white;border-left:4px solid #667eea;padding:20px;border-radius:0 8px 8px 0;margin:20px 0;">
            <h3 style="color:#1f2937;margin:0 0 8px 0;">🏠 Property You Inquired About</h3>
            <p style="margin:0;color:#4b5563;font-size:16px;"><strong>${propertyTitle || 'Property'}</strong></p>
            ${propertyLocation ? `<p style="margin:6px 0 0 0;color:#6b7280;">📍 ${propertyLocation}</p>` : ''}
          </div>

          <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:20px;">
            <h3 style="color:#1f2937;margin:0 0 12px 0;">💬 Your Message</h3>
            <p style="color:#4b5563;line-height:1.8;margin:0;font-size:15px;white-space:pre-wrap;">${message}</p>
          </div>

          <p style="color:#374151;font-size:15px;">
            Expect a reply at <strong>${senderEmail}</strong>
            ${senderPhone ? ` or <strong>${senderPhone}</strong>` : ''} soon.
          </p>

          <div style="text-align:center;margin-top:25px;">
            <a href="https://utahreia.org/property-listing-page"
               style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
              Browse More Properties
            </a>
          </div>

          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:30px;">Utah REIA Property Listings</p>
        </div>
      </div>`;

    // Send sequentially so we know exactly which one fails if either does
    let contactSent = false;
    let senderSent = false;

    try {
      const info1 = await transporter.sendMail({
        from: `"Utah REIA Listings" <${GMAIL_USER}>`,
        to: recipientEmail,
        replyTo: senderEmail,
        subject: `📬 New Inquiry on Your Listing: ${propertyTitle || 'Your Property'} — from ${senderName}`,
        html: toContactHtml
      });
      contactSent = true;
      console.log(`✅ Email sent to CONTACT (${recipientEmail}). MessageId: ${info1.messageId}`);
    } catch (err) {
      console.error(`❌ FAILED to send email to CONTACT (${recipientEmail}):`, err.message);
    }

    try {
      const info2 = await transporter.sendMail({
        from: `"Utah REIA Listings" <${GMAIL_USER}>`,
        to: senderEmail,
        subject: `✅ Your inquiry about "${propertyTitle || 'Property'}" was sent`,
        html: toSenderHtml
      });
      senderSent = true;
      console.log(`✅ Confirmation email sent to SENDER (${senderEmail}). MessageId: ${info2.messageId}`);
    } catch (err) {
      console.error(`❌ FAILED to send confirmation to SENDER (${senderEmail}):`, err.message);
    }

    if (!contactSent && !senderSent) {
      return res.status(500).json({ error: 'Failed to send both emails. Check server logs.' });
    }

    // Mark as Contacted in Airtable (non-fatal)
    if (propertyId) {
      try {
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
          await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Properties/${propertyId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: { 'Contacted': true } })
          });
          console.log(`✅ Property ${propertyId} marked as Contacted in Airtable`);
        }
      } catch (e) {
        console.error('⚠️ Airtable Contacted update failed (non-fatal):', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully!',
      contactEmailSent: contactSent,
      confirmationEmailSent: senderSent
    });

  } catch (error) {
    console.error('❌ Unhandled error in contact-property:', error);
    return res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
};
