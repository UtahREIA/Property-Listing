// Serverless function to upload images to Cloudinary
// Allows users to upload from their device seamlessly


// NOTE: Vercel serverless functions have a 4MB body size limit. Large images will fail with 413 error.
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;


module.exports = async (req, res) => {
  // Always set CORS headers
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
    // Check environment variables
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error('Missing Cloudinary credentials');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Cloudinary credentials not configured'
      });
    }

    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Create signature for authenticated upload
    const crypto = require('crypto');
    const timestamp = Math.round(Date.now() / 1000);
    
    // Generate signature
    const stringToSign = `timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    // Upload to Cloudinary using authenticated upload
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    const formData = new URLSearchParams();
    formData.append('file', imageData);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('signature', signature);

    console.log('Uploading to Cloudinary...');
    
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Cloudinary error:', error);
      throw new Error(error.error?.message || 'Failed to upload to Cloudinary');
    }

    const data = await response.json();
    console.log('Upload successful:', data.secure_url);
    
    // Return the secure URL
    return res.status(200).json({ 
      success: true,
      url: data.secure_url
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ 
      error: 'Failed to upload image',
      message: error.message 
    });
  }
};
