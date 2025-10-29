const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Use environment variables for email configuration
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      console.log('Email service initialized');
    } catch (error) {
      console.error('Error initializing email service:', error);
    }
  }

  /**
   * Send bulk email to multiple recipients
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Send results
   */
  async sendBulkEmail(emailData) {
    try {
      const { campaignId, subject, content, recipients, organizationId } = emailData;
      const db = require('../database');
      
      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };

      // Get organization details for branding
      const organization = await this.getOrganizationDetails(organizationId);

      for (const recipient of recipients) {
        try {
          const emailId = uuidv4();
          
          // Create tracking record
          db.run(
            'INSERT INTO email_tracking (id, campaign_id, recipient_email, recipient_name, status) VALUES (?, ?, ?, ?, ?)',
            [emailId, campaignId, recipient.email, recipient.name, 'sent']
          );

          // Send individual email
          await this.sendIndividualEmail({
            to: recipient.email,
            subject: subject,
            content: content,
            organization: organization,
            trackingId: emailId
          });

          // Update tracking status
          db.run(
            'UPDATE email_tracking SET status = ?, delivered_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['delivered', emailId]
          );

          results.sent++;
        } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
          results.failed++;
          results.errors.push({
            email: recipient.email,
            error: error.message
          });

          // Update tracking status
          db.run(
            'UPDATE email_tracking SET status = ?, bounce_reason = ? WHERE campaign_id = ? AND recipient_email = ?',
            ['failed', error.message, campaignId, recipient.email]
          );
        }
      }

      return results;
    } catch (error) {
      console.error('Bulk email sending failed:', error);
      throw error;
    }
  }

  /**
   * Send individual email
   * @param {Object} emailData - Individual email data
   * @returns {Promise<void>}
   */
  async sendIndividualEmail(emailData) {
    try {
      const { to, subject, content, organization, trackingId } = emailData;

      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      // Create branded email content
      const brandedContent = this.createBrandedEmail(content, organization, trackingId);

      const mailOptions = {
        from: organization?.contact_email || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: to,
        subject: subject,
        html: brandedContent,
        headers: {
          'X-Tracking-ID': trackingId
        }
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Individual email sending failed:', error);
      throw error;
    }
  }

  /**
   * Create branded email content
   * @param {string} content - Original content
   * @param {Object} organization - Organization details
   * @param {string} trackingId - Tracking ID for analytics
   * @returns {string} - Branded HTML content
   */
  createBrandedEmail(content, organization, trackingId) {
    const logoHtml = organization?.logo_url 
      ? `<img src="${organization.logo_url}" alt="${organization.name}" style="max-height: 60px; margin-bottom: 20px;">`
      : '';

    const footerHtml = organization?.website 
      ? `<p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
           Visit us at <a href="${organization.website}">${organization.website}</a>
         </p>`
      : '';

    // Add tracking pixel for open tracking
    const trackingPixel = `<img src="${process.env.APP_URL || 'http://localhost:5000'}/api/email-tracking/pixel/${trackingId}" width="1" height="1" style="display:none;">`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${organization?.name || 'Chess Club'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          ${logoHtml}
          <h1 style="color: #2c3e50; margin: 0;">${organization?.name || 'Chess Club'}</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          ${content}
        </div>
        
        ${footerHtml}
        ${trackingPixel}
      </body>
      </html>
    `;
  }

  /**
   * Get organization details
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} - Organization details
   */
  async getOrganizationDetails(organizationId) {
    const db = require('../database');
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM organizations WHERE id = ?',
        [organizationId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  /**
   * Track email opens
   * @param {string} trackingId - Tracking ID
   * @returns {Promise<void>}
   */
  async trackEmailOpen(trackingId) {
    try {
      const db = require('../database');
      
      db.run(
        'UPDATE email_tracking SET opened_at = CURRENT_TIMESTAMP WHERE id = ? AND opened_at IS NULL',
        [trackingId]
      );
    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  }

  /**
   * Track email clicks
   * @param {string} trackingId - Tracking ID
   * @param {string} url - Clicked URL
   * @returns {Promise<void>}
   */
  async trackEmailClick(trackingId, url) {
    try {
      const db = require('../database');
      
      db.run(
        'UPDATE email_tracking SET clicked_at = CURRENT_TIMESTAMP WHERE id = ?',
        [trackingId]
      );
    } catch (error) {
      console.error('Error tracking email click:', error);
    }
  }

  /**
   * Get email analytics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} - Analytics data
   */
  async getEmailAnalytics(organizationId) {
    try {
      const db = require('../database');
      
      return new Promise((resolve, reject) => {
        db.all(
          `SELECT 
            ec.id,
            ec.subject,
            ec.sent_at,
            ec.total_recipients,
            COUNT(et.id) as delivered_count,
            SUM(CASE WHEN et.opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened_count,
            SUM(CASE WHEN et.clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked_count
           FROM email_campaigns ec
           LEFT JOIN email_tracking et ON ec.id = et.campaign_id
           WHERE ec.organization_id = ?
           GROUP BY ec.id
           ORDER BY ec.sent_at DESC`,
          [organizationId],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error getting email analytics:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
