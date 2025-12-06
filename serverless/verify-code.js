// Serverless function to verify codes
// Note: This uses in-memory storage - in production use Redis or database

// Import the same Map from send-verification-code (in production, use shared storage)
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
    const { email, propertyId, code } = req.body;

    if (!email || !propertyId || !code) {
      return res.status(400).json({ error: 'Email, property ID, and code required' });
    }

    const key = `${email}-${propertyId}`;
    const stored = verificationCodes.get(key);

    if (!stored) {
      return res.status(400).json({ 
        success: false,
        error: 'No verification code found. Please request a new one.' 
      });
    }

    if (stored.expires < Date.now()) {
      verificationCodes.delete(key);
      return res.status(400).json({ 
        success: false,
        error: 'Verification code expired. Please request a new one.' 
      });
    }

    if (stored.code !== code) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid verification code' 
      });
    }

    // Code is valid - delete it (one-time use)
    verificationCodes.delete(key);

    return res.status(200).json({ 
      success: true,
      message: 'Verification successful'
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({ 
      error: 'Verification failed',
      message: error.message 
    });
  }
};
