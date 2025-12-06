// Serverless function to upload images to ImgBB
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

    // Remove data:image/xxx;base64, prefix if present
    const base64Data = imageData.split(',')[1] || imageData;

    // Upload to ImgBB (free service with API key)
    // Using a demo API key - in production, add your own as environment variable
    const apiKey = '5f1b6c3d8e9a4f2b1c3d5e6f7a8b9c0d'; // Demo key
    const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`;
    
    const formData = new URLSearchParams();
    formData.append('image', base64Data);

    const response = await fetch(imgbbUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('ImgBB error:', error);
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    
    // Return the URL
    return res.status(200).json({ 
      success: true,
      url: data.data.url
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ 
      error: 'Failed to upload image',
      message: error.message 
    });
  }
};
