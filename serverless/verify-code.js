// Serverless function to verify codes using token-based verification

const crypto = require('crypto');

// Secret for hashing (must match send-verification-code)
const SECRET = process.env.VERIFICATION_SECRET || 'your-secret-key-change-in-production';

function verifyToken(token, email, propertyId, code) {
  try {
    // Decode the token
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('|');
    
    if (parts.length !== 5) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    const [tokenEmail, tokenPropertyId, tokenCode, tokenExpires, tokenHash] = parts;
    
    // Verify the hash
    const data = `${tokenEmail}|${tokenPropertyId}|${tokenCode}|${tokenExpires}`;
    const expectedHash = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    
    if (tokenHash !== expectedHash) {
      return { valid: false, error: 'Invalid token signature' };
    }
    
    // Check expiration
    if (Date.now() > parseInt(tokenExpires)) {
      return { valid: false, error: 'Verification code expired' };
    }
    
    // Verify the data matches
    if (tokenEmail !== email || tokenPropertyId !== propertyId || tokenCode !== code) {
      return { valid: false, error: 'Invalid verification code' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false, error: 'Token verification failed' };
  }
}

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
    const { email, propertyId, code, token } = req.body;

    if (!email || !propertyId || !code || !token) {
      return res.status(400).json({ 
        success: false,
        error: 'Email, property ID, code, and token required' 
      });
    }

    // Verify the token
    const result = verifyToken(token, email, propertyId, code);
    
    if (!result.valid) {
      return res.status(400).json({ 
        success: false,
        error: result.error 
      });
    }

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
