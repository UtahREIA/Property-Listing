const Airtable = require("airtable");
const SUBSCRIBERS_TABLE = "Subscribers";

function setCors(req, res) {
  const origin = req.headers.origin || "";

  // Allow Utah REIA + GoHighLevel + local testing
  const exactAllowed = new Set([
    "https://utahreia.org",
    "https://www.utahreia.org",
    "https://app.gohighlevel.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  // Allow any secure GHL subdomain (some embeds fire from different subdomains)
  const isGHLSubdomain =
    origin.startsWith("https://") && origin.endsWith(".gohighlevel.com");

  if (exactAllowed.has(origin) || isGHLSubdomain) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Important so caches/CDNs don't mix origins
  res.setHeader("Vary", "Origin");

  // Preflight + actual request headers
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Optional but helps some clients/tools
  res.setHeader("Access-Control-Max-Age", "86400");
}

function escapeAirtableString(value) {
  // Airtable formula strings use single quotes; escape by doubling them
  return String(value).replace(/'/g, "''");
}

module.exports = async (req, res) => {
  // Always set CORS first — even if everything else fails
  setCors(req, res);

  // Preflight must ALWAYS succeed
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse body safely (GHL / Vercel can pass string or object)
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

  // Validate env vars AFTER OPTIONS
  const apiKey = process.env.AIRTABLE_API_KEY_SUB;
  const baseId = process.env.AIRTABLE_BASE_ID_SUB;

  if (!apiKey || !baseId) {
    console.error("Missing Airtable env vars", {
      AIRTABLE_API_KEY_SUB: !!apiKey,
      AIRTABLE_BASE_ID_SUB: !!baseId,
    });
    return res.status(500).json({ message: "Server misconfigured" });
  }

  try {
    const base = new Airtable({ apiKey }).base(baseId);

    const safeEmail = escapeAirtableString(email);
    const existing = await base(SUBSCRIBERS_TABLE)
      .select({ filterByFormula: `{Email} = '${safeEmail}'` })
      .firstPage();

    if (existing?.length) {
      return res.status(200).json({ message: "Already subscribed" });
    }

    await base(SUBSCRIBERS_TABLE).create([{ fields: { Email: email } }]);
    return res.status(200).json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("Airtable error:", err);
    return res.status(500).json({ message: "Failed to subscribe" });
  }
};
