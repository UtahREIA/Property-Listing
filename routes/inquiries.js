const express = require('express');
const { body, validationResult } = require('express-validator');
const airtableService = require('../services/airtableService');

const router = express.Router();

/**
 * POST /api/inquiries
 * Submit a contact/inquiry form
 */
router.post('/', [
  body('Name').notEmpty().withMessage('Name is required'),
  body('Email').isEmail().withMessage('Valid email is required'),
  body('Phone').optional().isMobilePhone(),
  body('Message').notEmpty().withMessage('Message is required'),
  body('PropertyID').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inquiryData = {
      Name: req.body.Name,
      Email: req.body.Email,
      Phone: req.body.Phone || '',
      Message: req.body.Message,
      PropertyID: req.body.PropertyID || '',
      PropertyTitle: req.body.PropertyTitle || '',
      Status: 'New'
    };

    const inquiry = await airtableService.createInquiry(inquiryData);
    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: inquiry
    });
  } catch (error) {
    console.error('Error in POST /api/inquiries:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting inquiry'
    });
  }
});

module.exports = router;
