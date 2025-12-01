// API Base URL
const API_BASE_URL = window.location.origin;

// State management
let allProperties = [];
let currentFilters = {};

// DOM Elements
const propertiesGrid = document.getElementById('propertiesGrid');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const errorText = document.getElementById('errorText');
const noResultsElement = document.getElementById('noResults');

// Filter elements
const propertyTypeFilter = document.getElementById('propertyType');
const minPriceFilter = document.getElementById('minPrice');
const maxPriceFilter = document.getElementById('maxPrice');
const statusFilter = document.getElementById('status');
const applyFiltersBtn = document.getElementById('applyFilters');

// Contact form elements
const contactForm = document.getElementById('contactForm');
const contactFormMessage = document.getElementById('contactFormMessage');

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    loadProperties();
    setupEventListeners();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Apply filters button
    applyFiltersBtn.addEventListener('click', () => {
        currentFilters = {
            propertyType: propertyTypeFilter.value,
            minPrice: minPriceFilter.value,
            maxPrice: maxPriceFilter.value,
            status: statusFilter.value
        };
        loadProperties();
    });

    // Allow Enter key to apply filters
    [propertyTypeFilter, minPriceFilter, maxPriceFilter, statusFilter].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFiltersBtn.click();
            }
        });
    });

    // Contact form submission
    contactForm.addEventListener('submit', handleContactFormSubmit);
}

/**
 * Load properties from API
 */
async function loadProperties() {
    try {
        showLoading();
        hideError();
        hideNoResults();

        // Build query string
        const params = new URLSearchParams();
        if (currentFilters.propertyType) params.append('propertyType', currentFilters.propertyType);
        if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
        if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
        if (currentFilters.status) params.append('status', currentFilters.status);

        const queryString = params.toString();
        const url = `${API_BASE_URL}/api/properties${queryString ? '?' + queryString : ''}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load properties');
        }

        allProperties = data.data || [];
        hideLoading();

        if (allProperties.length === 0) {
            showNoResults();
        } else {
            displayProperties(allProperties);
        }

    } catch (error) {
        console.error('Error loading properties:', error);
        hideLoading();
        showError(error.message);
    }
}

/**
 * Display properties in the grid
 */
function displayProperties(properties) {
    propertiesGrid.innerHTML = '';

    properties.forEach(property => {
        const propertyCard = createPropertyCard(property);
        propertiesGrid.appendChild(propertyCard);
    });
}

/**
 * Create a property card element
 */
function createPropertyCard(property) {
    const card = document.createElement('a');
    card.href = `/property/${property.id}`;
    card.className = 'property-card';

    // Get image URL or use placeholder
    const imageUrl = property.ImageURL || getPlaceholderImage();

    // Format price
    const formattedPrice = formatPrice(property.Price);

    // Get status class
    const statusClass = getStatusClass(property.Status);

    card.innerHTML = `
        <img src="${imageUrl}" alt="${property.Title}" class="property-image" onerror="this.src='${getPlaceholderImage()}'">
        <div class="property-content">
            <h3 class="property-title">${property.Title || 'Untitled Property'}</h3>
            <p class="property-location">
                <i class="fas fa-map-marker-alt"></i>
                ${property.Location || 'Location not specified'}
            </p>
            <div class="property-features">
                ${property.Bedrooms ? `
                    <span class="feature">
                        <i class="fas fa-bed"></i>
                        ${property.Bedrooms} Beds
                    </span>
                ` : ''}
                ${property.Bathrooms ? `
                    <span class="feature">
                        <i class="fas fa-bath"></i>
                        ${property.Bathrooms} Baths
                    </span>
                ` : ''}
                ${property.SquareFeet ? `
                    <span class="feature">
                        <i class="fas fa-ruler-combined"></i>
                        ${formatNumber(property.SquareFeet)} sqft
                    </span>
                ` : ''}
            </div>
            <div class="property-footer">
                <span class="property-price">${formattedPrice}</span>
                ${property.Status ? `<span class="property-status ${statusClass}">${property.Status}</span>` : ''}
            </div>
        </div>
    `;

    return card;
}

/**
 * Handle contact form submission
 */
async function handleContactFormSubmit(e) {
    e.preventDefault();

    const formData = {
        Name: document.getElementById('contactName').value,
        Email: document.getElementById('contactEmail').value,
        Phone: document.getElementById('contactPhone').value,
        Message: document.getElementById('contactMessage').value
    };

    try {
        showFormMessage('Sending message...', 'info');

        const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send message');
        }

        showFormMessage('Message sent successfully! We\'ll get back to you soon.', 'success');
        contactForm.reset();

        // Hide success message after 5 seconds
        setTimeout(() => {
            hideFormMessage();
        }, 5000);

    } catch (error) {
        console.error('Error submitting contact form:', error);
        showFormMessage(error.message || 'Failed to send message. Please try again.', 'error');
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
    return 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=No+Image+Available';
}

/**
 * Show loading state
 */
function showLoading() {
    loadingElement.style.display = 'block';
    propertiesGrid.style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
    loadingElement.style.display = 'none';
    propertiesGrid.style.display = 'grid';
}

/**
 * Show error message
 */
function showError(message) {
    errorText.textContent = message;
    errorElement.style.display = 'block';
    propertiesGrid.style.display = 'none';
}

/**
 * Hide error message
 */
function hideError() {
    errorElement.style.display = 'none';
}

/**
 * Show no results message
 */
function showNoResults() {
    noResultsElement.style.display = 'block';
    propertiesGrid.style.display = 'none';
}

/**
 * Hide no results message
 */
function hideNoResults() {
    noResultsElement.style.display = 'none';
}

/**
 * Show form message
 */
function showFormMessage(message, type) {
    contactFormMessage.textContent = message;
    contactFormMessage.className = `form-message ${type}`;
    contactFormMessage.style.display = 'block';
}

/**
 * Hide form message
 */
function hideFormMessage() {
    contactFormMessage.style.display = 'none';
}
