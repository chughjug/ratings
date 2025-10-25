const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/payments/entry-fee
 * @desc Process tournament entry fee payment
 * @access Private
 */
router.post('/entry-fee', authenticate, async (req, res) => {
  try {
    const { method, tournamentId, playerId, amount, currency = 'usd' } = req.body;

    if (!method || !tournamentId || !playerId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Method, tournamentId, playerId, and amount are required'
      });
    }

    const result = await paymentService.processEntryFeePayment({
      method,
      tournamentId,
      playerId,
      amount: parseFloat(amount),
      currency
    });

    res.json(result);
  } catch (error) {
    console.error('Entry fee payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/confirm
 * @desc Confirm payment (Stripe or PayPal)
 * @access Private
 */
router.post('/confirm', authenticate, async (req, res) => {
  try {
    const { method, paymentId, orderId } = req.body;

    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'Payment method is required'
      });
    }

    let result;
    switch (method.toLowerCase()) {
      case 'stripe':
        if (!paymentId) {
          return res.status(400).json({
            success: false,
            error: 'Payment ID is required for Stripe'
          });
        }
        result = await paymentService.confirmStripePayment(paymentId);
        break;
      case 'paypal':
        if (!orderId) {
          return res.status(400).json({
            success: false,
            error: 'Order ID is required for PayPal'
          });
        }
        result = await paymentService.capturePayPalOrder(orderId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported payment method'
        });
    }

    res.json(result);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/prizes
 * @desc Process prize distribution payments
 * @access Private
 */
router.post('/prizes', authenticate, async (req, res) => {
  try {
    const { tournamentId, prizes, method = 'stripe' } = req.body;

    if (!tournamentId || !prizes || !Array.isArray(prizes)) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID and prizes array are required'
      });
    }

    const result = await paymentService.processPrizePayment({
      tournamentId,
      prizes,
      method
    });

    res.json(result);
  } catch (error) {
    console.error('Prize payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/payments/history/:tournamentId
 * @desc Get payment history for tournament
 * @access Private
 */
router.get('/history/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const result = await paymentService.getPaymentHistory(tournamentId);

    res.json(result);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/payments/stats/:tournamentId
 * @desc Get payment statistics for tournament
 * @access Private
 */
router.get('/stats/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const result = await paymentService.getPaymentStats(tournamentId);

    res.json(result);
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/refund
 * @desc Refund a payment
 * @access Private
 */
router.post('/refund', authenticate, async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    const result = await paymentService.refundPayment(paymentId, amount);

    res.json(result);
  } catch (error) {
    console.error('Payment refund error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/payments/config
 * @desc Get payment configuration
 * @access Private
 */
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = paymentService.getPaymentConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Payment config error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/stripe/create-intent
 * @desc Create Stripe payment intent
 * @access Private
 */
router.post('/stripe/create-intent', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'usd', tournamentId, playerId, description, metadata = {} } = req.body;

    if (!amount || !tournamentId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Amount, tournament ID, and player ID are required'
      });
    }

    const result = await paymentService.createStripePaymentIntent({
      amount: parseFloat(amount),
      currency,
      tournamentId,
      playerId,
      description,
      metadata
    });

    res.json(result);
  } catch (error) {
    console.error('Stripe intent creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/paypal/create-order
 * @desc Create PayPal order
 * @access Private
 */
router.post('/paypal/create-order', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'USD', tournamentId, playerId, description } = req.body;

    if (!amount || !tournamentId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Amount, tournament ID, and player ID are required'
      });
    }

    const result = await paymentService.createPayPalOrder({
      amount: parseFloat(amount),
      currency,
      tournamentId,
      playerId,
      description
    });

    res.json(result);
  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/paypal/capture-order
 * @desc Capture PayPal order
 * @access Private
 */
router.post('/paypal/capture-order', authenticate, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const result = await paymentService.capturePayPalOrder(orderId);

    res.json(result);
  } catch (error) {
    console.error('PayPal order capture error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/payments/methods
 * @desc Get available payment methods
 * @access Private
 */
router.get('/methods', authenticate, async (req, res) => {
  try {
    const config = paymentService.getPaymentConfig();
    
    const methods = [];
    
    if (config.stripe.configured) {
      methods.push({
        id: 'stripe',
        name: 'Stripe',
        description: 'Credit/Debit cards, Apple Pay, Google Pay',
        icon: '💳',
        supportedCurrencies: ['usd', 'eur', 'gbp', 'cad', 'aud'],
        fees: '2.9% + 30¢ per transaction'
      });
    }
    
    if (config.paypal.configured) {
      methods.push({
        id: 'paypal',
        name: 'PayPal',
        description: 'PayPal account, Credit/Debit cards',
        icon: '🅿️',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        fees: '2.9% + fixed fee per transaction'
      });
    }

    res.json({
      success: true,
      data: {
        methods,
        configured: methods.length > 0
      }
    });
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
