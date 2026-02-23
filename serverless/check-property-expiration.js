const nodemailer = require('nodemailer');

// Configuration
const EXPIRATION_DAYS = 90; // Properties expire after 90 days
const WARNING_DAYS = 14; // Send warning 14 days (2 weeks) before expiration

module.exports = async (req, res) => {
  // Verify this is called by a cron job or authorized source
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'your-secure-cron-secret';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Properties';

    if (!AIRTABLE_API_KEY || !BASE_ID) {
      throw new Error('Missing Airtable credentials');
    }

    // Fetch all properties from Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    const properties = data.records;

    const now = new Date();
    const results = {
      checked: properties.length,
      warned: 0,
      deleted: 0,
      errors: []
    };

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    for (const property of properties) {
      try {
        const fields = property.fields;
        const createdTime = new Date(property.createdTime);
        const daysSinceCreated = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
        
        const daysUntilExpiration = EXPIRATION_DAYS - daysSinceCreated;
        const warningAlreadySent = fields['Expiration Warning Sent'] === true;
        const contactEmail = fields["Contact's Email"];

        // Check if property should be deleted
        if (daysSinceCreated >= EXPIRATION_DAYS) {
          // Delete the property
          await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${property.id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
              }
            }
          );

          // Send deletion notification
          if (contactEmail) {
            await transporter.sendMail({
              from: process.env.GMAIL_USER,
              to: contactEmail,
              subject: '🏠 Property Listing Expired - Utah REIA',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h2 style="color: #dc2626; margin-bottom: 20px;">Property Listing Expired</h2>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      Your property listing has expired after ${EXPIRATION_DAYS} days and has been automatically removed from our system.
                    </p>

                    <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 6px;">
                      <strong style="color: #991b1b;">Property Details:</strong><br>
                      ${fields.Address ? `📍 ${fields.Address}<br>` : ''}
                      ${fields.Price ? `💰 $${Number(fields.Price).toLocaleString()}<br>` : ''}
                      ${fields['Property ID'] ? `🆔 ${fields['Property ID']}<br>` : ''}
                      <strong>Listed:</strong> ${createdTime.toLocaleDateString()}<br>
                      <strong>Deleted:</strong> ${now.toLocaleDateString()}
                    </div>

                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      If you'd like to relist this property, please submit it again through our website.
                    </p>

                    <div style="text-align: center; margin-top: 30px;">
                      <a href="https://property-listing-32ax.vercel.app" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        List New Property
                      </a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                      Utah REIA Property Listings<br>
                      This is an automated notification.
                    </p>
                  </div>
                </div>
              `
            });
          }

          results.deleted++;
          console.log(`Deleted property: ${fields['Property ID']} (${daysSinceCreated} days old)`);
        }
        // Check if property should receive warning
        else if (daysUntilExpiration <= WARNING_DAYS && !warningAlreadySent && contactEmail) {
          // Send warning email
          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: contactEmail,
            subject: '⚠️ Property Listing Expiring Soon - Utah REIA',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <h2 style="color: #f59e0b; margin-bottom: 20px;">⚠️ Property Listing Expiring Soon</h2>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Your property listing will expire in <strong style="color: #dc2626;">${daysUntilExpiration} days</strong> and will be automatically removed from our system.
                  </p>

                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 6px;">
                    <strong style="color: #92400e;">Property Details:</strong><br>
                    ${fields.Address ? `📍 ${fields.Address}<br>` : ''}
                    ${fields.Price ? `💰 $${Number(fields.Price).toLocaleString()}<br>` : ''}
                    ${fields['Property ID'] ? `🆔 ${fields['Property ID']}<br>` : ''}
                    <strong>Listed:</strong> ${createdTime.toLocaleDateString()}<br>
                    <strong>Expires:</strong> ${new Date(createdTime.getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </div>

                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    If your property is still available, you'll need to relist it after expiration. If it has been sold or is no longer available, no action is needed.
                  </p>

                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://property-listing-32ax.vercel.app" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                      View Property Listings
                    </a>
                  </div>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                    Utah REIA Property Listings<br>
                    This is an automated notification.
                  </p>
                </div>
              </div>
            `
          });

          // Mark warning as sent in Airtable
          await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${property.id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  'Expiration Warning Sent': true
                }
              })
            }
          );

          results.warned++;
          console.log(`Sent warning for property: ${fields['Property ID']} (expires in ${daysUntilExpiration} days)`);
        }
      } catch (error) {
        console.error(`Error processing property ${property.id}:`, error);
        results.errors.push({
          propertyId: property.id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Property expiration check completed',
      results
    });

  } catch (error) {
    console.error('Error in expiration check:', error);
    res.status(500).json({
      error: 'Failed to check property expiration',
      details: error.message
    });
  }
};
