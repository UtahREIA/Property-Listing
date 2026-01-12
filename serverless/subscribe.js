const Airtable = require("airtable");
const SUBSCRIBERS_TABLE = "Subscribers";

function setCors(req, res) {
  const origin = req.headers.origin;

  const allowed = new Set([
    "https://utahreia.org",
    "https://www.utahreia.org",
    "https://app.gohighlevel.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  if (allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function escapeAirtableString(value) {
  return String(value).replace(/'/g, "''");
}

module.exports = async (req, res) => {
  setCors(req, res);

  // Preflight must ALWAYS succeed
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse body safely
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

  const apiKey = process.env.AIRTABLE_API_KEY_SUB;
  const baseId = process.env.AIRTABLE_BASE_ID_SUB;

  if (!apiKey || !baseId) {
    console.error("Missing Airtable env vars");
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
