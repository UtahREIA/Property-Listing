const Airtable = require("airtable");
const SUBSCRIBERS_TABLE = "Subscribers";

function setCors(req, res) {
  // 1. Log the Origin so you can see it in Vercel Logs
  const origin = req.headers.origin || "";
  console.log(`[CORS] Incoming Origin: ${origin}`);

  // 2. Define Allowed Origins
  const exactAllowed = new Set([
    "https://utahreia.org",
    "https://www.utahreia.org",
    "https://app.gohighlevel.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  // 3. Check for GHL patterns (including new domains)
  const isGHL =
    origin.endsWith(".gohighlevel.com") ||
    origin.endsWith(".leadconnectorhq.com") || // New GHL Domain
    origin.endsWith(".msgsndr.com");          // New GHL Domain

  // 4. Set Headers if matched
  if (exactAllowed.has(origin) || isGHL) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    // Needed if GHL sends cookies/auth headers
    res.setHeader("Access-Control-Allow-Credentials", "true"); 
  } else {
    // Optional: Log failure to help debug
    console.warn(`[CORS] Blocked Origin: ${origin}`);
  }

  res.setHeader("Vary", "Origin");
  // Allow more headers (GHL often sends Authorization or X-Requested-With)
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function escapeAirtableString(value) {
  return String(value).replace(/'/g, "''");
}

module.exports = async (req, res) => {
  try {
    // Always set CORS first
    setCors(req, res);

    // Handle Preflight
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    // Body parsing
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ message: "Invalid JSON body" });
    }

    const { email } = body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Airtable Logic
    const apiKey = process.env.AIRTABLE_API_KEY_SUB;
    const baseId = process.env.AIRTABLE_BASE_ID_SUB;

    if (!apiKey || !baseId) {
      console.error("Missing Airtable env vars");
      return res.status(500).json({ message: "Server misconfigured" });
    }

    const base = new Airtable({ apiKey }).base(baseId);
    const safeEmail = escapeAirtableString(email);
    
    // Check existing
    const existing = await base(SUBSCRIBERS_TABLE)
      .select({ filterByFormula: `{Email} = '${safeEmail}'` })
      .firstPage();

    if (existing?.length) {
      return res.status(200).json({ message: "Already subscribed" });
    }

    // Create new
    try {
      await base(SUBSCRIBERS_TABLE).create([
        { fields: {
            Email: email,
            Subscribed: true,
            "Date Subscribed": new Date().toISOString(),
            "Subscription Status": "Active"
          }
        }
      ]);
      return res.status(200).json({ message: "Subscribed successfully" });
    } catch (airtableErr) {
      console.error("Airtable Create Error:", airtableErr);
      return res.status(500).json({ message: "Airtable error", error: airtableErr.message || airtableErr });
    }

  } catch (err) {
    // Catch-all error handler ensures we return a JSON response even if code crashes
    console.error("Critical Error:", err);
    // We intentionally return 500, but CORS headers (set at top) will still be present
    return res.status(500).json({ message: "Internal Server Error" });
  }
};