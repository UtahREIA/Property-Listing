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

    // Send email via GoHighLevel Workflow Webhook
    const GHL_WEBHOOK_URL = process.env.GHL_VERIFICATION_WEBHOOK_URL;
    
    if (GHL_WEBHOOK_URL) {
      try {
        await fetch(GHL_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            verificationCode: code,
            propertyId: propertyId
          })
        });
        console.log(`Verification code sent to ${email} via GHL workflow`);
      } catch (error) {
        console.error('Error calling GHL webhook:', error);
        // Continue anyway - code is still valid
      }
    } else {
      // For testing without GHL webhook
      console.log(`TEST MODE - Verification code for ${email}: ${code}`);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Verification code sent',
      // Return code for testing only when no GHL webhook configured
      ...(GHL_WEBHOOK_URL ? {} : { code: code })
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ 
      error: 'Failed to send verification code',
      message: error.message 
    });
  }
};
