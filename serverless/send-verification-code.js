// Serverless function to send verification codes via email
// Uses a simple in-memory store (for production, use Redis or database)

const verificationCodes = new Map();

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, propertyId } = req.body;

    if (!email || !propertyId) {
      return res.status(400).json({ error: 'Email and property ID required' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 10-minute expiration
    const key = `${email}-${propertyId}`;
    verificationCodes.set(key, {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Clean up expired codes
    for (const [k, v] of verificationCodes.entries()) {
      if (v.expires < Date.now()) {
        verificationCodes.delete(k);
      }
    }

    // In production, send actual email here using SendGrid, AWS SES, etc.
    // For now, we'll return the code in the response (REMOVE IN PRODUCTION!)
    console.log(`Verification code for ${email}: ${code}`);

    // TODO: Implement actual email sending
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: email,
    //   from: 'noreply@yourdomain.com',
    //   subject: 'Property Management Verification Code',
    //   text: `Your verification code is: ${code}`,
    //   html: `<p>Your verification code is: <strong>${code}</strong></p>`
    // });

    return res.status(200).json({ 
      success: true,
      message: 'Verification code sent',
      // REMOVE THIS IN PRODUCTION - only for testing:
      code: code
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ 
      error: 'Failed to send verification code',
      message: error.message 
    });
  }
};
