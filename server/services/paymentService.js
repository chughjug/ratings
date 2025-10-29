const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');

class PaymentService {
  constructor() {
    this.stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
    this.paypalConfigured = false;
    
    // Initialize PayPal if configured
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.initializePayPal();
    }
  }

  initializePayPal() {
    try {
      const environment = process.env.NODE_ENV === 'production' 
        ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
        : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
      
      this.paypalClient = new paypal.core.PayPalHttpClient(environment);
      this.paypalConfigured = true;
      console.log('PayPal payment service initialized');
    } catch (error) {
      console.error('Error initializing PayPal:', error);
    }
  }

  /**
   * Get organization commission rate
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>} - Commission rate (0.0 to 1.0)
   */
  async getCommissionRate(organizationId) {
    try {
      const db = require('../database');
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT commission_rate, subscription_plan FROM organizations WHERE id = ?',
          [organizationId],
          (err, row) => {
            if (err) {
              reject(err);
            } else if (row) {
              // Pro users get 0% commission
              const rate = row.subscription_plan === 'pro' ? 0.0 : (row.commission_rate || 0.02);
              resolve(rate);
            } else {
              resolve(0.02); // Default 2% commission
            }
          }
        );
      });
    } catch (error) {
      console.error('Error getting commission rate:', error);
      return 0.02; // Default fallback
    }
  }

  /**
   * Calculate payment amount with commission
   * @param {number} baseAmount - Base payment amount
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} - Payment breakdown
   */
  async calculatePaymentBreakdown(baseAmount, organizationId) {
    try {
      const commissionRate = await this.getCommissionRate(organizationId);
      const commissionAmount = baseAmount * commissionRate;
      const netAmount = baseAmount - commissionAmount;

      return {
        baseAmount,
        commissionRate,
        commissionAmount,
        netAmount,
        isProUser: commissionRate === 0.0
      };
    } catch (error) {
      console.error('Error calculating payment breakdown:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} - Payment intent result
   */
  async createStripePaymentIntent(paymentData) {
    try {
      if (!this.stripeConfigured) {
        throw new Error('Stripe not configured');
      }

      const { amount, currency = 'usd', tournamentId, playerId, description, metadata = {} } = paymentData;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description: description || `Tournament entry fee - ${tournamentId}`,
        metadata: {
          tournamentId,
          playerId,
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      };
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      throw error;
    }
  }

  /**
   * Confirm Stripe payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} - Confirmation result
   */
  async confirmStripePayment(paymentIntentId) {
    try {
      if (!this.stripeConfigured) {
        throw new Error('Stripe not configured');
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          data: {
            paymentIntentId,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata
          }
        };
      } else {
        return {
          success: false,
          error: `Payment not completed. Status: ${paymentIntent.status}`
        };
      }
    } catch (error) {
      console.error('Stripe payment confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Create PayPal order
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} - PayPal order result
   */
  async createPayPalOrder(paymentData) {
    try {
      if (!this.paypalConfigured) {
        throw new Error('PayPal not configured');
      }

      const { amount, currency = 'USD', tournamentId, playerId, description } = paymentData;

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          },
          description: description || `Tournament entry fee - ${tournamentId}`,
          custom_id: `${tournamentId}-${playerId}`
        }]
      });

      const response = await this.paypalClient.execute(request);
      
      return {
        success: true,
        data: {
          orderId: response.result.id,
          status: response.result.status,
          amount: amount,
          currency: currency,
          approvalUrl: response.result.links.find(link => link.rel === 'approve')?.href
        }
      };
    } catch (error) {
      console.error('PayPal order creation failed:', error);
      throw error;
    }
  }

  /**
   * Capture PayPal order
   * @param {string} orderId - PayPal order ID
   * @returns {Promise<Object>} - Capture result
   */
  async capturePayPalOrder(orderId) {
    try {
      if (!this.paypalConfigured) {
        throw new Error('PayPal not configured');
      }

      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});

      const response = await this.paypalClient.execute(request);
      
      return {
        success: true,
        data: {
          orderId: response.result.id,
          status: response.result.status,
          amount: response.result.purchase_units[0].payments.captures[0].amount.value,
          currency: response.result.purchase_units[0].payments.captures[0].amount.currency_code
        }
      };
    } catch (error) {
      console.error('PayPal order capture failed:', error);
      throw error;
    }
  }

  /**
   * Process tournament entry fee payment
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} - Payment processing result
   */
  async processEntryFeePayment(paymentData) {
    try {
      const { method, tournamentId, playerId, amount, currency = 'usd', organizationId } = paymentData;

      // Get organization ID if not provided
      let orgId = organizationId;
      if (!orgId) {
        const db = require('../database');
        const tournament = await new Promise((resolve, reject) => {
          db.get('SELECT organization_id FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        orgId = tournament?.organization_id;
      }

      // Calculate payment breakdown with commission
      const breakdown = await this.calculatePaymentBreakdown(amount, orgId);

      let result;
      switch (method.toLowerCase()) {
        case 'stripe':
          result = await this.createStripePaymentIntent({
            amount: breakdown.baseAmount,
            currency,
            tournamentId,
            playerId,
            description: `Tournament entry fee - ${tournamentId}`,
            metadata: { 
              type: 'entry_fee',
              commission_rate: breakdown.commissionRate,
              commission_amount: breakdown.commissionAmount,
              net_amount: breakdown.netAmount,
              is_pro_user: breakdown.isProUser
            }
          });
          break;
        case 'paypal':
          result = await this.createPayPalOrder({
            amount: breakdown.baseAmount,
            currency: currency.toUpperCase(),
            tournamentId,
            playerId,
            description: `Tournament entry fee - ${tournamentId}`
          });
          break;
        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }

      // Log payment attempt with commission details
      await this.logPaymentAttempt({
        tournamentId,
        playerId,
        organizationId: orgId,
        method,
        amount: breakdown.baseAmount,
        commissionRate: breakdown.commissionRate,
        commissionAmount: breakdown.commissionAmount,
        netAmount: breakdown.netAmount,
        currency,
        status: 'initiated',
        paymentData: result.data
      });

      return {
        ...result,
        breakdown
      };
    } catch (error) {
      console.error('Entry fee payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Process prize distribution payment
   * @param {Object} prizeData - Prize distribution information
   * @returns {Promise<Object>} - Prize payment result
   */
  async processPrizePayment(prizeData) {
    try {
      const { tournamentId, prizes, method = 'stripe' } = prizeData;

      const results = [];
      
      for (const prize of prizes) {
        if (prize.amount > 0) {
          let result;
          switch (method.toLowerCase()) {
            case 'stripe':
              // For prize payments, we might use Stripe Connect or direct transfers
              result = await this.createStripeTransfer({
                amount: prize.amount,
                tournamentId,
                playerId: prize.playerId,
                description: `Prize payment - ${prize.place} place - ${tournamentId}`
              });
              break;
            default:
              throw new Error(`Unsupported prize payment method: ${method}`);
          }
          
          results.push({
            playerId: prize.playerId,
            place: prize.place,
            amount: prize.amount,
            result
          });
        }
      }

      return {
        success: true,
        data: {
          tournamentId,
          totalPrizes: prizes.length,
          successfulPayments: results.filter(r => r.result.success).length,
          results
        }
      };
    } catch (error) {
      console.error('Prize payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Create Stripe transfer (for prize payments)
   * @param {Object} transferData - Transfer information
   * @returns {Promise<Object>} - Transfer result
   */
  async createStripeTransfer(transferData) {
    try {
      if (!this.stripeConfigured) {
        throw new Error('Stripe not configured');
      }

      const { amount, tournamentId, playerId, description } = transferData;

      // This would require Stripe Connect setup for actual transfers
      // For now, we'll simulate the transfer
      const transfer = {
        id: `tr_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: 'usd',
        status: 'pending',
        description
      };

      return {
        success: true,
        data: transfer
      };
    } catch (error) {
      console.error('Stripe transfer creation failed:', error);
      throw error;
    }
  }

  /**
   * Get payment configuration
   * @returns {Object} - Payment configuration
   */
  getPaymentConfig() {
    return {
      stripe: {
        configured: this.stripeConfigured,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      },
      paypal: {
        configured: this.paypalConfigured,
        clientId: process.env.PAYPAL_CLIENT_ID
      }
    };
  }

  /**
   * Log payment attempt
   * @param {Object} paymentLog - Payment log data
   * @returns {Promise<void>}
   */
  async logPaymentAttempt(paymentLog) {
    try {
      // This would integrate with your existing database
      console.log('Payment attempt logged:', {
        ...paymentLog,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging payment attempt:', error);
    }
  }

  /**
   * Get payment history for tournament
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Payment history
   */
  async getPaymentHistory(tournamentId) {
    try {
      // This would integrate with your existing database
      const payments = [
        {
          id: '1',
          tournamentId,
          playerId: 'player1',
          amount: 25.00,
          currency: 'usd',
          method: 'stripe',
          status: 'completed',
          createdAt: new Date().toISOString()
        }
      ];

      return {
        success: true,
        data: payments
      };
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  /**
   * Refund payment
   * @param {string} paymentId - Payment ID
   * @param {number} amount - Refund amount (optional, full refund if not specified)
   * @returns {Promise<Object>} - Refund result
   */
  async refundPayment(paymentId, amount = null) {
    try {
      if (!this.stripeConfigured) {
        throw new Error('Stripe not configured');
      }

      const refundData = {
        payment_intent: paymentId
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);

      return {
        success: true,
        data: {
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status
        }
      };
    } catch (error) {
      console.error('Payment refund failed:', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Payment statistics
   */
  async getPaymentStats(tournamentId) {
    try {
      const history = await this.getPaymentHistory(tournamentId);
      const payments = history.data;

      const stats = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        completedPayments: payments.filter(p => p.status === 'completed').length,
        pendingPayments: payments.filter(p => p.status === 'pending').length,
        failedPayments: payments.filter(p => p.status === 'failed').length,
        methodBreakdown: payments.reduce((acc, p) => {
          acc[p.method] = (acc[p.method] || 0) + 1;
          return acc;
        }, {})
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
