const twilio = require('twilio');
const nodemailer = require('nodemailer');

class SMSService {
  constructor() {
    this.twilioClient = null;
    this.emailTransporter = null;
    this.initializeServices();
  }

  initializeServices() {
    // Initialize Twilio for SMS - use environment variables as default
    // Can be overridden per-tournament
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    }

    // Initialize email transporter for SMS fallback
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  /**
   * Send SMS notification to a single phone number
   * @param {string} phoneNumber - Phone number in E.164 format
   * @param {string} message - SMS message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of SMS sending
   */
  async sendSMS(phoneNumber, message, options = {}) {
    try {
      // Validate phone number
      if (!this.isValidPhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Format phone number to E.164
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      // Check if Twilio is available
      if (this.twilioClient) {
        return await this.sendViaTwilio(formattedNumber, message, options);
      } else {
        // Fallback to email if SMS not configured
        return await this.sendViaEmail(formattedNumber, message, options);
      }
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendViaTwilio(phoneNumber, message, options) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
        ...options
      });

      return {
        success: true,
        method: 'twilio',
        messageId: result.sid,
        status: result.status,
        cost: result.price,
        phoneNumber: phoneNumber
      };
    } catch (error) {
      console.error('Twilio SMS failed:', error);
      throw error;
    }
  }

  /**
   * Send SMS via email fallback (for testing or when SMS not available)
   */
  async sendViaEmail(phoneNumber, message, options) {
    try {
      const emailMessage = {
        from: process.env.SMTP_USER,
        to: process.env.SMS_FALLBACK_EMAIL || process.env.SMTP_USER,
        subject: `SMS to ${phoneNumber}`,
        text: `SMS Message to ${phoneNumber}:\n\n${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h3>SMS Message</h3>
            <p><strong>To:</strong> ${phoneNumber}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 3px; margin: 10px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p><em>This is an email fallback for SMS notification.</em></p>
          </div>
        `
      };

      const result = await this.emailTransporter.sendMail(emailMessage);
      
      return {
        success: true,
        method: 'email_fallback',
        messageId: result.messageId,
        status: 'sent',
        phoneNumber: phoneNumber
      };
    } catch (error) {
      console.error('Email fallback failed:', error);
      throw error;
    }
  }

  /**
   * Send bulk SMS notifications
   * @param {Array} recipients - Array of {phoneNumber, message, playerName}
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Bulk sending results
   */
  async sendBulkSMS(recipients, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: recipients.length,
      successCount: 0,
      failureCount: 0
    };

    // Process in batches to avoid rate limits
    const batchSize = options.batchSize || 10;
    const delay = options.delay || 1000; // 1 second delay between batches

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await this.sendSMS(recipient.phoneNumber, recipient.message, {
            ...options,
            playerName: recipient.playerName
          });
          
          results.successful.push({
            ...recipient,
            result
          });
          results.successCount++;
          
          return result;
        } catch (error) {
          results.failed.push({
            ...recipient,
            error: error.message
          });
          results.failureCount++;
          
          return null;
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Send tournament-specific notifications
   * @param {string} tournamentId - Tournament ID
   * @param {string} notificationType - Type of notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Notification results
   */
  async sendTournamentNotification(tournamentId, notificationType, data = {}) {
    try {
      // Get tournament data
      const tournament = await this.getTournamentData(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Get players with phone numbers
      const players = await this.getPlayersWithPhoneNumbers(tournamentId);
      
      // Generate messages based on notification type
      const messages = this.generateNotificationMessages(tournament, players, notificationType, data);
      
      // Send notifications
      const results = await this.sendBulkSMS(messages, {
        tournamentId,
        notificationType
      });

      // Log notification
      await this.logNotification(tournamentId, notificationType, results);

      return results;
    } catch (error) {
      console.error('Tournament notification failed:', error);
      throw error;
    }
  }

  /**
   * Generate notification messages based on type
   */
  generateNotificationMessages(tournament, players, notificationType, data) {
    const messages = [];

    switch (notificationType) {
      case 'pairings_ready':
        messages.push(...this.generatePairingsMessages(tournament, players, data));
        break;
      case 'round_started':
        messages.push(...this.generateRoundStartedMessages(tournament, players, data));
        break;
      case 'results_posted':
        messages.push(...this.generateResultsMessages(tournament, players, data));
        break;
      case 'tournament_reminder':
        messages.push(...this.generateReminderMessages(tournament, players, data));
        break;
      case 'custom':
        messages.push(...this.generateCustomMessages(tournament, players, data));
        break;
      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }

    return messages;
  }

  /**
   * Generate pairings notification messages
   */
  generatePairingsMessages(tournament, players, data) {
    const { round, pairings } = data;
    const messages = [];

    pairings.forEach(pairing => {
      // Find players in pairing
      const whitePlayer = players[pairing.white_player_id];
      const blackPlayer = players[pairing.black_player_id];

      // Create concise messages within 160 character limit for trial accounts
      const tournamentName = tournament.name.length > 25 ? tournament.name.substring(0, 22) + '...' : tournament.name;
      const opponentName = (blackPlayer?.name || whitePlayer?.name || 'TBD');
      const shortOpponent = opponentName.length > 15 ? opponentName.substring(0, 12) + '...' : opponentName;
      const boardNum = pairing.board || pairing.board_number;
      
      if (whitePlayer && whitePlayer.phone_number) {
        messages.push({
          phoneNumber: whitePlayer.phone_number,
          playerName: whitePlayer.name,
          message: `🏆 R${round} WHITE vs ${shortOpponent} Board ${boardNum}`
        });
      }

      if (blackPlayer && blackPlayer.phone_number) {
        messages.push({
          phoneNumber: blackPlayer.phone_number,
          playerName: blackPlayer.name,
          message: `🏆 R${round} BLACK vs ${shortOpponent} Board ${boardNum}`
        });
      }
    });

    return messages;
  }

  /**
   * Get Twilio client for a tournament (use tournament credentials if available, else fall back to environment)
   */
  getTwilioClientForTournament(tournament) {
    // Check if tournament has its own Twilio credentials
    if (tournament.twilio_account_sid && tournament.twilio_auth_token && tournament.sms_notifications_enabled) {
      console.log('[SMS] Using tournament-specific Twilio credentials');
      return {
        client: twilio(tournament.twilio_account_sid, tournament.twilio_auth_token),
        phoneNumber: tournament.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER,
        source: 'tournament'
      };
    }
    
    // Fall back to environment variables
    if (this.twilioClient) {
      console.log('[SMS] Using environment Twilio credentials');
      return {
        client: this.twilioClient,
        phoneNumber: this.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER,
        source: 'environment'
      };
    }
    
    return null;
  }

  /**
   * Send pairing notifications for a specific tournament round
   * @param {string} tournamentId - Tournament ID
   * @param {number} round - Round number
   * @param {Array} pairings - Array of pairings with player info
   * @returns {Promise<Object>} - Notification results
   */
  async sendPairingNotifications(tournamentId, round, pairings) {
    try {
      // Get tournament data
      const tournament = await this.getTournamentData(tournamentId);
      
      // Check if SMS is enabled for this tournament
      if (!tournament.sms_notifications_enabled && !this.twilioClient) {
        console.log('[SMS Notifications] SMS not enabled for tournament and no global Twilio config');
        return {
          success: true,
          message: 'SMS notifications not enabled',
          sentCount: 0,
          failedCount: 0
        };
      }
      
      // Get Twilio client (tournament-specific or environment)
      const twilioConfig = this.getTwilioClientForTournament(tournament);
      
      if (!twilioConfig) {
        console.log('[SMS Notifications] No Twilio credentials configured');
        return {
          success: true,
          message: 'No Twilio credentials configured',
          sentCount: 0,
          failedCount: 0
        };
      }
      
      // Get player IDs from pairings
      const playerIds = [];
      pairings.forEach(p => {
        if (p.white_player_id) playerIds.push(p.white_player_id);
        if (p.black_player_id) playerIds.push(p.black_player_id);
      });
      
      // Get players with phone numbers
      const playersMap = await this.getPlayersByIdsWithPhones(tournamentId, playerIds);
      
      if (Object.keys(playersMap).length === 0) {
        console.log('[SMS Notifications] No players with phone numbers found');
        return {
          success: true,
          message: 'No players with phone numbers found',
          sentCount: 0,
          failedCount: 0
        };
      }
      
      // Generate messages
      const messages = this.generatePairingsMessages(tournament, playersMap, { round, pairings });
      
      if (messages.length === 0) {
        console.log('[SMS Notifications] No messages to send');
        return {
          success: true,
          message: 'No messages to send',
          sentCount: 0,
          failedCount: 0
        };
      }
      
      // Send messages in bulk with tournament-specific Twilio client
      const results = await this.sendBulkSMSWithClient(messages, twilioConfig, {
        tournamentId,
        round,
        batchSize: 5,
        delay: 500
      });
      
      console.log(`[SMS Notifications] Sent ${results.successCount} of ${results.total} messages for Round ${round}`);
      
      return {
        success: true,
        sentCount: results.successCount,
        failedCount: results.failureCount,
        total: results.total,
        results: results
      };
    } catch (error) {
      console.error('[SMS Notifications] Error sending pairing notifications:', error);
      throw error;
    }
  }
  
  /**
   * Send bulk SMS with a specific Twilio client
   */
  async sendBulkSMSWithClient(recipients, twilioConfig, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: recipients.length,
      successCount: 0,
      failureCount: 0
    };

    const batchSize = options.batchSize || 10;
    const delay = options.delay || 1000;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await twilioConfig.client.messages.create({
            body: recipient.message,
            from: twilioConfig.phoneNumber,
            to: recipient.phoneNumber
          });
          
          results.successful.push({
            ...recipient,
            result: {
              success: true,
              messageId: result.sid,
              status: result.status
            }
          });
          results.successCount++;
          
          return result;
        } catch (error) {
          results.failed.push({
            ...recipient,
            error: error.message
          });
          results.failureCount++;
          
          return null;
        }
      });

      await Promise.all(batchPromises);

      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Generate round started messages
   */
  generateRoundStartedMessages(tournament, players, data) {
    const { round } = data;
    const messages = [];

    players.forEach(player => {
      if (player.phone_number) {
        messages.push({
          phoneNumber: player.phone_number,
          playerName: player.name,
          message: `🚀 ${tournament.name} - Round ${round} Started!\n\n` +
                  `Round ${round} is now underway.\n` +
                  `Check the standings and pairings at:\n` +
                  `${process.env.FRONTEND_URL}/tournaments/${tournament.id}\n\n` +
                  `Good luck! 🎯`
        });
      }
    });

    return messages;
  }

  /**
   * Generate results posted messages
   */
  generateResultsMessages(tournament, players, data) {
    const { round } = data;
    const messages = [];

    players.forEach(player => {
      if (player.phone_number) {
        messages.push({
          phoneNumber: player.phone_number,
          playerName: player.name,
          message: `📊 ${tournament.name} - Round ${round} Results Posted\n\n` +
                  `Round ${round} results are now available.\n` +
                  `Check your standings at:\n` +
                  `${process.env.FRONTEND_URL}/tournaments/${tournament.id}\n\n` +
                  `Keep up the great work! 🎯`
        });
      }
    });

    return messages;
  }

  /**
   * Generate reminder messages
   */
  generateReminderMessages(tournament, players, data) {
    const { reminderType, customMessage } = data;
    const messages = [];

    let message = '';
    switch (reminderType) {
      case 'registration_deadline':
        message = `⏰ ${tournament.name} - Registration Reminder\n\n` +
                 `Registration closes soon!\n` +
                 `Don't miss out on this great tournament.\n\n` +
                 `Register at: ${process.env.FRONTEND_URL}/tournaments/${tournament.id}`;
        break;
      case 'tournament_start':
        message = `🏆 ${tournament.name} - Tournament Starting Soon\n\n` +
                 `The tournament begins in 1 hour!\n` +
                 `Please arrive early to check in.\n\n` +
                 `Location: ${tournament.location || 'TBD'}`;
        break;
      case 'custom':
        message = customMessage || `📢 ${tournament.name} - Important Update\n\n` +
                 `Please check the tournament page for updates.`;
        break;
    }

    players.forEach(player => {
      if (player.phone_number) {
        messages.push({
          phoneNumber: player.phone_number,
          playerName: player.name,
          message: message
        });
      }
    });

    return messages;
  }

  /**
   * Generate custom messages
   */
  generateCustomMessages(tournament, players, data) {
    const { message, includePlayerName } = data;
    const messages = [];

    players.forEach(player => {
      if (player.phone_number) {
        let customMessage = message;
        if (includePlayerName) {
          customMessage = `Hi ${player.name},\n\n${message}`;
        }

        messages.push({
          phoneNumber: player.phone_number,
          playerName: player.name,
          message: customMessage
        });
      }
    });

    return messages;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber) {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assume US +1)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    // Add + prefix
    return '+' + cleaned;
  }

  /**
   * Get tournament data from database
   */
  async getTournamentData(tournamentId) {
    const db = require('../database');
    
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) {
          console.error('Error fetching tournament:', err);
          reject(err);
        } else if (!row) {
          reject(new Error('Tournament not found'));
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get players with phone numbers
   */
  async getPlayersWithPhoneNumbers(tournamentId) {
    const db = require('../database');
    
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name, phone FROM players WHERE tournament_id = ? AND phone IS NOT NULL AND phone != ""',
        [tournamentId],
        (err, rows) => {
          if (err) {
            console.error('Error fetching players:', err);
            reject(err);
          } else {
            // Format phone numbers to E.164
            const players = rows.map(row => ({
              id: row.id,
              name: row.name,
              phone_number: row.phone
            }));
            resolve(players);
          }
        }
      );
    });
  }

  /**
   * Get players by IDs with phone numbers
   */
  async getPlayersByIdsWithPhones(tournamentId, playerIds) {
    const db = require('../database');
    
    return new Promise((resolve, reject) => {
      const placeholders = playerIds.map(() => '?').join(',');
      db.all(
        `SELECT id, name, phone FROM players WHERE tournament_id = ? AND id IN (${placeholders}) AND phone IS NOT NULL AND phone != ""`,
        [tournamentId, ...playerIds],
        (err, rows) => {
          if (err) {
            console.error('Error fetching players:', err);
            reject(err);
          } else {
            const playersMap = {};
            rows.forEach(row => {
              playersMap[row.id] = {
                id: row.id,
                name: row.name,
                phone_number: row.phone
              };
            });
            resolve(playersMap);
          }
        }
      );
    });
  }

  /**
   * Log notification for audit trail
   */
  async logNotification(tournamentId, notificationType, results) {
    // This would integrate with your existing audit system
    console.log('SMS Notification logged:', {
      tournamentId,
      notificationType,
      timestamp: new Date().toISOString(),
      results
    });
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      return {
        messageId: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        price: message.price,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      console.error('Failed to get delivery status:', error);
      throw error;
    }
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(startDate, endDate) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    try {
      const messages = await this.twilioClient.messages.list({
        dateSentAfter: startDate,
        dateSentBefore: endDate
      });

      const stats = {
        totalMessages: messages.length,
        sent: messages.filter(m => m.status === 'sent').length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        failed: messages.filter(m => m.status === 'failed').length,
        totalCost: messages.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      throw error;
    }
  }
}

module.exports = new SMSService();

