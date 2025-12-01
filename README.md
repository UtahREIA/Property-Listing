# 🏡 Property Listing Web Application

A full-stack real estate property listing application built with **Node.js**, **Express**, **Airtable**, and **vanilla JavaScript**. This application allows users to browse properties, view detailed information, and submit inquiries.

![Property Listing Application](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-v16+-green)
![Express](https://img.shields.io/badge/Express-v4.18-blue)
![Airtable](https://img.shields.io/badge/Airtable-Integrated-orange)

---

## 🚀 Features

### User Features

- ✅ **Browse Properties**: View all available properties with photos and key details
- 🔍 **Advanced Filtering**: Filter by property type, price range, and status
- 🏠 **Property Details**: Comprehensive property information including amenities
- 📱 **Fully Responsive**: Optimized for mobile, tablet, and desktop
- 💬 **Contact Forms**: Submit inquiries for specific properties or general questions
- 🎨 **Modern UI**: Clean and intuitive user interface

### Technical Features

- 🗄️ **Airtable Integration**: Uses Airtable as the database backend
- 🔌 **RESTful API**: Well-structured API endpoints for all operations
- ✅ **Input Validation**: Server-side validation using express-validator
- 🔒 **Security**: Helmet.js for security headers, CORS configuration
- 📊 **CRUD Operations**: Full Create, Read, Update, Delete functionality
- 🎯 **Error Handling**: Comprehensive error handling throughout the application

---

## 🛠️ Tech Stack

| Category       | Technologies                   |
| -------------- | ------------------------------ |
| **Frontend**   | HTML5, CSS3, JavaScript (ES6+) |
| **Backend**    | Node.js, Express.js            |
| **Database**   | Airtable                       |
| **Validation** | express-validator              |
| **Security**   | Helmet.js, CORS                |
| **Icons**      | Font Awesome 6                 |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Airtable Account** - [Sign up](https://airtable.com/)

---

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Property-Listing
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Airtable

#### Create Airtable Base

1. Go to [Airtable](https://airtable.com/) and create a new base
2. Create two tables:

**Properties Table** with the following fields:

- `Title` (Single line text) - Required
- `Price` (Number) - Required
- `Location` (Single line text) - Required
- `PropertyType` (Single select: House, Apartment, Condo, Townhouse, Villa) - Required
- `Bedrooms` (Number)
- `Bathrooms` (Number)
- `SquareFeet` (Number)
- `Description` (Long text)
- `Status` (Single select: Available, Sold, Pending)
- `ImageURL` (URL)
- `Amenities` (Long text - comma separated)
- `YearBuilt` (Number)

**Inquiries Table** with the following fields:

- `Name` (Single line text)
- `Email` (Email)
- `Phone` (Phone number)
- `Message` (Long text)
- `PropertyID` (Single line text)
- `PropertyTitle` (Single line text)
- `Status` (Single select: New, Contacted, Closed)
- `SubmittedAt` (Date)

#### Get API Credentials

1. Go to your [Airtable Account](https://airtable.com/account)
2. Generate an API key
3. Get your Base ID from the [API documentation](https://airtable.com/api) page

### 4. Configure Environment Variables

1. Copy the example environment file:

```bash
copy .env.example .env
```

2. Edit `.env` and add your Airtable credentials:

```env
AIRTABLE_API_KEY=your_actual_api_key_here
AIRTABLE_BASE_ID=your_actual_base_id_here
AIRTABLE_TABLE_NAME=Properties
AIRTABLE_INQUIRIES_TABLE=Inquiries

PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 5. Run the Application

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The application will be available at: `http://localhost:3000`

---

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### **GET /api/health**

Health check endpoint

**Response:**

```json
{
  "success": true,
  "message": "Property Listing API is running",
  "timestamp": "2025-12-01T10:00:00.000Z"
}
```

---

#### **GET /api/properties**

Get all properties with optional filters

**Query Parameters:**

- `status` (string, optional) - Filter by status (Available, Sold, Pending)
- `propertyType` (string, optional) - Filter by property type
- `minPrice` (number, optional) - Minimum price
- `maxPrice` (number, optional) - Maximum price

**Example Request:**

```
GET /api/properties?status=Available&maxPrice=500000
```

**Response:**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "rec123456",
      "Title": "Beautiful Family Home",
      "Price": 450000,
      "Location": "123 Main St, City, State",
      "PropertyType": "House",
      "Bedrooms": 4,
      "Bathrooms": 3,
      "SquareFeet": 2500,
      "Description": "Spacious family home...",
      "Status": "Available",
      "ImageURL": "https://...",
      "Amenities": "Pool, Garage, Garden"
    }
  ]
}
```

---

#### **GET /api/properties/:id**

Get a single property by ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "rec123456",
    "Title": "Beautiful Family Home",
    "Price": 450000,
    ...
  }
}
```

---

#### **POST /api/properties**

Create a new property

**Request Body:**

```json
{
  "Title": "Beautiful Family Home",
  "Price": 450000,
  "Location": "123 Main St, City, State",
  "PropertyType": "House",
  "Bedrooms": 4,
  "Bathrooms": 3,
  "SquareFeet": 2500,
  "Description": "Spacious family home...",
  "Status": "Available",
  "ImageURL": "https://...",
  "Amenities": "Pool, Garage, Garden",
  "YearBuilt": 2020
}
```

**Response:**

```json
{
  "success": true,
  "message": "Property created successfully",
  "data": { ... }
}
```

---

#### **PUT /api/properties/:id**

Update an existing property

**Request Body:**

```json
{
  "Price": 475000,
  "Status": "Pending"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Property updated successfully",
  "data": { ... }
}
```

---

#### **DELETE /api/properties/:id**

Delete a property

**Response:**

```json
{
  "success": true,
  "message": "Property deleted successfully"
}
```

---

#### **POST /api/inquiries**

Submit a contact/inquiry form

**Request Body:**

```json
{
  "Name": "John Doe",
  "Email": "john@example.com",
  "Phone": "+1234567890",
  "Message": "I'm interested in this property",
  "PropertyID": "rec123456",
  "PropertyTitle": "Beautiful Family Home"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Inquiry submitted successfully",
  "data": { ... }
}
```

---

## 📁 Project Structure

```
Property-Listing/
├── public/                 # Frontend files
│   ├── css/
│   │   └── styles.css     # Main stylesheet
│   ├── js/
│   │   ├── main.js        # Home page JavaScript
│   │   └── property-details.js  # Property details page JavaScript
│   ├── index.html         # Home page
│   └── property-details.html    # Property details page
├── routes/                # API route handlers
│   ├── properties.js      # Property routes
│   └── inquiries.js       # Inquiry routes
├── services/              # Business logic
│   └── airtableService.js # Airtable integration
├── .env                   # Environment variables (not in git)
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file
├── package.json           # Node.js dependencies
├── server.js              # Express server setup
└── README.md              # This file
```

---

## 🎨 Usage

### For End Users

1. **Browse Properties**: Visit the home page to see all available properties
2. **Filter Properties**: Use the filter options to narrow down your search
3. **View Details**: Click on any property card to see full details
4. **Submit Inquiry**: Fill out the inquiry form on a property details page
5. **General Contact**: Use the contact form at the bottom of the home page

### For Administrators

#### Adding Properties via Airtable

1. Open your Airtable base
2. Go to the Properties table
3. Add a new record with all required fields
4. The property will automatically appear on the website

#### Managing Inquiries

1. Open your Airtable base
2. Go to the Inquiries table
3. View all submitted inquiries
4. Update the Status field as you process them

---

## 🚀 Deployment

### Deploy to Render

1. Create a [Render](https://render.com/) account
2. Create a new Web Service
3. Connect your GitHub repository
4. Set environment variables in Render dashboard
5. Deploy!

### Deploy to Vercel

1. Install Vercel CLI:

```bash
npm install -g vercel
```

2. Deploy:

```bash
vercel
```

3. Set environment variables in Vercel dashboard

### Deploy to Heroku

1. Install Heroku CLI
2. Login and create app:

```bash
heroku login
heroku create your-app-name
```

3. Set environment variables:

```bash
heroku config:set AIRTABLE_API_KEY=your_key
heroku config:set AIRTABLE_BASE_ID=your_base_id
```

4. Deploy:

```bash
git push heroku main
```

---

## 🔒 Security Considerations

- ✅ API keys are stored in environment variables (never commit `.env`)
- ✅ Helmet.js adds security headers
- ✅ CORS is configured to restrict origins
- ✅ Input validation on all endpoints
- ✅ XSS protection through proper HTML escaping

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "Error fetching properties"**

- Check your Airtable API key and Base ID in `.env`
- Verify table names match exactly
- Ensure Airtable base is accessible

**Issue: Port already in use**

- Change the PORT in `.env` file
- Or kill the process using the port:
  ```bash
  # Windows PowerShell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
  ```

**Issue: CORS errors**

- Add your frontend URL to `ALLOWED_ORIGINS` in `.env`
- Restart the server after changes

---

## 🎯 Future Enhancements

- [ ] User authentication and authorization
- [ ] Admin dashboard for property management
- [ ] Image upload functionality
- [ ] Property comparison feature
- [ ] Saved properties / favorites
- [ ] Email notifications for inquiries
- [ ] Advanced search with maps integration
- [ ] Property analytics and insights
- [ ] Multi-language support

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👥 Use Cases

This application is perfect for:

- **Real Estate Agents**: Showcase your listings online
- **Property Developers**: Display properties under development
- **Real Estate Agencies**: Manage multiple properties
- **Landlords**: List rental properties
- **Portfolio Projects**: Demonstrate full-stack development skills

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

If you have any questions or need help, please:

- Open an issue in the repository
- Contact the development team

---

## 🙏 Acknowledgments

- [Airtable](https://airtable.com/) for the database backend
- [Font Awesome](https://fontawesome.com/) for icons
- [Express.js](https://expressjs.com/) for the web framework
- The open-source community for inspiration and tools

---

**Built with ❤️ for the real estate community**
