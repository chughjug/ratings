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
router.post('/stripe/create-checkout', async (req, res) => {
  try {
    const { amount, currency = 'usd', tournamentId, playerId, description, successUrl, cancelUrl } = req.body;

    if (!amount || !tournamentId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Amount, tournament ID, and player ID are required'
      });
    }

    // Get tournament with payment credentials
    const db = require('../database');
    db.get(
      `SELECT stripe_publishable_key, stripe_secret_key FROM tournaments WHERE id = ?`,
      [tournamentId],
      async (err, tournament) => {
        if (err || !tournament) {
          console.error('Tournament not found or error:', err);
          return res.status(404).json({
            success: false,
            error: 'Tournament not found'
          });
        }

        // Check if tournament has Stripe credentials
        if (!tournament.stripe_secret_key) {
          return res.status(400).json({
            success: false,
            error: 'Stripe not configured for this tournament'
          });
        }

        try {
          // Create Stripe client with tournament-specific credentials
          const stripe = require('stripe')(tournament.stripe_secret_key);
          
          // Create a Checkout Session (hosted by Stripe, redirects user)
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency,
                product_data: {
                  name: description || `Entry fee for tournament ${tournamentId}`,
                },
                unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl || `${req.protocol}://${req.get('host')}/registration/${tournamentId}?success=true`,
            cancel_url: cancelUrl || `${req.protocol}://${req.get('host')}/registration/${tournamentId}?canceled=true`,
            metadata: {
              tournamentId,
              playerId,
            }
          });

          res.json({
            success: true,
            data: {
              checkoutUrl: session.url,
              sessionId: session.id,
            }
          });
        } catch (error) {
          console.error('Stripe checkout creation error:', error);
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );
  } catch (error) {
    console.error('Stripe checkout creation error:', error);
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
router.post('/paypal/create-checkout', async (req, res) => {
  try {
    const { amount, currency = 'USD', tournamentId, playerId, description, successUrl, cancelUrl } = req.body;

    if (!amount || !tournamentId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Amount, tournament ID, and player ID are required'
      });
    }

    // Get tournament with payment credentials
    const db = require('../database');
    db.get(
      `SELECT paypal_client_id, paypal_secret FROM tournaments WHERE id = ?`,
      [tournamentId],
      async (err, tournament) => {
        if (err || !tournament) {
          console.error('Tournament not found or error:', err);
          return res.status(404).json({
            success: false,
            error: 'Tournament not found'
          });
        }

        // Check if tournament has PayPal credentials
        if (!tournament.paypal_client_id || !tournament.paypal_secret) {
          return res.status(400).json({
            success: false,
            error: 'PayPal not configured for this tournament'
          });
        }

        try {
          // Create PayPal order using tournament-specific credentials
          const paypal = require('@paypal/checkout-server-sdk');
          const environment = new paypal.core.SandboxEnvironment(
            tournament.paypal_client_id,
            tournament.paypal_secret
          );
          const client = new paypal.core.PayPalHttpClient(environment);

          const request = new paypal.orders.OrdersCreateRequest();
          request.prefer("return=representation");
          request.requestBody = {
            intent: "CAPTURE",
            purchase_units: [{
              amount: {
                currency_code: currency,
                value: parseFloat(amount).toFixed(2)
              },
              description: description || `Tournament entry fee - ${tournamentId}`,
              custom_id: `tournament_${tournamentId}_player_${playerId}`
            }],
            application_context: {
              brand_name: 'Chess Tournament',
              landing_page: 'BILLING',
              user_action: 'PAY_NOW',
              return_url: successUrl || `${req.protocol}://${req.get('host')}/registration/${tournamentId}?success=true&method=paypal`,
              cancel_url: cancelUrl || `${req.protocol}://${req.get('host')}/registration/${tournamentId}?canceled=true`
            }
          };

          const response = await client.execute(request);
          
          // Find the approval URL from the links
          const approvalUrl = response.result.links.find(link => link.rel === 'approve')?.href;
          
          res.json({
            success: true,
            data: {
              checkoutUrl: approvalUrl,
              orderId: response.result.id,
              status: response.result.status
            }
          });
        } catch (error) {
          console.error('PayPal checkout creation error:', error);
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );
  } catch (error) {
    console.error('PayPal checkout creation error:', error);
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
router.post('/paypal/capture-order', async (req, res) => {
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

/**
 * @route GET /api/payments/connect/stripe
 * @desc Get Stripe OAuth URL for connecting account
 * @access Private
 */
router.get('/connect/stripe', authenticate, async (req, res) => {
  try {
    const { organizationId, mode = 'test' } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    // Create Stripe OAuth URL
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const state = `org_${organizationId}_${mode}`;
    
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.STRIPE_CLIENT_ID}&` +
      `scope=read_write&` +
      `redirect_uri=${encodeURIComponent(process.env.STRIPE_REDIRECT_URI || '')}&` +
      `state=${state}`;

    res.json({
      success: true,
      data: {
        oauthUrl
      }
    });
  } catch (error) {
    console.error('Stripe connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/payments/connect/paypal
 * @desc Get PayPal OAuth URL for connecting account
 * @access Private
 */
router.get('/connect/paypal', authenticate, async (req, res) => {
  try {
    const { organizationId, mode = 'test' } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    // For PayPal, we'll use their REST API
    // In a real implementation, you'd generate an OAuth URL
    const state = `org_${organizationId}_${mode}`;
    
    // Simplified - in production you'd use PayPal's actual OAuth flow
    const oauthUrl = mode === 'live' 
      ? `https://www.paypal.com/connect/?flowEntry=static&client_id=${process.env.PAYPAL_CLIENT_ID}&scope=openid&redirect_uri=${encodeURIComponent(process.env.PAYPAL_REDIRECT_URI || '')}&state=${state}`
      : `https://www.sandbox.paypal.com/connect/?flowEntry=static&client_id=${process.env.PAYPAL_CLIENT_ID}&scope=openid&redirect_uri=${encodeURIComponent(process.env.PAYPAL_REDIRECT_URI || '')}&state=${state}`;

    res.json({
      success: true,
      data: {
        oauthUrl
      }
    });
  } catch (error) {
    console.error('PayPal connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/callback/stripe
 * @desc Handle Stripe OAuth callback
 * @access Private
 */
router.post('/callback/stripe', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code and state are required'
      });
    }

    // Parse state to get organization ID and mode
    const [organizationId, mode] = state.split('_').slice(1);

    // Exchange code for access token with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const tokenResponse = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code
    });

    // Store payment configuration
    const db = require('../database');
    const { v4: uuidv4 } = require('uuid');
    
    const configId = uuidv4();
    db.run(
      `INSERT OR REPLACE INTO payment_configurations 
       (id, organization_id, provider, account_id, account_email, access_token_encrypted, is_active, is_production, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        configId,
        organizationId,
        'stripe',
        tokenResponse.stripe_user_id,
        tokenResponse.stripe_publishable_key,
        tokenResponse.access_token,
        1,
        mode === 'live' ? 1 : 0
      ]
    );

    // Update organization settings
    const paymentSettings = {
      stripe: {
        accountId: tokenResponse.stripe_user_id,
        connected: true,
        testMode: mode !== 'live',
        connectedAt: new Date().toISOString()
      }
    };

    db.run(
      `UPDATE organizations SET payment_settings = ? WHERE id = ?`,
      [JSON.stringify(paymentSettings), organizationId]
    );

    res.json({
      success: true,
      message: 'Stripe account connected successfully'
    });
  } catch (error) {
    console.error('Stripe callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/callback/paypal
 * @desc Handle PayPal OAuth callback
 * @access Private
 */
router.post('/callback/paypal', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code and state are required'
      });
    }

    // Parse state to get organization ID and mode
    const [organizationId, mode] = state.split('_').slice(1);

    // In production, exchange code for access token with PayPal
    // For now, we'll create a mock configuration
    
    const db = require('../database');
    const { v4: uuidv4 } = require('uuid');
    
    const configId = uuidv4();
    db.run(
      `INSERT OR REPLACE INTO payment_configurations 
       (id, organization_id, provider, account_id, is_active, is_production, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        configId,
        organizationId,
        'paypal',
        `paypal_${Date.now()}`,
        1,
        mode === 'live' ? 1 : 0
      ]
    );

    // Update organization settings
    const paymentSettings = {
      paypal: {
        accountId: `paypal_${Date.now()}`,
        connected: true,
        testMode: mode !== 'live',
        connectedAt: new Date().toISOString()
      }
    };

    db.run(
      `UPDATE organizations SET payment_settings = ? WHERE id = ?`,
      [JSON.stringify(paymentSettings), organizationId]
    );

    res.json({
      success: true,
      message: 'PayPal account connected successfully'
    });
  } catch (error) {
    console.error('PayPal callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/payments/disconnect/:provider
 * @desc Disconnect payment provider
 * @access Private
 */
router.post('/disconnect/:provider', authenticate, async (req, res) => {
  try {
    const { provider } = req.params;
    const { organizationId } = req.body;

    if (!['stripe', 'paypal'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment provider'
      });
    }

    const db = require('../database');
    
    // Remove payment configuration
    db.run(
      `DELETE FROM payment_configurations WHERE organization_id = ? AND provider = ?`,
      [organizationId, provider]
    );

    // Update organization settings
    db.get(
      `SELECT payment_settings FROM organizations WHERE id = ?`,
      [organizationId],
      (err, row) => {
        if (!err && row) {
          const paymentSettings = row.payment_settings ? JSON.parse(row.payment_settings) : {};
          delete paymentSettings[provider];
          
          db.run(
            `UPDATE organizations SET payment_settings = ? WHERE id = ?`,
            [JSON.stringify(paymentSettings), organizationId]
          );
        }
      }
    );

    res.json({
      success: true,
      message: `${provider.toUpperCase()} account disconnected successfully`
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
