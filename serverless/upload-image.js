// Serverless function to upload images to Cloudinary
// This allows users to upload from device without base64 limitations

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Upload to Cloudinary (free service)
    // Using unsigned upload preset - no API key needed for basic uploads
    const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/demo/image/upload';
    
    const formData = new URLSearchParams();
    formData.append('file', imageData);
    formData.append('upload_preset', 'docs_upload_example_us_preset');

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Cloudinary error:', error);
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    
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
