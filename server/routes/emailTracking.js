const express = require('express');
const router = express.Router();

/**
 * @route GET /api/email-tracking/pixel/:trackingId
 * @desc Track email opens with pixel
 * @access Public
 */
router.get('/pixel/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const emailService = require('../services/emailService');
    
    // Track the email open
    await emailService.trackEmailOpen(trackingId);
    
    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(pixel);
  } catch (error) {
    console.error('Email tracking pixel error:', error);
    res.status(500).send('Error');
  }
});

/**
 * @route GET /api/email-tracking/click/:trackingId
 * @desc Track email clicks
 * @access Public
 */
router.get('/click/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { url } = req.query;
    const emailService = require('../services/emailService');
    
    // Track the email click
    await emailService.trackEmailClick(trackingId, url);
    
    // Redirect to the original URL
    if (url) {
      res.redirect(url);
    } else {
      res.send('Click tracked');
    }
  } catch (error) {
    console.error('Email click tracking error:', error);
    res.status(500).send('Error');
  }
});

/**
 * @route GET /api/email-tracking/analytics/:organizationId
 * @desc Get email analytics for organization
 * @access Private
 */
router.get('/analytics/:organizationId', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const emailService = require('../services/emailService');
    
    const analytics = await emailService.getEmailAnalytics(organizationId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Email analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
