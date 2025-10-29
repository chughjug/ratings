const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

/**
 * @route GET /api/email-campaigns/:organizationId
 * @desc Get all email campaigns for an organization
 * @access Private
 */
router.get('/:organizationId', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;

    const db = require('../database');
    
    let query = `
      SELECT ec.*, u.username as created_by_username
      FROM email_campaigns ec
      LEFT JOIN users u ON ec.created_by = u.id
      WHERE ec.organization_id = ?
    `;
    const params = [organizationId];

    if (status) {
      query += ' AND ec.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ec.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, campaigns) => {
      if (err) {
        console.error('Error fetching email campaigns:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch email campaigns'
        });
      }

      res.json({
        success: true,
        data: campaigns
      });
    });
  } catch (error) {
    console.error('Email campaigns error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/email-campaigns
 * @desc Create a new email campaign
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      organization_id,
      subject,
      content,
      recipient_type = 'all',
      recipient_filters,
      scheduled_at
    } = req.body;

    if (!organization_id || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, subject, and content are required'
      });
    }

    const db = require('../database');
    const id = uuidv4();

    db.run(
      `INSERT INTO email_campaigns 
       (id, organization_id, subject, content, recipient_type, recipient_filters, scheduled_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, organization_id, subject, content, recipient_type, JSON.stringify(recipient_filters), scheduled_at, req.user.id],
      function(err) {
        if (err) {
          console.error('Error creating email campaign:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to create email campaign'
          });
        }

        res.json({
          success: true,
          data: {
            id,
            organization_id,
            subject,
            content,
            recipient_type,
            recipient_filters,
            scheduled_at,
            status: 'draft',
            created_by: req.user.id
          }
        });
      }
    );
  } catch (error) {
    console.error('Create email campaign error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/email-campaigns/:id/send
 * @desc Send an email campaign
 * @access Private
 */
router.post('/:id/send', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../database');

    // Get campaign details
    db.get(
      'SELECT * FROM email_campaigns WHERE id = ? AND created_by = ?',
      [id, req.user.id],
      async (err, campaign) => {
        if (err) {
          console.error('Error fetching campaign:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch campaign'
          });
        }

        if (!campaign) {
          return res.status(404).json({
            success: false,
            error: 'Campaign not found or access denied'
          });
        }

        if (campaign.status !== 'draft') {
          return res.status(400).json({
            success: false,
            error: 'Campaign has already been sent'
          });
        }

        try {
          // Get recipients based on recipient_type
          const recipients = await getRecipients(campaign.organization_id, campaign.recipient_type, campaign.recipient_filters);
          
          if (recipients.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'No recipients found'
            });
          }

          // Update campaign status
          db.run(
            'UPDATE email_campaigns SET status = ?, total_recipients = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['sent', recipients.length, id]
          );

          // Send emails
          const emailService = require('../services/emailService');
          const results = await emailService.sendBulkEmail({
            campaignId: id,
            subject: campaign.subject,
            content: campaign.content,
            recipients: recipients,
            organizationId: campaign.organization_id
          });

          res.json({
            success: true,
            data: {
              campaignId: id,
              totalRecipients: recipients.length,
              results: results
            }
          });
        } catch (error) {
          console.error('Error sending campaign:', error);
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/email-campaigns/:id/tracking
 * @desc Get email tracking data for a campaign
 * @access Private
 */
router.get('/:id/tracking', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../database');

    // Get campaign details
    db.get(
      'SELECT * FROM email_campaigns WHERE id = ? AND created_by = ?',
      [id, req.user.id],
      (err, campaign) => {
        if (err) {
          console.error('Error fetching campaign:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch campaign'
          });
        }

        if (!campaign) {
          return res.status(404).json({
            success: false,
            error: 'Campaign not found or access denied'
          });
        }

        // Get tracking data
        db.all(
          `SELECT et.*, 
                  SUM(CASE WHEN et.status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                  SUM(CASE WHEN et.opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened_count,
                  SUM(CASE WHEN et.clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked_count
           FROM email_tracking et
           WHERE et.campaign_id = ?
           GROUP BY et.campaign_id`,
          [id],
          (err, trackingData) => {
            if (err) {
              console.error('Error fetching tracking data:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to fetch tracking data'
              });
            }

            res.json({
              success: true,
              data: {
                campaign: campaign,
                tracking: trackingData[0] || {
                  delivered_count: 0,
                  opened_count: 0,
                  clicked_count: 0
                }
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Email tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to get recipients based on type and filters
 */
async function getRecipients(organizationId, recipientType, recipientFilters) {
  const db = require('../database');
  
  return new Promise((resolve, reject) => {
    let query = '';
    let params = [organizationId];

    switch (recipientType) {
      case 'all':
        query = `
          SELECT DISTINCT p.email, p.name
          FROM players p
          JOIN tournaments t ON p.tournament_id = t.id
          WHERE t.organization_id = ? AND p.email IS NOT NULL AND p.email != ''
        `;
        break;
      case 'active_members':
        query = `
          SELECT DISTINCT p.email, p.name
          FROM players p
          JOIN tournaments t ON p.tournament_id = t.id
          WHERE t.organization_id = ? 
            AND p.email IS NOT NULL AND p.email != ''
            AND p.status = 'active'
        `;
        break;
      case 'filtered':
        if (!recipientFilters) {
          resolve([]);
          return;
        }
        const filters = JSON.parse(recipientFilters);
        query = `
          SELECT DISTINCT p.email, p.name
          FROM players p
          JOIN tournaments t ON p.tournament_id = t.id
          WHERE t.organization_id = ? AND p.email IS NOT NULL AND p.email != ''
        `;
        
        if (filters.minRating) {
          query += ' AND p.rating >= ?';
          params.push(filters.minRating);
        }
        if (filters.maxRating) {
          query += ' AND p.rating <= ?';
          params.push(filters.maxRating);
        }
        if (filters.section) {
          query += ' AND p.section = ?';
          params.push(filters.section);
        }
        break;
      default:
        resolve([]);
        return;
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = router;
