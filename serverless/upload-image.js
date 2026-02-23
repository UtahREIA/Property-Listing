const crypto = require("crypto");

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const MAX_IMAGE_SIZE_BYTES  = 3.5 * 1024 * 1024; // 3.5MB base64 limit

// Shared CORS + Rate Limiting helper — paste at top of each file

const ALLOWED_ORIGINS = [
  "https://utahreia.org",
  "https://www.utahreia.org",
  "https://app.gohighlevel.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const isGHL = origin.endsWith(".gohighlevel.com") ||
                origin.endsWith(".leadconnectorhq.com") ||
                origin.endsWith(".msgsndr.com");
  const allowed = ALLOWED_ORIGINS.includes(origin) || isGHL;
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  return allowed;
}

function rateLimit(map, key, max, windowMs) {
  if (!global[map]) global[map] = new Map();
  const now = Date.now();
  const rec = global[map].get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  rec.count++;
  global[map].set(key, rec);
  return { limited: rec.count > max, resetAt: rec.resetAt, count: rec.count };
}

function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
         req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}


module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = getIP(req);

  // Rate limit: 10 uploads per IP per hour
  const rl = rateLimit("_uploadMap", ip, 10, 60 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil((rl.resetAt - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many uploads. Try again in ${mins} minutes.` });
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  const { imageData } = req.body;
  if (!imageData) return res.status(400).json({ error: "No image data provided" });

  // Validate base64 size
  const byteSize = Buffer.byteLength(imageData, "base64");
  if (byteSize > MAX_IMAGE_SIZE_BYTES) {
    return res.status(400).json({ error: "Image too large. Maximum size is 3.5MB." });
  }

  // Validate MIME type — only allow real images
  const mimeMatch = imageData.match(/^data:(image\/(?:jpeg|jpg|png|gif|webp));base64,/);
  if (!mimeMatch) {
    return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = crypto.createHash("sha1")
      .update(`timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
      .digest("hex");

    const formData = new URLSearchParams();
    formData.append("file", imageData);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", CLOUDINARY_API_KEY);
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to upload to Cloudinary");
    }

    const data = await response.json();
    console.log(`[UPLOAD] Success from IP ${ip}: ${data.secure_url}`);
    return res.status(200).json({ success: true, url: data.secure_url });
  } catch (error) {
    console.error("[UPLOAD ERROR]", error.message);
    return res.status(500).json({ error: "Failed to upload image", message: error.message });
  }
};