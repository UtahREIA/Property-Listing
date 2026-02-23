const Airtable = require("airtable");
const nodemailer = require("nodemailer");

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PROPERTIES_TABLE = "Properties";
const SUBSCRIBERS_TABLE = "Subscribers";
const CRON_SECRET = process.env.CRON_SECRET;

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

module.exports = async (req, res) => {
  // Must be called by cron job with Authorization header
  if (!CRON_SECRET) {
    console.error("[DIGEST] CRON_SECRET env var not set — refusing to run");
    return res.status(500).json({ message: "Server misconfigured" });
  }
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn("[DIGEST] Unauthorized call — bad cron secret");
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Validate date before inserting into formula
    if (isNaN(yesterday.getTime())) throw new Error("Invalid date");
    const isoYesterday = yesterday.toISOString();

    const propertyRecords = await base(PROPERTIES_TABLE)
      .select({ filterByFormula: `CREATED_TIME() >= '${isoYesterday}'` })
      .all();

    if (propertyRecords.length === 0) {
      return res.status(200).json({ message: "No new properties in the last 24 hours." });
    }

    const subscriberRecords = await base(SUBSCRIBERS_TABLE)
      .select({ filterByFormula: "Subscribed = TRUE()" })
      .all();
    const emails = subscriberRecords.map(r => r.fields.Email).filter(Boolean);
    if (emails.length === 0) return res.status(200).json({ message: "No subscribers to notify." });

    const transporter = nodemailer.createTransport({
      host: process.env.GMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.GMAIL_PORT || "587", 10),
      secure: process.env.GMAIL_SECURE === "true",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });

    const propertyList = propertyRecords.map(r => {
      const f = r.fields;
      let imageHtml = "";
      if (f.Image?.[0]) {
        const imgUrl = f.Image[0].thumbnails?.large?.url || f.Image[0].url;
        imageHtml = `<img src="${imgUrl}" alt="Property" style="max-width:320px;border-radius:8px;margin:8px 0;">`;
      }
      return `<li style="margin-bottom:24px;"><strong>${f.Title || "Untitled"}</strong> — ${f.Location || ""} — $${f.Price || ""}<br>${imageHtml}${f.Description || ""}</li>`;
    }).join("");

    const html = `<h2>New Properties Listed in the Last 24 Hours</h2><ul style="padding:0;list-style:none;">${propertyList}</ul><p><a href="https://utahreia.org/property-listing-page">View All Listings</a></p>`;

    // BCC all at once for digest (acceptable — not per-user)
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      bcc: emails,
      subject: "Utah REIA: New Properties Listed (Daily Digest)",
      html
    });

    console.log(`[DIGEST] Sent to ${emails.length} subscribers, ${propertyRecords.length} properties`);
    return res.status(200).json({ message: "Daily digest sent", count: propertyRecords.length });
  } catch (err) {
    console.error("[DIGEST ERROR]", err.message);
    return res.status(500).json({ message: "Failed to send daily digest", error: err.message });
  }
};