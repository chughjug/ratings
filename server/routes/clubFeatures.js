const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const ClubEmailService = require('../services/clubEmailService');
const ClubRatingService = require('../services/clubRatingService');
const router = express.Router();

const emailService = new ClubEmailService(db);
const ratingService = new ClubRatingService(db);

// ============================================================================
// CLUB ANNOUNCEMENTS
// ============================================================================

/**
 * Get all announcements for an organization (public - published only)
 * GET /api/club-features/public/announcements?organizationId=xxx
 */
router.get('/public/announcements', async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    // Only return published announcements for public access
    let query = 'SELECT * FROM club_announcements WHERE organization_id = ? AND is_published = 1';
    const params = [organizationId];

    query += ' ORDER BY is_pinned DESC, created_at DESC';

    const announcements = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      success: true,
      data: {
        announcements: announcements.map(ann => ({
          id: ann.id,
          organizationId: ann.organization_id,
          title: ann.title,
          content: ann.content,
          isPinned: ann.is_pinned === 1,
          isPublished: ann.is_published === 1,
          publishedAt: ann.published_at,
          expiresAt: ann.expires_at,
          createdAt: ann.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get public announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcements'
    });
  }
});

/**
 * Get all announcements for an organization (authenticated)
 * GET /api/club-features/announcements?organizationId=xxx
 */
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const { organizationId, published } = req.query;
    const userId = req.user.id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this organization'
      });
    }

    let query = 'SELECT * FROM club_announcements WHERE organization_id = ?';
    const params = [organizationId];

    if (published !== undefined) {
      query += ' AND is_published = ?';
      params.push(published === 'true' ? 1 : 0);
    }

    query += ' ORDER BY is_pinned DESC, created_at DESC';

    const announcements = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      success: true,
      data: {
        announcements: announcements.map(ann => ({
          id: ann.id,
          organizationId: ann.organization_id,
          title: ann.title,
          content: ann.content,
          authorId: ann.author_id,
          isPinned: ann.is_pinned === 1,
          isPublished: ann.is_published === 1,
          publishedAt: ann.published_at,
          expiresAt: ann.expires_at,
          targetAudience: ann.target_audience,
          targetMemberIds: ann.target_member_ids ? JSON.parse(ann.target_member_ids) : null,
          createdAt: ann.created_at,
          updatedAt: ann.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcements'
    });
  }
});

/**
 * Create announcement
 * POST /api/club-features/announcements
 */
router.post('/announcements', authenticate, async (req, res) => {
  try {
    const {
      organizationId,
      title,
      content,
      isPinned,
      isPublished,
      expiresAt,
      targetAudience,
      targetMemberIds
    } = req.body;
    const userId = req.user.id;

    if (!organizationId || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'organizationId, title, and content are required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const announcementId = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO club_announcements 
          (id, organization_id, title, content, author_id, is_pinned, is_published,
           published_at, expires_at, target_audience, target_member_ids)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          announcementId,
          organizationId,
          title,
          content,
          userId,
          isPinned ? 1 : 0,
          isPublished ? 1 : 0,
          isPublished ? new Date().toISOString() : null,
          expiresAt || null,
          targetAudience || 'all',
          targetMemberIds ? JSON.stringify(targetMemberIds) : null
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: { announcementId }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement'
    });
  }
});

/**
 * Update announcement
 * PUT /api/club-features/announcements/:id
 */
router.put('/announcements/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Get announcement
    const announcement = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM club_announcements WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [announcement.organization_id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Build update query
    const fields = [];
    const values = [];

    if (updateData.title !== undefined) fields.push('title = ?'), values.push(updateData.title);
    if (updateData.content !== undefined) fields.push('content = ?'), values.push(updateData.content);
    if (updateData.isPinned !== undefined) fields.push('is_pinned = ?'), values.push(updateData.isPinned ? 1 : 0);
    if (updateData.isPublished !== undefined) {
      fields.push('is_published = ?'), values.push(updateData.isPublished ? 1 : 0);
      if (updateData.isPublished && !announcement.published_at) {
        fields.push('published_at = CURRENT_TIMESTAMP');
      }
    }
    if (updateData.expiresAt !== undefined) fields.push('expires_at = ?'), values.push(updateData.expiresAt || null);
    if (updateData.targetAudience !== undefined) fields.push('target_audience = ?'), values.push(updateData.targetAudience);
    if (updateData.targetMemberIds !== undefined) {
      fields.push('target_member_ids = ?');
      values.push(updateData.targetMemberIds ? JSON.stringify(updateData.targetMemberIds) : null);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE club_announcements SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update announcement'
    });
  }
});

/**
 * Delete announcement
 * DELETE /api/club-features/announcements/:id
 */
router.delete('/announcements/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcement = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM club_announcements WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [announcement.organization_id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM club_announcements WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete announcement'
    });
  }
});

// ============================================================================
// EMAIL CAMPAIGNS
// ============================================================================

/**
 * Get all email campaigns
 * GET /api/club-features/email-campaigns?organizationId=xxx
 */
router.get('/email-campaigns', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const userId = req.user.id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this organization'
      });
    }

    const campaigns = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM club_email_campaigns WHERE organization_id = ? ORDER BY created_at DESC',
        [organizationId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({
      success: true,
      data: {
        campaigns: campaigns.map(c => ({
          id: c.id,
          organizationId: c.organization_id,
          subject: c.subject,
          status: c.status,
          scheduledAt: c.scheduled_at,
          sentAt: c.sent_at,
          totalRecipients: c.total_recipients,
          totalSent: c.total_sent,
          totalDelivered: c.total_delivered,
          totalOpened: c.total_opened,
          totalClicked: c.total_clicked,
          totalBounced: c.total_bounced,
          totalFailed: c.total_failed,
          createdAt: c.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get email campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email campaigns'
    });
  }
});

/**
 * Create email campaign
 * POST /api/club-features/email-campaigns
 */
router.post('/email-campaigns', authenticate, async (req, res) => {
  try {
    const {
      organizationId,
      subject,
      contentHtml,
      contentText,
      senderName,
      senderEmail,
      replyToEmail,
      scheduledAt,
      targetAudience,
      targetMemberIds
    } = req.body;
    const userId = req.user.id;

    if (!organizationId || !subject || !contentHtml) {
      return res.status(400).json({
        success: false,
        error: 'organizationId, subject, and contentHtml are required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const campaignId = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO club_email_campaigns 
          (id, organization_id, subject, content_html, content_text, sender_name, sender_email,
           reply_to_email, scheduled_at, target_audience, target_member_ids, created_by, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaignId,
          organizationId,
          subject,
          contentHtml,
          contentText || null,
          senderName || null,
          senderEmail || null,
          replyToEmail || null,
          scheduledAt || null,
          targetAudience || 'all',
          targetMemberIds ? JSON.stringify(targetMemberIds) : null,
          userId,
          scheduledAt ? 'scheduled' : 'draft'
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({
      success: true,
      message: 'Email campaign created successfully',
      data: { campaignId }
    });
  } catch (error) {
    console.error('Create email campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create email campaign'
    });
  }
});

/**
 * Send email campaign
 * POST /api/club-features/email-campaigns/:id/send
 */
router.post('/email-campaigns/:id/send', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get campaign
    const campaign = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM club_email_campaigns WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [campaign.organization_id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Send campaign asynchronously
    emailService.sendCampaign(id, campaign.organization_id)
      .then(() => {
        console.log(`✅ Campaign ${id} sent successfully`);
      })
      .catch(err => {
        console.error('❌ Error sending campaign:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack
        });
        // Update campaign status to failed with error message
        db.run(
          'UPDATE club_email_campaigns SET status = ?, error_message = ? WHERE id = ?',
          ['failed', err.message?.substring(0, 500) || 'Unknown error', id],
          (updateErr) => {
            if (updateErr) console.error('Failed to update campaign status:', updateErr);
          }
        );
      });

    res.json({
      success: true,
      message: 'Email campaign is being sent. Check the campaign status to see if it completes successfully.'
    });
  } catch (error) {
    console.error('Send email campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email campaign'
    });
  }
});

/**
 * Get email campaign insights
 * GET /api/club-features/email-campaigns/:id/insights
 */
router.get('/email-campaigns/:id/insights', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get campaign
    const campaign = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM club_email_campaigns WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [campaign.organization_id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Get tracking details
    const tracking = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          status,
          COUNT(*) as count,
          SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened_count,
          SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked_count
        FROM club_email_tracking
        WHERE campaign_id = ?
        GROUP BY status`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const deliveryRate = campaign.total_recipients > 0 
      ? (campaign.total_delivered / campaign.total_recipients * 100).toFixed(2) 
      : 0;
    const openRate = campaign.total_delivered > 0 
      ? (campaign.total_opened / campaign.total_delivered * 100).toFixed(2) 
      : 0;
    const clickRate = campaign.total_delivered > 0 
      ? (campaign.total_clicked / campaign.total_delivered * 100).toFixed(2) 
      : 0;

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          subject: campaign.subject,
          status: campaign.status,
          sentAt: campaign.sent_at,
          totalRecipients: campaign.total_recipients,
          totalSent: campaign.total_sent,
          totalDelivered: campaign.total_delivered,
          totalOpened: campaign.total_opened,
          totalClicked: campaign.total_clicked,
          totalBounced: campaign.total_bounced,
          totalFailed: campaign.total_failed
        },
        metrics: {
          deliveryRate: parseFloat(deliveryRate),
          openRate: parseFloat(openRate),
          clickRate: parseFloat(clickRate),
          bounceRate: campaign.total_recipients > 0 
            ? parseFloat((campaign.total_bounced / campaign.total_recipients * 100).toFixed(2))
            : 0
        },
        tracking: tracking
      }
    });
  } catch (error) {
    console.error('Get email insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email insights'
    });
  }
});

// ============================================================================
// EMAIL TRACKING
// ============================================================================

/**
 * Track email open (1x1 pixel)
 * GET /api/club-email/track/:token/open.png
 */
router.get('/track/:token/open.png', async (req, res) => {
  try {
    const { token } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    await emailService.trackOpen(token, ipAddress, userAgent);

    // Return 1x1 transparent PNG
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(pixel);
  } catch (error) {
    console.error('Track open error:', error);
    // Still return pixel even if tracking fails
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(pixel);
  }
});

/**
 * Track email click (redirect)
 * GET /api/club-email/track/:token/click?url=xxx
 */
router.get('/track/:token/click', async (req, res) => {
  try {
    const { token } = req.params;
    const { url } = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    await emailService.trackClick(token, ipAddress, userAgent);

    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('Track click error:', error);
    res.redirect('/');
  }
});

// ============================================================================
// CLUB RATINGS
// ============================================================================

/**
 * Get club ratings leaderboard (public)
 * GET /api/club-features/public/ratings?organizationId=xxx&ratingType=regular
 */
router.get('/public/ratings', async (req, res) => {
  try {
    const { organizationId, ratingType = 'regular', limit = 100 } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    const leaderboard = await ratingService.getLeaderboard(organizationId, ratingType, parseInt(limit));

    res.json({
      success: true,
      data: {
        leaderboard: leaderboard.map(r => ({
          id: r.id,
          memberId: r.member_id,
          memberName: r.name,
          uscfId: r.uscf_id,
          ratingType: r.rating_type,
          rating: r.rating,
          gamesPlayed: r.games_played,
          wins: r.wins,
          losses: r.losses,
          draws: r.draws,
          peakRating: r.peak_rating,
          peakRatingDate: r.peak_rating_date,
          lastGameDate: r.last_game_date
        }))
      }
    });
  } catch (error) {
    console.error('Get public ratings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ratings'
    });
  }
});

/**
 * Get club ratings leaderboard (authenticated)
 * GET /api/club-features/ratings?organizationId=xxx&ratingType=regular
 */
router.get('/ratings', authenticate, async (req, res) => {
  try {
    const { organizationId, ratingType = 'regular', limit = 100 } = req.query;
    const userId = req.user.id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this organization'
      });
    }

    const leaderboard = await ratingService.getLeaderboard(organizationId, ratingType, parseInt(limit));

    res.json({
      success: true,
      data: {
        leaderboard: leaderboard.map(r => ({
          id: r.id,
          memberId: r.member_id,
          memberName: r.name,
          uscfId: r.uscf_id,
          ratingType: r.rating_type,
          rating: r.rating,
          gamesPlayed: r.games_played,
          wins: r.wins,
          losses: r.losses,
          draws: r.draws,
          peakRating: r.peak_rating,
          peakRatingDate: r.peak_rating_date,
          lastGameDate: r.last_game_date
        }))
      }
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ratings'
    });
  }
});

/**
 * Get member rating
 * GET /api/club-features/ratings/:memberId?organizationId=xxx&ratingType=regular
 */
router.get('/ratings/:memberId', authenticate, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { organizationId, ratingType = 'regular' } = req.query;
    const userId = req.user.id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this organization'
      });
    }

    const rating = await ratingService.getRating(organizationId, memberId, ratingType);

    if (!rating) {
      // Initialize rating
      await ratingService.initializeRating(organizationId, memberId, ratingType);
      const newRating = await ratingService.getRating(organizationId, memberId, ratingType);
      return res.json({
        success: true,
        data: { rating: newRating }
      });
    }

    // Get rating history
    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM club_rating_history 
         WHERE member_id = ? AND rating_type = ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [memberId, ratingType],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({
      success: true,
      data: {
        rating,
        history: history.map(h => ({
          id: h.id,
          ratingBefore: h.rating_before,
          ratingAfter: h.rating_after,
          ratingChange: h.rating_change,
          result: h.result,
          opponentId: h.opponent_id,
          gameDate: h.game_date,
          createdAt: h.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rating'
    });
  }
});

/**
 * Auto-generate ratings from tournament
 * POST /api/club-features/ratings/generate
 */
router.post('/ratings/generate', authenticate, async (req, res) => {
  try {
    const { organizationId, tournamentId, ratingType = 'regular' } = req.body;
    const userId = req.user.id;

    if (!organizationId || !tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId and tournamentId are required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Verify tournament belongs to organization
    const tournament = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM tournaments WHERE id = ? AND organization_id = ?',
        [tournamentId, organizationId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found or does not belong to organization'
      });
    }

    const result = await ratingService.generateRatingsFromTournament(
      organizationId,
      tournamentId,
      ratingType
    );

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Generate ratings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate ratings'
    });
  }
});

module.exports = router;

