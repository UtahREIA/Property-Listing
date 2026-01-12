// serverless/subscribe.js
const Airtable = require("airtable");

const SUBSCRIBERS_TABLE = "Subscribers";

function setCors(req, res) {
  const origin = req.headers.origin;

  // Allow only your site (and localhost for testing)
  const allowed = new Set([
    "https://utahreia.org",
    "https://www.utahreia.org",
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
  // Airtable formula strings use single quotes; escape by doubling them
  return String(value).replace(/'/g, "''");
}

module.exports = async (req, res) => {
  setCors(req, res);

  // Preflight must succeed no matter what
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse body (depends on how your function receives it)
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { email } = body || {};

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  // Validate env vars AFTER preflight
  const apiKey = process.env.AIRTABLE_API_KEY_SUB;
  const baseId = process.env.AIRTABLE_BASE_ID_SUB;

  if (!apiKey || !baseId) {
    console.error("Missing Airtable env vars:", {
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
