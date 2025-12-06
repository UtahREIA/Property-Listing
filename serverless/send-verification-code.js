// Serverless function to send verification codes via email using Gmail SMTP
// Uses filesystem for temporary storage (works across serverless functions)

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Use /tmp directory for storing codes (persists for a short time in serverless)
const CODES_FILE = '/tmp/verification-codes.json';

function loadCodes() {
  try {
    if (fs.existsSync(CODES_FILE)) {
      const data = fs.readFileSync(CODES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading codes:', error);
  }
  return {};
}

function saveCodes(codes) {
  try {
    // Clean up expired codes before saving
    const now = Date.now();
    const validCodes = {};
    for (const [key, value] of Object.entries(codes)) {
      if (value.expires > now) {
        validCodes[key] = value;
      }
    }
    fs.writeFileSync(CODES_FILE, JSON.stringify(validCodes), 'utf8');
  } catch (error) {
    console.error('Error saving codes:', error);
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
    const { email, propertyId } = req.body;

    if (!email || !propertyId) {
      return res.status(400).json({ error: 'Email and property ID required' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 10-minute expiration
    const key = `${email}-${propertyId}`;
    const codes = loadCodes();
    codes[key] = {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    saveCodes(codes);

    // Send email via Gmail SMTP
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      try {
        // Create transporter with Gmail SMTP
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
          }
        });

        // Email content
        const mailOptions = {
          from: `"Property Listing" <${GMAIL_USER}>`,
          to: email,
          subject: 'Property Management - Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🔐 Email Verification</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                  You requested to manage a property. Please use the verification code below:
                </p>
                <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
                  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">
                    ${code}
                  </div>
                </div>
                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                  This code will expire in 10 minutes.
                </p>
                <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
                  If you didn't request this code, please ignore this email.
                </p>
              </div>
              <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                Property Listing Management System
              </div>
            </div>
          `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`Verification code sent to ${email} via Gmail SMTP. MessageId: ${info.messageId}`);
        
        return res.status(200).json({ 
          success: true,
          message: 'Verification code sent to your email'
        });
      } catch (error) {
        console.error('Error sending email via Gmail:', error);
        // Still return success since code is stored, but log the error
        return res.status(200).json({ 
          success: true,
          message: 'Verification code generated',
          warning: 'Email sending failed, but code is stored',
          code: code // Return code when email fails
        });
      }
    } else {
      // For testing without Gmail credentials
      console.log(`TEST MODE - Verification code for ${email}: ${code}`);
      return res.status(200).json({ 
        success: true,
        message: 'Verification code generated (test mode)',
        code: code // Return code in test mode only
      });
    }

  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ 
      error: 'Failed to send verification code',
      message: error.message 
    });
  }
};
