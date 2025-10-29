const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @route GET /api/club-announcements/:organizationId
 * @desc Get all announcements for an organization
 * @access Private
 */
router.get('/:organizationId', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { limit = 50, offset = 0, priority, published_only = true } = req.query;

    const db = require('../database');
    
    let query = `
      SELECT ca.*, u.username as created_by_username
      FROM club_announcements ca
      LEFT JOIN users u ON ca.created_by = u.id
      WHERE ca.organization_id = ?
    `;
    const params = [organizationId];

    if (published_only === 'true') {
      query += ' AND ca.is_published = 1';
    }

    if (priority) {
      query += ' AND ca.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY ca.priority DESC, ca.published_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, announcements) => {
      if (err) {
        console.error('Error fetching announcements:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch announcements'
        });
      }

      res.json({
        success: true,
        data: announcements
      });
    });
  } catch (error) {
    console.error('Club announcements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/club-announcements
 * @desc Create a new club announcement
 * @access Private
 */
router.post('/', authenticate, (req, res) => {
  try {
    const {
      organization_id,
      title,
      content,
      priority = 'normal',
      is_published = true,
      expires_at
    } = req.body;

    if (!organization_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, title, and content are required'
      });
    }

    const db = require('../database');
    const id = uuidv4();
    const publishedAt = is_published ? new Date().toISOString() : null;

    db.run(
      `INSERT INTO club_announcements 
       (id, organization_id, title, content, priority, is_published, published_at, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, organization_id, title, content, priority, is_published ? 1 : 0, publishedAt, expires_at, req.user.id],
      function(err) {
        if (err) {
          console.error('Error creating announcement:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to create announcement'
          });
        }

        res.json({
          success: true,
          data: {
            id,
            organization_id,
            title,
            content,
            priority,
            is_published,
            published_at: publishedAt,
            expires_at: expires_at,
            created_by: req.user.id
          }
        });
      }
    );
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/club-announcements/:id
 * @desc Update a club announcement
 * @access Private
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      priority,
      is_published,
      expires_at
    } = req.body;

    const db = require('../database');
    
    // Check if announcement exists and user has permission
    db.get(
      'SELECT * FROM club_announcements WHERE id = ? AND created_by = ?',
      [id, req.user.id],
      (err, announcement) => {
        if (err) {
          console.error('Error checking announcement:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to check announcement'
          });
        }

        if (!announcement) {
          return res.status(404).json({
            success: false,
            error: 'Announcement not found or access denied'
          });
        }

        const publishedAt = is_published && !announcement.is_published 
          ? new Date().toISOString() 
          : announcement.published_at;

        db.run(
          `UPDATE club_announcements 
           SET title = COALESCE(?, title),
               content = COALESCE(?, content),
               priority = COALESCE(?, priority),
               is_published = COALESCE(?, is_published),
               published_at = ?,
               expires_at = COALESCE(?, expires_at),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [title, content, priority, is_published ? 1 : 0, publishedAt, expires_at, id],
          function(err) {
            if (err) {
              console.error('Error updating announcement:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to update announcement'
              });
            }

            res.json({
              success: true,
              data: {
                id,
                title: title || announcement.title,
                content: content || announcement.content,
                priority: priority || announcement.priority,
                is_published: is_published !== undefined ? is_published : announcement.is_published,
                published_at: publishedAt,
                expires_at: expires_at !== undefined ? expires_at : announcement.expires_at
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/club-announcements/:id
 * @desc Delete a club announcement
 * @access Private
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../database');

    // Check if announcement exists and user has permission
    db.get(
      'SELECT * FROM club_announcements WHERE id = ? AND created_by = ?',
      [id, req.user.id],
      (err, announcement) => {
        if (err) {
          console.error('Error checking announcement:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to check announcement'
          });
        }

        if (!announcement) {
          return res.status(404).json({
            success: false,
            error: 'Announcement not found or access denied'
          });
        }

        db.run(
          'DELETE FROM club_announcements WHERE id = ?',
          [id],
          function(err) {
            if (err) {
              console.error('Error deleting announcement:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to delete announcement'
              });
            }

            res.json({
              success: true,
              message: 'Announcement deleted successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/club-announcements/:organizationId/public
 * @desc Get published announcements for public display
 * @access Public
 */
router.get('/:organizationId/public', (req, res) => {
  try {
    const { organizationId } = req.params;
    const { limit = 10 } = req.query;

    const db = require('../database');
    
    db.all(
      `SELECT id, title, content, priority, published_at, expires_at
       FROM club_announcements 
       WHERE organization_id = ? 
         AND is_published = 1 
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY priority DESC, published_at DESC 
       LIMIT ?`,
      [organizationId, parseInt(limit)],
      (err, announcements) => {
        if (err) {
          console.error('Error fetching public announcements:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch announcements'
          });
        }

        res.json({
          success: true,
          data: announcements
        });
      }
    );
  } catch (error) {
    console.error('Public announcements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
