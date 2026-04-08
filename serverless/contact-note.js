// Serverless function to send a contact email about a note listing
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL       = process.env.FROM_EMAIL || 'noreply@utahreia.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      noteId, noteTitle, recipientEmail,
      senderName, senderEmail, senderPhone, message,
    } = req.body;

    if (!senderName)      return res.status(400).json({ error: 'Your name is required' });
    if (!senderEmail)     return res.status(400).json({ error: 'Your email is required' });
    if (!message)         return res.status(400).json({ error: 'Message is required' });
    if (!recipientEmail)  return res.status(400).json({ error: 'Recipient email not found' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail))    return res.status(400).json({ error: 'Invalid sender email' });
    if (!emailRegex.test(recipientEmail)) return res.status(400).json({ error: 'Invalid recipient email' });

    const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#1e40af 0%,#7c3aed 100%);padding:28px 32px;border-radius:10px 10px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:22px;">📋 New Note Inquiry</h2>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Someone is interested in your note listing</p>
  </div>
  <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:130px;">Note Listing:</td>
          <td style="padding:8px 0;font-weight:600;font-size:14px;">${noteTitle || 'N/A'}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Note ID:</td>
          <td style="padding:8px 0;font-family:monospace;font-size:13px;color:#6b7280;">${noteId || 'N/A'}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
    <h3 style="font-size:16px;color:#1f2937;margin:0 0 16px;">Inquiry From</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:130px;">Name:</td>
          <td style="padding:8px 0;font-weight:600;font-size:14px;">${senderName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email:</td>
          <td style="padding:8px 0;font-size:14px;"><a href="mailto:${senderEmail}" style="color:#2563eb;">${senderEmail}</a></td></tr>
      ${senderPhone ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Phone:</td>
          <td style="padding:8px 0;font-size:14px;"><a href="tel:${senderPhone}" style="color:#2563eb;">${senderPhone}</a></td></tr>` : ''}
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
    <h3 style="font-size:16px;color:#1f2937;margin:0 0 12px;">Message</h3>
    <div style="background:#f9fafb;padding:16px;border-radius:8px;font-size:15px;line-height:1.7;color:#374151;white-space:pre-wrap;">${message}</div>
    <div style="margin-top:28px;padding:16px;background:#eff6ff;border-radius:8px;font-size:13px;color:#1e40af;">
      Reply directly to <strong>${senderEmail}</strong> to respond to this inquiry.
    </div>
  </div>
</div>`;

    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipientEmail }] }],
        from:    { email: FROM_EMAIL, name: 'Utah REIA Notes Marketplace' },
        reply_to: { email: senderEmail, name: senderName },
        subject: `Note Inquiry: ${noteTitle || 'Your Note Listing'}`,
        content: [{ type: 'text/html', value: emailBody }],
      }),
    });

    if (!sgResponse.ok) {
      const err = await sgResponse.text();
      throw new Error(`SendGrid error: ${err}`);
    }

    return res.status(200).json({ success: true, message: 'Inquiry sent successfully' });

  } catch (error) {
    console.error('Error sending note contact email:', error);
    return res.status(500).json({ error: 'Failed to send inquiry', message: error.message });
  }
};