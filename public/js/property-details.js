// API Base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const errorText = document.getElementById('errorText');
const propertyDetailsSection = document.getElementById('propertyDetails');

// Inquiry form elements
const inquiryForm = document.getElementById('inquiryForm');
const inquiryFormMessage = document.getElementById('inquiryFormMessage');

// Property data
let currentProperty = null;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    const propertyId = getPropertyIdFromUrl();
    
    if (!propertyId) {
        showError('Invalid property ID');
        return;
    }

    loadPropertyDetails(propertyId);
    setupEventListeners();
});

/**
 * Get property ID from URL
 */
function getPropertyIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    inquiryForm.addEventListener('submit', handleInquiryFormSubmit);
}

/**
 * Load property details from API
 */
async function loadPropertyDetails(propertyId) {
    try {
        showLoading();

        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load property details');
        }

        currentProperty = data.data;
        hideLoading();
        displayPropertyDetails(currentProperty);

    } catch (error) {
        console.error('Error loading property details:', error);
        hideLoading();
        showError(error.message);
    }
}

/**
 * Display property details
 */
function displayPropertyDetails(property) {
    // Set page title
    document.title = `${property.Title || 'Property Details'} - PropertyHub`;

    // Set property title and location
    document.getElementById('propertyTitle').textContent = property.Title || 'Untitled Property';
    document.getElementById('propertyLocation').textContent = property.Location || 'Location not specified';

    // Set price
    document.getElementById('propertyPrice').textContent = formatPrice(property.Price);

    // Set status
    const statusElement = document.getElementById('propertyStatus');
    statusElement.textContent = property.Status || 'Available';
    statusElement.className = `property-status ${getStatusClass(property.Status)}`;

    // Set main image
    const mainImage = document.getElementById('mainImage');
    mainImage.src = property.ImageURL || getPlaceholderImage();
    mainImage.alt = property.Title || 'Property Image';
    mainImage.onerror = function() {
        this.src = getPlaceholderImage();
    };

    // Set property info
    document.getElementById('bedrooms').textContent = property.Bedrooms || 'N/A';
    document.getElementById('bathrooms').textContent = property.Bathrooms || 'N/A';
    document.getElementById('squareFeet').textContent = property.SquareFeet ? formatNumber(property.SquareFeet) : 'N/A';
    document.getElementById('propertyType').textContent = property.PropertyType || 'N/A';
    document.getElementById('yearBuilt').textContent = property.YearBuilt || 'N/A';

    // Set description
    const descriptionElement = document.getElementById('propertyDescription');
    descriptionElement.textContent = property.Description || 'No description available for this property.';

    // Set amenities
    if (property.Amenities) {
        const amenitiesSection = document.getElementById('amenitiesSection');
        const amenitiesList = document.getElementById('amenitiesList');
        
        // Split amenities by comma or newline
        const amenities = property.Amenities.split(/[,\n]/).map(a => a.trim()).filter(a => a);
        
        if (amenities.length > 0) {
            amenitiesSection.style.display = 'block';
            amenitiesList.innerHTML = '';
            
            amenities.forEach(amenity => {
                const li = document.createElement('li');
                li.textContent = amenity;
                amenitiesList.appendChild(li);
            });
        }
    }

    // Show property details section
    propertyDetailsSection.style.display = 'block';
}

/**
 * Handle inquiry form submission
 */
async function handleInquiryFormSubmit(e) {
    e.preventDefault();

    if (!currentProperty) {
        showInquiryFormMessage('Property information not available', 'error');
        return;
    }

    const formData = {
        Name: document.getElementById('inquiryName').value,
        Email: document.getElementById('inquiryEmail').value,
        Phone: document.getElementById('inquiryPhone').value,
        Message: document.getElementById('inquiryMessage').value,
        PropertyID: currentProperty.id,
        PropertyTitle: currentProperty.Title
    };

    try {
        showInquiryFormMessage('Sending inquiry...', 'info');

        const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send inquiry');
        }

        showInquiryFormMessage('Inquiry sent successfully! We\'ll contact you soon.', 'success');
        inquiryForm.reset();

        // Hide success message after 5 seconds
        setTimeout(() => {
            hideInquiryFormMessage();
        }, 5000);

    } catch (error) {
        console.error('Error submitting inquiry form:', error);
        showInquiryFormMessage(error.message || 'Failed to send inquiry. Please try again.', 'error');
    }
}

/**
 * Format price
 */
function formatPrice(price) {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(price);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Get status CSS class
 */
function getStatusClass(status) {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    if (statusLower === 'available') return 'status-available';
    if (statusLower === 'sold') return 'status-sold';
    if (statusLower === 'pending') return 'status-pending';
    return '';
}

/**
 * Get placeholder image
 */
function getPlaceholderImage() {
    return 'https://via.placeholder.com/800x600/e5e7eb/6b7280?text=No+Image+Available';
}

/**
 * Show loading state
 */
function showLoading() {
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    propertyDetailsSection.style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
    loadingElement.style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    errorText.textContent = message;
    errorElement.style.display = 'block';
    loadingElement.style.display = 'none';
    propertyDetailsSection.style.display = 'none';
}

/**
 * Show inquiry form message
 */
function showInquiryFormMessage(message, type) {
    inquiryFormMessage.textContent = message;
    inquiryFormMessage.className = `form-message ${type}`;
    inquiryFormMessage.style.display = 'block';
}

/**
 * Hide inquiry form message
 */
function hideInquiryFormMessage() {
    inquiryFormMessage.style.display = 'none';
}
