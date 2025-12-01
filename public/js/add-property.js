// API Base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const addPropertyForm = document.getElementById('addPropertyForm');
const formMessage = document.getElementById('formMessage');

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    addPropertyForm.addEventListener('submit', handleFormSubmit);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    // Get form data
    const formData = new FormData(addPropertyForm);
    const propertyData = {};

    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        // Skip empty values for optional fields
        if (value.trim() !== '') {
            // Convert numeric fields
            if (['Price', 'Bedrooms', 'Bathrooms', 'SquareFeet', 'YearBuilt'].includes(key)) {
                propertyData[key] = parseFloat(value);
            } else {
                propertyData[key] = value;
            }
        }
    }

    // Validate required fields
    if (!propertyData.Title || !propertyData.Price || !propertyData.Location || 
        !propertyData.PropertyType || !propertyData.Description) {
        showFormMessage('Please fill in all required fields', 'error');
        return;
    }

    try {
        showFormMessage('Adding property...', 'info');

        const response = await fetch(`${API_BASE_URL}/api/properties`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(propertyData)
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle validation errors
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessages = data.errors.map(err => err.message).join(', ');
                throw new Error(errorMessages);
            }
            throw new Error(data.message || 'Failed to add property');
        }

        // Success!
        showFormMessage('Property added successfully! Redirecting...', 'success');
        
        // Reset form
        addPropertyForm.reset();

        // Redirect to property details page after 2 seconds
        setTimeout(() => {
            window.location.href = `/property/${data.data.id}`;
        }, 2000);

    } catch (error) {
        console.error('Error adding property:', error);
        showFormMessage(error.message || 'Failed to add property. Please try again.', 'error');
    }
}

/**
 * Show form message
 */
function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';

    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Auto-hide info messages after 5 seconds
    if (type === 'info') {
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
}

/**
 * Hide form message
 */
function hideFormMessage() {
    formMessage.style.display = 'none';
}
