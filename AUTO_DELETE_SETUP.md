# Auto-Delete Property System Setup

## Overview

Properties are automatically deleted after **90 days** from creation. Contacts receive an email warning **14 days (2 weeks)** before deletion.

## Setup Steps

### 1. Add New Field to Airtable

You need to add a checkbox field to track warning emails:

1. Go to your Airtable base: https://airtable.com
2. Open the **Properties** table
3. Click **+** to add a new field
4. Choose **Checkbox** field type
5. Name it: `Expiration Warning Sent`
6. Save the field

### 2. Add Environment Variable to Vercel

The cron job needs authentication to prevent unauthorized access:

1. Go to: https://vercel.com/utahreia/property-listing/settings/environment-variables
2. Add a new environment variable:
   - **Key:** `CRON_SECRET`
   - **Value:** Generate a random secure string (e.g., `crypto.randomBytes(32).toString('hex')`)
   - **Environments:** Production, Preview, Development
3. Click **Save**

### 3. Deploy to Vercel

The system is already configured to deploy automatically:

```bash
git add .
git commit -m "Add auto-delete property system"
git push origin main
```

Vercel will automatically:

- Deploy the new serverless function
- Set up the cron job to run daily at 2 AM UTC

### 4. Verify Cron Job Setup

After deployment:

1. Go to: https://vercel.com/utahreia/property-listing/settings/crons
2. You should see the cron job listed:
   - **Path:** `/api/check-property-expiration`
   - **Schedule:** `0 2 * * *` (Daily at 2 AM UTC)
   - **Status:** Active

## How It Works

### Daily Schedule

- **Time:** 2:00 AM UTC (6:00 PM MST / 7:00 PM MDT)
- **Frequency:** Once per day

### Email Notifications

#### Warning Email (14 days before expiration)

- Sent to Contact's Email
- Subject: "⚠️ Property Listing Expiring Soon"
- Contains:
  - Days until expiration
  - Property details (address, price, ID)
  - Listed date and expiration date
  - Link to view listings

#### Deletion Email (on expiration day)

- Sent to Contact's Email
- Subject: "🏠 Property Listing Expired"
- Contains:
  - Confirmation of deletion
  - Property details
  - Link to relist property

### Expiration Rules

1. **Property Age Check**

   - Calculated from `createdTime` in Airtable
   - Current setting: 90 days

2. **Warning Email**

   - Sent when property is 76 days old (90 - 14 days)
   - Only sent once (tracked in `Expiration Warning Sent` field)
   - Requires valid Contact's Email

3. **Auto-Delete**
   - Occurs at 90 days
   - Property is permanently deleted from Airtable
   - Deletion confirmation email sent

## Configuration

You can adjust the expiration period by editing `serverless/check-property-expiration.js`:

```javascript
// Change these values at the top of the file:
const EXPIRATION_DAYS = 90; // Properties expire after X days
const WARNING_DAYS = 14; // Send warning X days before expiration
```

After making changes, redeploy:

```bash
git add .
git commit -m "Update expiration settings"
git push origin main
```

## Testing the Cron Job

### Manual Test (Development)

You can manually trigger the cron job for testing:

```bash
curl -X GET https://property-listing-32ax.vercel.app/api/check-property-expiration \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with your actual secret from Vercel environment variables.

### Expected Response

```json
{
  "success": true,
  "message": "Property expiration check completed",
  "results": {
    "checked": 10,
    "warned": 2,
    "deleted": 1,
    "errors": []
  }
}
```

## Monitoring

### Vercel Logs

View cron job execution logs:

1. Go to: https://vercel.com/utahreia/property-listing/logs
2. Filter by function: `check-property-expiration`
3. Check for:
   - Successful executions
   - Number of properties checked/warned/deleted
   - Any errors

### Email Deliverability

- Warning and deletion emails are sent via Gmail SMTP
- Uses the same credentials as verification emails
- Check spam folders if contacts report not receiving emails

## Troubleshooting

### Cron Job Not Running

1. Verify cron is active in Vercel dashboard
2. Check Vercel logs for errors
3. Ensure `CRON_SECRET` environment variable is set
4. Verify you're on a Vercel Pro plan (cron jobs require Pro)

### Emails Not Sending

1. Check Gmail credentials are still valid
2. Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` in Vercel
3. Check Vercel logs for SMTP errors
4. Ensure Contact's Email field is populated in Airtable

### Warning Field Not Updating

1. Verify `Expiration Warning Sent` checkbox field exists in Airtable
2. Check field name matches exactly (case-sensitive)
3. Check Airtable API permissions

### Properties Not Being Deleted

1. Check property `createdTime` in Airtable
2. Verify calculation: current date - createdTime >= 90 days
3. Check Vercel logs for deletion errors
4. Verify Airtable API token has delete permissions

## Important Notes

⚠️ **Cron jobs require Vercel Pro plan** - Free tier doesn't support scheduled functions

⚠️ **Deletions are permanent** - Properties are removed from Airtable with no recovery

⚠️ **Time zone** - Cron runs in UTC. Adjust schedule if needed for your timezone.

## Contact Support

If you need to adjust the expiration period or encounter issues, the configuration is in:

- `serverless/check-property-expiration.js` (main logic)
- `vercel.json` (cron schedule)
