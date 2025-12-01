# API Documentation

Complete API reference for the Property Listing Web Application.

## Base URL

```
http://localhost:3000/api
```

For production, replace with your deployed URL.

## Authentication

Currently, the API does not require authentication. For production use, consider implementing:

- API keys
- JWT tokens
- OAuth 2.0

## Response Format

All API responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "count": 10  // For list endpoints
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## HTTP Status Codes

- `200 OK` - Successful GET, PUT, DELETE request
- `201 Created` - Successful POST request
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Endpoints

### Health Check

#### `GET /api/health`

Check if the API is running.

**Response:**

```json
{
  "success": true,
  "message": "Property Listing API is running",
  "timestamp": "2025-12-01T10:00:00.000Z"
}
```

---

## Properties Endpoints

### Get All Properties

#### `GET /api/properties`

Retrieve all properties with optional filtering.

**Query Parameters:**

| Parameter      | Type   | Description             | Example                        |
| -------------- | ------ | ----------------------- | ------------------------------ |
| `status`       | string | Filter by status        | `Available`, `Sold`, `Pending` |
| `propertyType` | string | Filter by property type | `House`, `Apartment`           |
| `minPrice`     | number | Minimum price filter    | `200000`                       |
| `maxPrice`     | number | Maximum price filter    | `500000`                       |

**Example Requests:**

```bash
# Get all properties
GET /api/properties

# Get available properties under $500,000
GET /api/properties?status=Available&maxPrice=500000

# Get houses between $300k-$600k
GET /api/properties?propertyType=House&minPrice=300000&maxPrice=600000
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "rec123456789",
      "Title": "Beautiful Family Home",
      "Price": 450000,
      "Location": "123 Main St, City, State 12345",
      "PropertyType": "House",
      "Bedrooms": 4,
      "Bathrooms": 3,
      "SquareFeet": 2500,
      "Description": "Spacious family home with modern amenities...",
      "Status": "Available",
      "ImageURL": "https://example.com/image.jpg",
      "Amenities": "Pool, Garage, Garden",
      "YearBuilt": 2020
    }
  ]
}
```

---

### Get Property by ID

#### `GET /api/properties/:id`

Retrieve a single property by its Airtable record ID.

**URL Parameters:**

| Parameter | Type   | Description                               |
| --------- | ------ | ----------------------------------------- |
| `id`      | string | Airtable record ID (e.g., `rec123456789`) |

**Example Request:**

```bash
GET /api/properties/rec123456789
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "rec123456789",
    "Title": "Beautiful Family Home",
    "Price": 450000,
    "Location": "123 Main St, City, State 12345",
    "PropertyType": "House",
    "Bedrooms": 4,
    "Bathrooms": 3,
    "SquareFeet": 2500,
    "Description": "Spacious family home...",
    "Status": "Available",
    "ImageURL": "https://example.com/image.jpg",
    "Amenities": "Pool, Garage, Garden",
    "YearBuilt": 2020
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Property not found"
}
```

---

### Create Property

#### `POST /api/properties`

Create a new property listing.

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

| Field          | Type   | Required | Description                         |
| -------------- | ------ | -------- | ----------------------------------- |
| `Title`        | string | Yes      | Property title                      |
| `Price`        | number | Yes      | Property price                      |
| `Location`     | string | Yes      | Full address                        |
| `PropertyType` | string | Yes      | Type: House, Apartment, Condo, etc. |
| `Bedrooms`     | number | No       | Number of bedrooms                  |
| `Bathrooms`    | number | No       | Number of bathrooms                 |
| `SquareFeet`   | number | No       | Square footage                      |
| `Description`  | string | No       | Property description                |
| `Status`       | string | No       | Status (default: Available)         |
| `ImageURL`     | string | No       | URL to property image               |
| `Amenities`    | string | No       | Comma-separated amenities           |
| `YearBuilt`    | number | No       | Year property was built             |

**Example Request:**

```bash
POST /api/properties
Content-Type: application/json

{
  "Title": "Luxury Downtown Condo",
  "Price": 525000,
  "Location": "789 City Plaza, Downtown, CA 90001",
  "PropertyType": "Condo",
  "Bedrooms": 2,
  "Bathrooms": 2,
  "SquareFeet": 1400,
  "Description": "Modern luxury condo in prime location",
  "Status": "Available",
  "ImageURL": "https://example.com/condo.jpg",
  "Amenities": "Gym, Pool, Concierge, Parking",
  "YearBuilt": 2022
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    "id": "recNEW123456",
    "Title": "Luxury Downtown Condo",
    "Price": 525000,
    ...
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "errors": [
    {
      "field": "Title",
      "message": "Title is required"
    },
    {
      "field": "Price",
      "message": "Price must be a number"
    }
  ]
}
```

---

### Update Property

#### `PUT /api/properties/:id`

Update an existing property.

**URL Parameters:**

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| `id`      | string | Airtable record ID |

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

Send only the fields you want to update. All fields are optional.

**Example Request:**

```bash
PUT /api/properties/rec123456789
Content-Type: application/json

{
  "Price": 475000,
  "Status": "Pending",
  "Description": "Updated description with new details"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Property updated successfully",
  "data": {
    "id": "rec123456789",
    "Title": "Beautiful Family Home",
    "Price": 475000,
    "Status": "Pending",
    ...
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Property not found"
}
```

---

### Delete Property

#### `DELETE /api/properties/:id`

Delete a property from the database.

**URL Parameters:**

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| `id`      | string | Airtable record ID |

**Example Request:**

```bash
DELETE /api/properties/rec123456789
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Property deleted successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Failed to delete property"
}
```

---

## Inquiries Endpoints

### Submit Inquiry

#### `POST /api/inquiries`

Submit a contact or property inquiry form.

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

| Field           | Type           | Required | Description            |
| --------------- | -------------- | -------- | ---------------------- |
| `Name`          | string         | Yes      | Inquirer's name        |
| `Email`         | string (email) | Yes      | Valid email address    |
| `Phone`         | string         | No       | Phone number           |
| `Message`       | string         | Yes      | Inquiry message        |
| `PropertyID`    | string         | No       | Related property ID    |
| `PropertyTitle` | string         | No       | Related property title |

**Example Request:**

```bash
POST /api/inquiries
Content-Type: application/json

{
  "Name": "John Doe",
  "Email": "john.doe@example.com",
  "Phone": "+1-555-123-4567",
  "Message": "I'm interested in scheduling a viewing for this property.",
  "PropertyID": "rec123456789",
  "PropertyTitle": "Beautiful Family Home"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Inquiry submitted successfully",
  "data": {
    "id": "recINQ123456",
    "Name": "John Doe",
    "Email": "john.doe@example.com",
    "Phone": "+1-555-123-4567",
    "Message": "I'm interested in scheduling a viewing...",
    "PropertyID": "rec123456789",
    "PropertyTitle": "Beautiful Family Home",
    "Status": "New",
    "SubmittedAt": "2025-12-01T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "errors": [
    {
      "field": "Email",
      "message": "Valid email is required"
    },
    {
      "field": "Message",
      "message": "Message is required"
    }
  ]
}
```

---

## Code Examples

### JavaScript (Fetch API)

```javascript
// Get all properties
async function getProperties() {
  const response = await fetch("http://localhost:3000/api/properties");
  const data = await response.json();
  return data;
}

// Get property by ID
async function getProperty(id) {
  const response = await fetch(`http://localhost:3000/api/properties/${id}`);
  const data = await response.json();
  return data;
}

// Create property
async function createProperty(propertyData) {
  const response = await fetch("http://localhost:3000/api/properties", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(propertyData),
  });
  const data = await response.json();
  return data;
}

// Update property
async function updateProperty(id, updates) {
  const response = await fetch(`http://localhost:3000/api/properties/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  return data;
}

// Delete property
async function deleteProperty(id) {
  const response = await fetch(`http://localhost:3000/api/properties/${id}`, {
    method: "DELETE",
  });
  const data = await response.json();
  return data;
}

// Submit inquiry
async function submitInquiry(inquiryData) {
  const response = await fetch("http://localhost:3000/api/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inquiryData),
  });
  const data = await response.json();
  return data;
}
```

### cURL Examples

```bash
# Get all available properties
curl "http://localhost:3000/api/properties?status=Available"

# Get specific property
curl "http://localhost:3000/api/properties/rec123456789"

# Create property
curl -X POST "http://localhost:3000/api/properties" \
  -H "Content-Type: application/json" \
  -d '{
    "Title": "New Property",
    "Price": 350000,
    "Location": "123 Main St",
    "PropertyType": "House"
  }'

# Update property
curl -X PUT "http://localhost:3000/api/properties/rec123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "Price": 365000,
    "Status": "Pending"
  }'

# Delete property
curl -X DELETE "http://localhost:3000/api/properties/rec123456789"

# Submit inquiry
curl -X POST "http://localhost:3000/api/inquiries" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "John Doe",
    "Email": "john@example.com",
    "Message": "Interested in viewing"
  }'
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production:

- Consider implementing rate limiting (e.g., 100 requests per 15 minutes)
- Use packages like `express-rate-limit`
- Monitor API usage through Airtable's API limits

## Testing the API

Use tools like:

- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- cURL (command line)
- Browser DevTools (for GET requests)

---

**Need help?** Check the main README.md or open an issue on GitHub.
