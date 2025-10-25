const express = require('express');
const router = express.Router();
const smsService = require('../services/smsService');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/sms/send
 * @desc Send SMS to a single phone number
 * @access Private
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message, options = {} } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    const result = await smsService.sendSMS(phoneNumber, message, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/sms/bulk
 * @desc Send bulk SMS notifications
 * @access Private
 */
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { recipients, options = {} } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required'
      });
    }

    const result = await smsService.sendBulkSMS(recipients, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Bulk SMS error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/sms/tournament/:tournamentId/notify
 * @desc Send tournament-specific notification
 * @access Private
 */
router.post('/tournament/:tournamentId/notify', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { notificationType, data = {} } = req.body;

    if (!notificationType) {
      return res.status(400).json({
        success: false,
        error: 'Notification type is required'
      });
    }

    const result = await smsService.sendTournamentNotification(tournamentId, notificationType, data);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Tournament notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/sms/status/:messageId
 * @desc Get SMS delivery status
 * @access Private
 */
router.get('/status/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const status = await smsService.getDeliveryStatus(messageId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('SMS status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/sms/stats
 * @desc Get SMS usage statistics
 * @access Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const stats = await smsService.getUsageStats(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('SMS stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/sms/test
 * @desc Test SMS configuration
 * @access Private
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required for testing'
      });
    }

    const testMessage = `🧪 SMS Test from Chess Tournament Director\n\n` +
                       `This is a test message to verify SMS configuration.\n` +
                       `Time: ${new Date().toLocaleString()}\n\n` +
                       `If you received this, SMS is working correctly! ✅`;

    const result = await smsService.sendSMS(phoneNumber, testMessage);

    res.json({
      success: true,
      data: result,
      message: 'Test SMS sent successfully'
    });
  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/sms/config
 * @desc Get SMS configuration status
 * @access Private
 */
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = {
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      emailFallbackConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      phoneNumberConfigured: !!process.env.TWILIO_PHONE_NUMBER,
      fallbackEmailConfigured: !!process.env.SMS_FALLBACK_EMAIL
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('SMS config error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
