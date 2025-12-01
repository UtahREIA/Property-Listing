const express = require('express');
const { body, validationResult, query } = require('express-validator');
const airtableService = require('../services/airtableService');

const router = express.Router();

/**
 * GET /api/properties
 * Get all properties with optional filters
 */
router.get('/', [
  query('status').optional().isString(),
  query('maxPrice').optional().isNumeric(),
  query('minPrice').optional().isNumeric(),
  query('propertyType').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      status: req.query.status,
      maxPrice: req.query.maxPrice,
      minPrice: req.query.minPrice,
      propertyType: req.query.propertyType
    };

    const properties = await airtableService.getAllProperties(filters);
    res.json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching properties'
    });
  }
});

/**
 * GET /api/properties/:id
 * Get a single property by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const property = await airtableService.getPropertyById(req.params.id);
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Error in GET /api/properties/:id:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Property not found'
    });
  }
});

/**
 * POST /api/properties
 * Create a new property
 */
router.post('/', [
  body('Title').notEmpty().withMessage('Title is required'),
  body('Price').isNumeric().withMessage('Price must be a number'),
  body('Location').notEmpty().withMessage('Location is required'),
  body('PropertyType').notEmpty().withMessage('Property type is required'),
  body('Bedrooms').optional().isInt(),
  body('Bathrooms').optional().isNumeric(),
  body('SquareFeet').optional().isNumeric(),
  body('Description').optional().isString(),
  body('Status').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const propertyData = {
      Title: req.body.Title,
      Price: req.body.Price,
      Location: req.body.Location,
      PropertyType: req.body.PropertyType,
      Bedrooms: req.body.Bedrooms,
      Bathrooms: req.body.Bathrooms,
      SquareFeet: req.body.SquareFeet,
      Description: req.body.Description,
      Status: req.body.Status || 'Available',
      ImageURL: req.body.ImageURL || '',
      Amenities: req.body.Amenities || '',
      YearBuilt: req.body.YearBuilt
    };

    const property = await airtableService.createProperty(propertyData);
    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('Error in POST /api/properties:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating property'
    });
  }
});

/**
 * PUT /api/properties/:id
 * Update an existing property
 */
router.put('/:id', [
  body('Title').optional().notEmpty(),
  body('Price').optional().isNumeric(),
  body('Location').optional().notEmpty(),
  body('PropertyType').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    const allowedFields = [
      'Title', 'Price', 'Location', 'PropertyType', 'Bedrooms', 
      'Bathrooms', 'SquareFeet', 'Description', 'Status', 
      'ImageURL', 'Amenities', 'YearBuilt'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const property = await airtableService.updateProperty(req.params.id, updates);
    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    console.error('Error in PUT /api/properties/:id:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating property'
    });
  }
});

/**
 * DELETE /api/properties/:id
 * Delete a property
 */
router.delete('/:id', async (req, res) => {
  try {
    await airtableService.deleteProperty(req.params.id);
    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/properties/:id:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting property'
    });
  }
});

module.exports = router;
