# Airtable Setup Guide

This document provides detailed instructions for setting up Airtable as the database for your Property Listing application.

## Creating Your Airtable Base

### Step 1: Create a New Base

1. Log in to [Airtable](https://airtable.com/)
2. Click "Add a base" on your workspace
3. Choose "Start from scratch"
4. Name your base "Property Listings" (or any name you prefer)

### Step 2: Create the Properties Table

Rename the default table to "Properties" and create the following fields:

| Field Name   | Field Type       | Options/Notes                                         | Required |
| ------------ | ---------------- | ----------------------------------------------------- | -------- |
| Title        | Single line text | -                                                     | Yes      |
| Price        | Number           | Format: Currency (USD), Precision: 0 decimal places   | Yes      |
| Location     | Single line text | -                                                     | Yes      |
| PropertyType | Single select    | Options: House, Apartment, Condo, Townhouse, Villa    | Yes      |
| Bedrooms     | Number           | Precision: 0 decimal places                           | No       |
| Bathrooms    | Number           | Allow negative numbers: No                            | No       |
| SquareFeet   | Number           | Precision: 0 decimal places                           | No       |
| Description  | Long text        | Enable rich text formatting                           | No       |
| Status       | Single select    | Options: Available, Sold, Pending, Default: Available | No       |
| ImageURL     | URL              | -                                                     | No       |
| Amenities    | Long text        | Store comma-separated values                          | No       |
| YearBuilt    | Number           | Precision: 0 decimal places                           | No       |

### Step 3: Create the Inquiries Table

1. Click the "+" button next to the Properties tab to add a new table
2. Name it "Inquiries"
3. Create the following fields:

| Field Name    | Field Type       | Options/Notes                                 | Required |
| ------------- | ---------------- | --------------------------------------------- | -------- |
| Name          | Single line text | -                                             | Yes      |
| Email         | Email            | -                                             | Yes      |
| Phone         | Phone number     | -                                             | No       |
| Message       | Long text        | -                                             | Yes      |
| PropertyID    | Single line text | For linking to properties                     | No       |
| PropertyTitle | Single line text | -                                             | No       |
| Status        | Single select    | Options: New, Contacted, Closed, Default: New | No       |
| SubmittedAt   | Date             | Include time: Yes                             | No       |

## Sample Data

### Properties Table Sample Records

Here are some sample properties you can add for testing:

#### Property 1

- **Title**: Modern Downtown Apartment
- **Price**: 425000
- **Location**: 456 City Center Blvd, Downtown, CA 90001
- **PropertyType**: Apartment
- **Bedrooms**: 2
- **Bathrooms**: 2
- **SquareFeet**: 1200
- **Description**: Stunning modern apartment in the heart of downtown with city views, updated kitchen, and luxury amenities.
- **Status**: Available
- **ImageURL**: (Add your image URL)
- **Amenities**: Gym, Pool, Parking, Concierge, Balcony
- **YearBuilt**: 2021

#### Property 2

- **Title**: Spacious Family Home
- **Price**: 650000
- **Location**: 789 Maple Street, Suburban Area, CA 90210
- **PropertyType**: House
- **Bedrooms**: 4
- **Bathrooms**: 3
- **SquareFeet**: 2800
- **Description**: Beautiful family home featuring a large backyard, updated kitchen, master suite, and proximity to top-rated schools.
- **Status**: Available
- **ImageURL**: (Add your image URL)
- **Amenities**: Garage, Garden, Fireplace, Walk-in Closet
- **YearBuilt**: 2018

#### Property 3

- **Title**: Luxury Beachfront Villa
- **Price**: 1250000
- **Location**: 123 Ocean Drive, Beachside, CA 90265
- **PropertyType**: Villa
- **Bedrooms**: 5
- **Bathrooms**: 4.5
- **SquareFeet**: 4200
- **Description**: Exclusive beachfront villa with panoramic ocean views, private beach access, infinity pool, and high-end finishes throughout.
- **Status**: Pending
- **ImageURL**: (Add your image URL)
- **Amenities**: Private Beach, Pool, Ocean View, Wine Cellar, Smart Home
- **YearBuilt**: 2022

## Getting Your API Credentials

### Step 1: Get Your API Key

1. Click on your profile picture in the top-right corner
2. Select "Account"
3. Go to the "API" section
4. Click "Generate API key"
5. Copy your API key (keep this secure!)

### Step 2: Get Your Base ID

1. Go to [Airtable API Documentation](https://airtable.com/api)
2. Select your "Property Listings" base
3. Look for the Base ID in the introduction section
4. It will look like: `appXXXXXXXXXXXXXX`
5. Copy this ID

### Step 3: Add Credentials to Your Application

1. Open the `.env` file in your project
2. Replace the placeholder values:

```env
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Properties
AIRTABLE_INQUIRIES_TABLE=Inquiries
```

## Airtable Views (Optional but Recommended)

### Create Filtered Views

1. **Available Properties View**

   - Filter: Status is "Available"
   - Sort: Price (ascending)

2. **Sold Properties View**

   - Filter: Status is "Sold"
   - Sort: Price (descending)

3. **New Inquiries View**
   - Filter: Status is "New"
   - Sort: SubmittedAt (descending)

### Create Forms (Optional)

You can also create Airtable forms for direct property submissions:

1. Click the "Form" view in your Properties table
2. Customize the form fields
3. Share the form URL with property owners or agents

## Best Practices

### Data Entry Guidelines

1. **Images**: Use high-quality image URLs from reliable hosting services
2. **Prices**: Always enter whole numbers (e.g., 450000 not 450,000)
3. **Amenities**: Separate with commas (e.g., "Pool, Gym, Parking")
4. **Descriptions**: Keep between 100-300 words for optimal display
5. **Location**: Include full address with city and state

### Security

1. **Never share your API key** in public repositories
2. **Use environment variables** for all credentials
3. **Restrict API access** in Airtable settings if needed
4. **Regular backups**: Download CSV backups periodically

### Performance

1. **Limit records**: Keep active properties under 1000 for best performance
2. **Archive old data**: Move sold/inactive properties to a separate base
3. **Optimize images**: Use compressed images (under 1MB)

## Automation Ideas (Airtable Automations)

You can set up automations in Airtable:

1. **New Inquiry Notification**

   - Trigger: When record enters view "New Inquiries"
   - Action: Send email notification

2. **Status Change Alert**

   - Trigger: When Status changes to "Sold"
   - Action: Send Slack message or email

3. **Weekly Report**
   - Trigger: At scheduled time (every Monday)
   - Action: Send summary of new properties and inquiries

## Troubleshooting

### Common Issues

**Issue: "Invalid API Key"**

- Verify your API key is correct in `.env`
- Ensure there are no extra spaces
- Generate a new API key if necessary

**Issue: "Base not found"**

- Check Base ID is correct
- Ensure the base is in the same workspace as your account

**Issue: "Table not found"**

- Verify table names match exactly (case-sensitive)
- Check for typos in `AIRTABLE_TABLE_NAME`

**Issue: "Permission denied"**

- Ensure your Airtable plan allows API access
- Check base sharing settings

## Support Resources

- [Airtable API Documentation](https://airtable.com/api)
- [Airtable Support](https://support.airtable.com/)
- [Airtable Community](https://community.airtable.com/)

---

**Ready to go!** Once you've set up your Airtable base and configured your credentials, your Property Listing application will be fully functional.
