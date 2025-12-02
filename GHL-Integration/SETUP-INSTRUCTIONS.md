# Setup Instructions for UTAH REIA Property Listings

## ⚠️ Important: Security Notice

The API tokens have been removed from the HTML files for security. You need to add your credentials manually in GoHighLevel.

## Your Airtable Credentials

**IMPORTANT:** Your credentials are stored locally in `.env.example` file. Do not commit this file to GitHub!

You'll need:

- Your Airtable API Token
- Base ID: `appvnc6bZuI2D2DSR`
- Table Name: `Properties`

## Setup Steps

### 1. Home Page (home-page.html)

1. Open `home-page.html`
2. Find the `AIRTABLE_CONFIG` section (around line 440)
3. Replace:
   - `YOUR_AIRTABLE_API_TOKEN` with your actual token
   - `YOUR_BASE_ID` with `appvnc6bZuI2D2DSR`
4. Copy the entire file content
5. In GoHighLevel, create a new page and paste into Custom Code element

### 2. Add Property Page (add-property.html)

1. Open `add-property.html`
2. Find the `AIRTABLE_CONFIG` section (around line 411)
3. Replace with your actual credentials
4. Copy and paste into GoHighLevel Custom Code element

### 3. About Page (about.html)

- No credentials needed
- Copy and paste directly into GoHighLevel

### 4. Contact Page (contact.html)

- No credentials needed
- Copy and paste directly into GoHighLevel

## Navigation Links

Make sure to update the navigation links in each page to match your GoHighLevel URLs:

- `home-page.html` → Your home page URL
- `about.html` → Your about page URL
- `add-property.html` → Your list property page URL
- `contact.html` → Your contact page URL

## Widget Files (Legacy)

The `property-listing-widget.html` and `add-property-form.html` files are standalone widgets if you prefer to use those instead of the full pages.
