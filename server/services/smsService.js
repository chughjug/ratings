const twilio = require('twilio');
const nodemailer = require('nodemailer');

class SMSService {
  constructor() {
    this.twilioClient = null;
    this.emailTransporter = null;
    this.initializeServices();
  }

  initializeServices() {
    // Initialize Twilio for SMS
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
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
      const whitePlayer = players.find(p => p.id === pairing.white_player_id);
      const blackPlayer = players.find(p => p.id === pairing.black_player_id);

      if (whitePlayer && whitePlayer.phone_number) {
        messages.push({
          phoneNumber: whitePlayer.phone_number,
          playerName: whitePlayer.name,
          message: `🏆 ${tournament.name} - Round ${round} Pairings\n\n` +
                  `You are playing as WHITE against ${blackPlayer?.name || 'TBD'}\n` +
                  `Board: ${pairing.board_number}\n` +
                  `Time Control: ${tournament.time_control}\n` +
                  `Location: ${tournament.location || 'TBD'}\n\n` +
                  `Good luck! 🎯`
        });
      }

      if (blackPlayer && blackPlayer.phone_number) {
        messages.push({
          phoneNumber: blackPlayer.phone_number,
          playerName: blackPlayer.name,
          message: `🏆 ${tournament.name} - Round ${round} Pairings\n\n` +
                  `You are playing as BLACK against ${whitePlayer?.name || 'TBD'}\n` +
                  `Board: ${pairing.board_number}\n` +
                  `Time Control: ${tournament.time_control}\n` +
                  `Location: ${tournament.location || 'TBD'}\n\n` +
                  `Good luck! 🎯`
        });
      }
    });

    return messages;
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
    // This would integrate with your existing database
    // For now, return mock data
    return {
      id: tournamentId,
      name: 'Sample Tournament',
      time_control: 'G/90+30',
      location: 'Chess Club'
    };
  }

  /**
   * Get players with phone numbers
   */
  async getPlayersWithPhoneNumbers(tournamentId) {
    // This would integrate with your existing database
    // For now, return mock data
    return [
      {
        id: '1',
        name: 'John Doe',
        phone_number: '+1234567890'
      },
      {
        id: '2',
        name: 'Jane Smith',
        phone_number: '+1987654321'
      }
    ];
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
