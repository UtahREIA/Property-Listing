const AIRTABLE_API_KEY    = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID    = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = "Properties";

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
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ip = getIP(req);
  const rl = rateLimit("_getPropsMap", ip, 60, 60 * 1000); // 60 req/min
  if (rl.limited) return res.status(429).json({ error: "Too many requests" });

  try {
    // IMPORTANT: Contact Email intentionally excluded — use get-property-contact-email
    // endpoint with verification token to access contact info
    const fields = [
      "Title","Price","Location","Property Type","Bedrooms","Bathrooms",
      "Square Feet","Status","Image","Description","Amenities","Year Built",
      "Contact\'s Name","Contact\'s Phone Number"
      // "Contact\'s Email" deliberately omitted from public endpoint
    ];
    const fieldParams = fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join("&");
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?maxRecords=100&${fieldParams}`;

    const response = await fetch(url, { headers: { "Authorization": `Bearer ${AIRTABLE_API_KEY}` } });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch properties");
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[GET PROPERTIES ERROR]", error.message);
    return res.status(500).json({ error: "Failed to fetch properties", message: error.message });
  }
};