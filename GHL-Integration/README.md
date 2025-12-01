# GoHighLevel + Airtable Integration Guide

This folder contains ready-to-use HTML/CSS/JavaScript widgets for integrating Airtable with GoHighLevel.

## 📁 Files Included

1. **property-listing-widget.html** - Displays all properties with filters
2. **add-property-form.html** - Form to add new properties
3. **property-details-widget.html** - Single property details view (coming next)

---

## 🚀 Setup Instructions

### Step 1: Get Your Airtable Credentials

You need:

- **API Token**: Your Airtable Personal Access Token
- **Base ID**: Your Airtable Base ID (e.g., `appXXXXXXXXXXXXXX`)
- **Table Name**: Your table name (e.g., `Properties`)

**Note:** For security, credentials have been removed from code files. Add them manually when deploying to GoHighLevel.

### Step 2: Add Widget to GoHighLevel

#### For Property Listings Page:

1. **In GoHighLevel**, go to **Sites** → Your Website → **Edit**
2. **Add a new page** or edit existing page
3. **Add a Custom Code element** (drag from left sidebar)
4. **Copy the entire contents** of `property-listing-widget.html`
5. **Paste it** into the Custom Code element
6. **Save and publish**

#### For Add Property Form:

1. **Create a new page** in GHL (e.g., "Add Property")
2. **Add a Custom Code element**
3. **Copy the entire contents** of `add-property-form.html`
4. **Paste it** into the Custom Code element
5. **Save and publish**

---

## ✅ What's Included

### Property Listing Widget Features:

- ✅ Displays all properties from Airtable
- ✅ Filter by property type, price range, and status
- ✅ Responsive grid layout
- ✅ Click to view property details
- ✅ Automatic image placeholders
- ✅ Real-time data from Airtable

### Add Property Form Features:

- ✅ All property fields (title, price, location, etc.)
- ✅ Form validation
- ✅ Submits directly to Airtable
- ✅ Success/error messages
- ✅ Auto-reset after submission
- ✅ Mobile responsive

---

## 🎨 Customization

### Change Colors

Look for these CSS variables in the `<style>` section:

```css
/* Primary color (buttons, prices) */
background: #2563eb; /* Change to your brand color */

/* Hover color */
background: #1e40af; /* Darker shade of your color */
```

### Change Layout

In the CSS, find:

```css
grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
```

- Change `320px` to adjust card minimum width
- Change to `repeat(3, 1fr)` for exactly 3 columns

---

## 🔐 Security Note

⚠️ **IMPORTANT**: The API token is visible in the client-side code. For production:

**Option 1: Use Airtable Web API (Secure)**

- Create a read-only view in Airtable
- Share it publicly
- Use the shared view URL instead

**Option 2: Use the Node.js API (Most Secure)**

- Deploy the Node.js backend we built
- Update the widgets to call your API instead of Airtable directly
- This keeps your token secure on the server

**For now**: The current setup works but is less secure. Consider upgrading for production.

---

## 📱 Testing

1. **Open your GHL page** in a browser
2. The properties should load automatically
3. Try the filters
4. Submit a test property through the form
5. Check Airtable to verify it was added

---

## 🐛 Troubleshooting

### Properties Not Loading?

1. **Check browser console** (F12) for errors
2. **Verify Airtable credentials** are correct
3. **Check token permissions** include `data.records:read`
4. **Table name** must match exactly: `property_listing`

### Form Not Submitting?

1. **Check token permissions** include `data.records:write`
2. **Verify required fields** have the red asterisk (\*)
3. **Check browser console** for error messages

### CORS Errors?

- Airtable API allows cross-origin requests, so this shouldn't happen
- If it does, you'll need to use the Node.js backend instead

---

## 🎯 Next Steps

1. ✅ **Copy widgets to GHL** (both files)
2. ✅ **Test the property listing** page
3. ✅ **Test adding a property**
4. 📝 **Customize colors** to match your brand
5. 🔗 **Add navigation** between pages in GHL
6. 🎨 **Adjust layout** as needed

---

## 💡 Tips

- **Link Property Cards**: Update the `viewProperty()` function to redirect to a details page
- **Add More Fields**: Edit the forms to include additional Airtable fields
- **Style Integration**: Match the CSS to your GHL site theme
- **Mobile Testing**: Always test on mobile devices

---

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify Airtable credentials
3. Ensure token has proper permissions
4. Test Airtable API directly using Postman

---

**Your widgets are ready to use in GoHighLevel! 🚀**
