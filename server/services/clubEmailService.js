const nodemailer = require('nodemailer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Club Email Service
 * Handles white-label email sending for clubs
 * Includes email tracking for opens, deliveries, and clicks
 */
class ClubEmailService {
  constructor(db) {
    this.db = db;
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configure based on environment
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // Fallback to test mode (console logging only)
      this.transporter = {
        sendMail: async (mailOptions) => {
          console.log('📧 Email would be sent (test mode):', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            from: mailOptions.from
          });
          return {
            messageId: 'test-' + Date.now(),
            accepted: [mailOptions.to],
            rejected: [],
            pending: [],
            response: '250 OK'
          };
        }
      };
    }
  }

  /**
   * Get organization branding for email
   */
  async getOrganizationBranding(organizationId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT name, logo_url, contact_email, website, settings FROM organizations WHERE id = ?',
        [organizationId],
        (err, org) => {
          if (err) reject(err);
          else {
            let settings = {};
            if (org && org.settings) {
              try {
                settings = JSON.parse(org.settings);
              } catch (e) {
                // Ignore parse errors
              }
            }
            resolve({
              name: org?.name || 'Chess Club',
              logoUrl: org?.logo_url,
              contactEmail: org?.contact_email || org?.contact_email,
              website: org?.website,
              primaryColor: settings.branding?.primaryColor || '#3b82f6',
              secondaryColor: settings.branding?.secondaryColor || '#8b5cf6',
              googleAppsScriptUrl: 'https://script.google.com/macros/s/AKfycbz22u1io0BcKfLFNd4wu3kJJzDGZVXPZEEMhtKRXNrDxWVc05dytoL8wEAXwoHtD9OTTA/exec'
            });
          }
        }
      );
    });
  }

  /**
   * Send email via Google Apps Script webhook/web app
   */
  async sendViaGoogleAppsScript(recipient, subject, plainTextBody, htmlContent, branding, headerText = 'Club Announcement') {
    if (!branding.googleAppsScriptUrl) {
      throw new Error('Google Apps Script URL not configured');
    }

    const webhookUrl = branding.googleAppsScriptUrl;
    const payload = {
      recipient: recipient,
      subject: subject,
      plainTextBody: plainTextBody || htmlContent.replace(/<[^>]*>/g, ''),
      htmlBodyContent: htmlContent,
      headerText: headerText || 'Club Announcement',
      organizationName: branding.name || 'Chess Club',
      logoUrl: branding.logoUrl || 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/new-logo.png'
    };

    console.log(`📧 Sending email via webhook to ${recipient} using ${webhookUrl}`);
    console.log(`📧 Payload:`, { ...payload, htmlBodyContent: payload.htmlBodyContent.substring(0, 100) + '...' });

    try {
      // Google Apps Script webhooks may return HTML error pages or JSON
      // We need to handle both cases
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30 second timeout
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });

      // Check if response is JSON
      if (typeof response.data === 'object' && response.data !== null) {
        if (response.data.success === true) {
          console.log(`✅ Webhook success: ${response.data.message || 'Email sent successfully'}`);
          return true;
        } else {
          const errorMsg = response.data.error || response.data.message || 'Unknown error';
          console.error(`❌ Webhook returned error: ${errorMsg}`);
          throw new Error(`Webhook error: ${errorMsg}`);
        }
      } else if (typeof response.data === 'string') {
        // Try to parse as JSON if it's a string
        try {
          const parsed = JSON.parse(response.data);
          if (parsed.success === true) {
            console.log(`✅ Webhook returned JSON success: ${parsed.message || 'Email sent'}`);
            return true;
          }
          throw new Error(parsed.error || parsed.message || 'Unknown error');
        } catch (parseError) {
          // Check if it's an HTML error page
          const responseLower = response.data.toLowerCase();
          if (responseLower.includes('script function not found') || 
              responseLower.includes('doPost') || 
              responseLower.includes('doGet') ||
              responseLower.includes('page not found') ||
              responseLower.includes('unable to open') ||
              responseLower.includes('<title>error</title>') ||
              responseLower.includes('error message')) {
            console.error('❌ Webhook returned HTML error page:', response.data.substring(0, 500));
            throw new Error(`Webhook returned error page. Response preview: ${response.data.substring(0, 300)}`);
          }
          
          // If it's HTML but not an obvious error, log it but don't assume success
          if (response.data.includes('<html') || response.data.includes('<!DOCTYPE')) {
            console.warn('⚠️ Webhook returned HTML (non-error page). This might indicate a deployment issue.');
            console.warn('Response preview:', response.data.substring(0, 500));
            // Still throw an error so it can be handled properly
            throw new Error('Webhook returned unexpected HTML response. Please verify the script is deployed correctly.');
          }
          
          // If no obvious error and not HTML, assume success
          console.log(`✅ Webhook returned non-JSON response (assuming success)`);
          return true;
        }
      }

      // Default: assume success if we got a response
      console.log(`✅ Webhook response received (status ${response.status})`);
      return true;

    } catch (error) {
      console.error('❌ Google Apps Script webhook error:', {
        message: error.message,
        response: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data.substring(0, 500) : error.response.data) : null,
        status: error.response?.status,
        url: webhookUrl
      });
      
      // Provide more helpful error message
      if (error.response?.data) {
        const responseData = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        
        if (responseData.includes('doPost') || responseData.includes('doGet') || responseData.includes('Script function not found')) {
          throw new Error('Google Apps Script error: Script functions (doPost/doGet) not found. The script needs to be updated. Steps: 1) Copy ALL code from server/scripts/google-apps-script-email-template.js, 2) Paste it into your Google Apps Script project (replace ALL existing code), 3) Click Save, 4) Deploy as web app: Deploy > New deployment > Web app > Execute as "Me" > Access "Anyone" > Deploy, 5) Copy the new web app URL and update it in the backend if it changed.');
        }
        
        if (responseData.includes('Page Not Found') || responseData.includes('unable to open the file')) {
          throw new Error('Google Apps Script deployment error: The script appears to not be deployed or accessible. Please: 1) Open your Google Apps Script project, 2) Make sure the doPost function is saved, 3) Deploy it as a web app (Deploy > New deployment), 4) Ensure "Execute as: Me" and "Who has access: Anyone" are selected.');
        }
        
        if (responseData.includes('Error')) {
          const errorMatch = responseData.match(/<div[^>]*class="errorMessage"[^>]*>([^<]+)/i);
          if (errorMatch) {
            throw new Error(`Google Apps Script error: ${errorMatch[1]}. Please check your script and deployment.`);
          }
        }
        
        // Try to parse as JSON error
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error || parsed.message) {
            throw new Error(`Webhook error: ${parsed.error || parsed.message}`);
          }
        } catch (parseError) {
          // Not JSON, continue with HTML error handling
        }
        
        throw new Error(`Google Apps Script webhook error: ${responseData.substring(0, 300)}`);
      }
      
      // Network or timeout errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error(`Failed to connect to Google Apps Script webhook. Please verify the URL is correct and the script is deployed: ${webhookUrl}`);
      }
      
      throw new Error(`Failed to send via webhook: ${error.message}`);
    }
  }

  /**
   * Generate tracking token
   */
  generateTrackingToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Wrap email content with white-label template
   */
  wrapEmailContent(htmlContent, branding, campaignId, trackingToken) {
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    const trackingPixel = `${baseUrl}/api/club-email/track/${trackingToken}/open.png`;
    
    // Replace all links with tracked links
    const trackedContent = htmlContent.replace(
      /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi,
      (match, before, url, after) => {
        // Skip if already a tracking link
        if (url.includes('/api/club-email/track/')) {
          return match;
        }
        const trackedUrl = `${baseUrl}/api/club-email/track/${trackingToken}/click?url=${encodeURIComponent(url)}`;
        return `<a ${before}${trackedUrl}${after}>`;
      }
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .email-header {
      background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .email-header img {
      max-height: 60px;
      margin-bottom: 10px;
    }
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 30px 20px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .email-footer a {
      color: ${branding.primaryColor};
      text-decoration: none;
    }
    .email-footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.name}" />` : ''}
      <h1>${branding.name}</h1>
    </div>
    <div class="email-body">
      ${trackedContent}
    </div>
    <div class="email-footer">
      ${branding.website ? `<p><a href="${branding.website}">Visit our website</a></p>` : ''}
      ${branding.contactEmail ? `<p>Contact: <a href="mailto:${branding.contactEmail}">${branding.contactEmail}</a></p>` : ''}
      <p style="margin-top: 15px; color: #9ca3af;">
        You are receiving this email because you are a member of ${branding.name}.
        <br>
        <a href="${baseUrl}/api/club-email/unsubscribe/${trackingToken}" style="color: #6b7280;">Unsubscribe</a>
      </p>
    </div>
  </div>
  <!-- Tracking pixel -->
  <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`;
  }

  /**
   * Send email campaign to club members
   */
  async sendCampaign(campaignId, organizationId) {
    try {
      // Get campaign
      const campaign = await new Promise((resolve, reject) => {
        this.db.get(
          'SELECT * FROM club_email_campaigns WHERE id = ? AND organization_id = ?',
          [campaignId, organizationId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get organization branding
      const branding = await this.getOrganizationBranding(organizationId);

      // Get target recipients
      const recipients = await this.getCampaignRecipients(campaign);

      if (!recipients || recipients.length === 0) {
        throw new Error('No recipients found. Make sure you have club members with email addresses that match your target audience.');
      }

      // Update campaign status
      await new Promise((resolve, reject) => {
        this.db.run(
          'UPDATE club_email_campaigns SET status = ?, total_recipients = ? WHERE id = ?',
          ['sending', recipients.length, campaignId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      let sent = 0;
      let delivered = 0;
      let failed = 0;

      // Send emails
      for (const recipient of recipients) {
        try {
          const trackingToken = this.generateTrackingToken();
          
          // Create tracking record
          await new Promise((resolve, reject) => {
            this.db.run(
              `INSERT INTO club_email_tracking 
                (id, campaign_id, member_id, recipient_email, tracking_token, status)
                VALUES (?, ?, ?, ?, ?, 'pending')`,
              [uuidv4(), campaignId, recipient.id, recipient.email, trackingToken],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Determine email sending method
          let emailSent = false;
          
          // Try Google Apps Script first if configured
          if (branding.googleAppsScriptUrl) {
            try {
              // Extract body content (without tracking wrappers for Apps Script)
              const bodyContent = campaign.content_html || campaign.content_text || '';
              
              // For Apps Script, send the clean email content
              // The Apps Script will add its own styling with organization logo
              emailSent = await this.sendViaGoogleAppsScript(
                recipient.email,
                campaign.subject,
                campaign.content_text || bodyContent.replace(/<[^>]*>/g, ''),
                bodyContent,
                branding,
                campaign.subject || 'Club Announcement' // Use subject as header text, or default
              );
              
              if (emailSent) {
                console.log(`✅ Email sent via Google Apps Script to ${recipient.email}`);
              }
            } catch (error) {
              console.error(`❌ Google Apps Script failed for ${recipient.email}:`, error.message);
              console.error(`Full error:`, error);
              // Don't fall through to SMTP if it's a deployment/configuration error
              // Only fall through for network/timeout errors
              if (error.message.includes('not found') || 
                  error.message.includes('deployment') || 
                  error.message.includes('Page Not Found') ||
                  error.message.includes('unable to open')) {
                // Re-throw deployment errors so they're visible
                throw new Error(`Google Apps Script deployment issue: ${error.message}. Please check your script deployment.`);
              }
              // For other errors (network, timeout), fall through to SMTP
              console.warn(`⚠️ Falling back to SMTP for ${recipient.email} due to: ${error.message}`);
            }
          }

          // Fallback to SMTP if Apps Script not configured or failed
          if (!emailSent) {
            // Wrap content with branding
            const wrappedHtml = this.wrapEmailContent(
              campaign.content_html || campaign.content_text || '',
              branding,
              campaignId,
              trackingToken
            );

            // Send email via SMTP
            const mailOptions = {
              from: campaign.sender_email || branding.contactEmail || process.env.SMTP_USER,
              to: recipient.email,
              subject: campaign.subject,
              html: wrappedHtml,
              text: campaign.content_text || campaign.content_html?.replace(/<[^>]*>/g, ''),
              replyTo: campaign.reply_to_email || campaign.sender_email || branding.contactEmail
            };

            await this.transporter.sendMail(mailOptions);
            emailSent = true;
          }

          // Update tracking
          await new Promise((resolve, reject) => {
            this.db.run(
              `UPDATE club_email_tracking 
                SET status = 'sent', sent_at = CURRENT_TIMESTAMP
                WHERE tracking_token = ?`,
              [trackingToken],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          sent++;
          delivered++;

          // Update campaign stats
          await new Promise((resolve, reject) => {
            this.db.run(
              `UPDATE club_email_campaigns 
                SET total_sent = total_sent + 1, total_delivered = total_delivered + 1
                WHERE id = ?`,
              [campaignId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

        } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
          failed++;

          // Update tracking
          await new Promise((resolve, reject) => {
            this.db.run(
              `UPDATE club_email_tracking 
                SET status = 'failed', error_message = ?
                WHERE recipient_email = ? AND campaign_id = ?`,
              [error.message, recipient.email, campaignId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Update campaign stats
          await new Promise((resolve, reject) => {
            this.db.run(
              `UPDATE club_email_campaigns 
                SET total_failed = total_failed + 1
                WHERE id = ?`,
              [campaignId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      // Update campaign status
      await new Promise((resolve, reject) => {
        this.db.run(
          `UPDATE club_email_campaigns 
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [campaignId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return {
        success: true,
        sent,
        delivered,
        failed,
        total: recipients.length
      };
    } catch (error) {
      console.error('Error sending campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign recipients based on target audience
   */
  async getCampaignRecipients(campaign) {
    let query = `
      SELECT id, email, name 
      FROM club_members 
      WHERE organization_id = ? AND status = 'active' AND email IS NOT NULL AND email != ''
    `;
    const params = [campaign.organization_id];

    if (campaign.target_audience === 'active_members') {
      // Already filtered by status = 'active'
    } else if (campaign.target_audience === 'inactive_members') {
      query = query.replace('status = \'active\'', 'status != \'active\'');
    } else if (campaign.target_audience === 'custom' && campaign.target_member_ids) {
      try {
        const memberIds = JSON.parse(campaign.target_member_ids);
        if (memberIds.length > 0) {
          const placeholders = memberIds.map(() => '?').join(',');
          query += ` AND id IN (${placeholders})`;
          params.push(...memberIds);
        }
      } catch (e) {
        // Invalid JSON, use all members
      }
    }

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Track email open
   */
  async trackOpen(trackingToken, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE club_email_tracking 
          SET status = CASE WHEN status = 'pending' THEN 'delivered' ELSE status END,
              delivered_at = CASE WHEN delivered_at IS NULL THEN CURRENT_TIMESTAMP ELSE delivered_at END,
              opened_at = CASE WHEN opened_at IS NULL THEN CURRENT_TIMESTAMP ELSE opened_at END,
              opened_count = opened_count + 1,
              ip_address = ?,
              user_agent = ?
          WHERE tracking_token = ?`,
        [ipAddress || null, userAgent || null, trackingToken],
        function(err) {
          if (err) reject(err);
          else {
            // Update campaign stats
            this.db.run(
              `UPDATE club_email_campaigns 
                SET total_delivered = total_delivered + 1,
                    total_opened = total_opened + 1
                WHERE id = (SELECT campaign_id FROM club_email_tracking WHERE tracking_token = ?)`,
              [trackingToken],
              () => {
                resolve({ success: true });
              }
            );
          }
        }.bind(this)
      );
    });
  }

  /**
   * Track email click
   */
  async trackClick(trackingToken, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE club_email_tracking 
          SET status = CASE WHEN status IN ('pending', 'sent', 'delivered') THEN 'clicked' ELSE status END,
              clicked_at = CASE WHEN clicked_at IS NULL THEN CURRENT_TIMESTAMP ELSE clicked_at END,
              clicked_count = clicked_count + 1,
              ip_address = ?,
              user_agent = ?
          WHERE tracking_token = ?`,
        [ipAddress || null, userAgent || null, trackingToken],
        function(err) {
          if (err) reject(err);
          else {
            // Update campaign stats
            this.db.run(
              `UPDATE club_email_campaigns 
                SET total_clicked = total_clicked + 1
                WHERE id = (SELECT campaign_id FROM club_email_tracking WHERE tracking_token = ?)`,
              [trackingToken],
              () => {
                resolve({ success: true });
              }
            );
          }
        }.bind(this)
      );
    });
  }
}

module.exports = ClubEmailService;

