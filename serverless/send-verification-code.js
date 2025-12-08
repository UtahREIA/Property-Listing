// Serverless function to send verification codes via email using Gmail SMTP
// Returns encoded verification token that can be validated
// Updated: 2024-12-06

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Secret for hashing (in production, use environment variable)
const SECRET = process.env.VERIFICATION_SECRET || 'your-secret-key-change-in-production';

function createVerificationToken(email, propertyId, code, expires) {
  // Create a hash that includes all the data
  const data = `${email}|${propertyId}|${code}|${expires}`;
  const hash = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  // Return base64 encoded token
  return Buffer.from(`${data}|${hash}`).toString('base64');
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

  console.log('🔔 Send verification code endpoint called');
  
  try {
    const { email, propertyId } = req.body;
    console.log(`📧 Request for email: ${email}, propertyId: ${propertyId}`);

    if (!email || !propertyId) {
      return res.status(400).json({ error: 'Email and property ID required' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Create verification token
    const token = createVerificationToken(email, propertyId, code, expires);

    // Send email via Gmail SMTP
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    
    console.log(`📮 Gmail credentials available: ${GMAIL_USER ? 'YES' : 'NO'}`);
    
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      console.log('✉️ Attempting to send email via Gmail SMTP...');
      try {
        // Create transporter with Gmail SMTP - more explicit configuration
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // use TLS
          auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
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
        console.log(`✅ Verification code sent to ${email} via Gmail SMTP. MessageId: ${info.messageId}`);
        console.log(`🔐 Code: ${code} (for debugging)`);
        
        return res.status(200).json({ 
          success: true,
          message: 'Verification code sent to your email',
          token: token,
          code: code // ALWAYS return code for debugging
        });
      } catch (error) {
        console.error('❌ Error sending email via Gmail:', error.message);
        console.error('Full error:', error);
        // Still return success since code is generated
        return res.status(200).json({ 
          success: true,
          message: 'Verification code generated',
          warning: 'Email sending failed, but code is stored',
          token: token,
          code: code,
          emailError: error.message
        });
      }
    } else {
      // For testing without Gmail credentials
      console.log(`⚠️ TEST MODE - No Gmail credentials found`);
      console.log(`🔐 Verification code for ${email}: ${code}`);
      return res.status(200).json({ 
        success: true,
        message: 'Verification code generated (test mode - no email credentials)',
        token: token,
        code: code
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
