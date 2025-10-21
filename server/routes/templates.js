const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { 
  authenticate, 
  authorize, 
  logAudit 
} = require('../middleware/auth');

const router = express.Router();

/**
 * Get all tournament templates
 * GET /api/templates
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', isPublic = '' } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT t.id, t.name, t.description, t.template_data, t.created_by, 
             t.is_public, t.created_at, t.updated_at, u.username as created_by_username
      FROM tournament_templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.is_public = 1 OR t.created_by = ?)
    `;
    const params = [userId];

    if (search) {
      query += ` AND (t.name LIKE ? OR t.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (isPublic !== '') {
      query += ` AND t.is_public = ?`;
      params.push(isPublic === 'true' ? 1 : 0);
    }

    query += ` ORDER BY t.created_at DESC`;

    const templates = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      data: {
        templates: templates.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          templateData: JSON.parse(template.template_data),
          createdBy: template.created_by,
          createdByUsername: template.created_by_username,
          isPublic: template.is_public === 1,
          createdAt: template.created_at,
          updatedAt: template.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

/**
 * Get template by ID
 * GET /api/templates/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await new Promise((resolve, reject) => {
      db.get(
        `SELECT t.id, t.name, t.description, t.template_data, t.created_by, 
                t.is_public, t.created_at, t.updated_at, u.username as created_by_username
         FROM tournament_templates t
         LEFT JOIN users u ON t.created_by = u.id
         WHERE t.id = ? AND (t.is_public = 1 OR t.created_by = ?)`,
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          templateData: JSON.parse(template.template_data),
          createdBy: template.created_by,
          createdByUsername: template.created_by_username,
          isPublic: template.is_public === 1,
          createdAt: template.created_at,
          updatedAt: template.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template'
    });
  }
});

/**
 * Create tournament template
 * POST /api/templates
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, templateData, isPublic = false } = req.body;
    const userId = req.user.id;

    // Validation
    if (!name || !templateData) {
      return res.status(400).json({
        success: false,
        error: 'Name and template data are required'
      });
    }

    if (typeof templateData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Template data must be a valid object'
      });
    }

    // Create template
    const templateId = uuidv4();
    const templateDataJson = JSON.stringify(templateData);

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tournament_templates (id, name, description, template_data, created_by, is_public)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [templateId, name, description || null, templateDataJson, userId, isPublic ? 1 : 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('CREATE', 'tournament_templates', templateId, null, { name, isPublic }, req);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: {
        template: {
          id: templateId,
          name,
          description: description || null,
          templateData,
          createdBy: userId,
          isPublic: isPublic,
          createdAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

/**
 * Update tournament template
 * PUT /api/templates/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, templateData, isPublic } = req.body;
    const userId = req.user.id;

    // Check if template exists and user has permission
    const template = await new Promise((resolve, reject) => {
      db.get(
        'SELECT created_by, name, description, template_data, is_public FROM tournament_templates WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    if (template.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own templates'
      });
    }

    // Validation
    if (templateData && typeof templateData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Template data must be a valid object'
      });
    }

    // Update template
    const templateDataJson = templateData ? JSON.stringify(templateData) : template.template_data;

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE tournament_templates SET 
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         template_data = ?,
         is_public = COALESCE(?, is_public),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name || null, description || null, templateDataJson, isPublic !== undefined ? (isPublic ? 1 : 0) : null, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    const oldValues = JSON.stringify({
      name: template.name,
      description: template.description,
      isPublic: template.is_public === 1
    });
    const newValues = JSON.stringify({
      name: name || template.name,
      description: description || template.description,
      isPublic: isPublic !== undefined ? isPublic : (template.is_public === 1)
    });
    logAudit('UPDATE', 'tournament_templates', id, oldValues, newValues, req);

    res.json({
      success: true,
      message: 'Template updated successfully'
    });

  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

/**
 * Delete tournament template
 * DELETE /api/templates/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if template exists and user has permission
    const template = await new Promise((resolve, reject) => {
      db.get(
        'SELECT created_by, name FROM tournament_templates WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    if (template.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own templates'
      });
    }

    // Delete template
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM tournament_templates WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Log audit
    logAudit('DELETE', 'tournament_templates', id, JSON.stringify({ name: template.name }), null, req);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

/**
 * Create tournament from template
 * POST /api/templates/:id/create-tournament
 */
router.post('/:id/create-tournament', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { tournamentName, customizations = {} } = req.body;
    const userId = req.user.id;

    // Get template
    const template = await new Promise((resolve, reject) => {
      db.get(
        'SELECT template_data FROM tournament_templates WHERE id = ? AND (is_public = 1 OR created_by = ?)',
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const templateData = JSON.parse(template.template_data);
    
    // Merge template data with customizations
    const tournamentData = {
      ...templateData,
      ...customizations,
      name: tournamentName || templateData.name || 'New Tournament',
      created_by: userId
    };

    // Create tournament using existing tournament creation logic
    const tournamentId = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tournaments (id, name, format, rounds, time_control, start_date, end_date, 
         status, settings, city, state, location, chief_td_name, chief_td_uscf_id, 
         chief_arbiter_name, chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id, 
         expected_players, website, fide_rated, uscf_rated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tournamentId,
          tournamentData.name,
          tournamentData.format || 'swiss',
          tournamentData.rounds || 5,
          tournamentData.time_control || null,
          tournamentData.start_date || null,
          tournamentData.end_date || null,
          'created',
          JSON.stringify(tournamentData.settings || {}),
          tournamentData.city || null,
          tournamentData.state || null,
          tournamentData.location || null,
          tournamentData.chief_td_name || null,
          tournamentData.chief_td_uscf_id || null,
          tournamentData.chief_arbiter_name || null,
          tournamentData.chief_arbiter_fide_id || null,
          tournamentData.chief_organizer_name || null,
          tournamentData.chief_organizer_fide_id || null,
          tournamentData.expected_players || null,
          tournamentData.website || null,
          tournamentData.fide_rated || false,
          tournamentData.uscf_rated !== false
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Grant owner permission to creator
    const permissionId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO tournament_permissions (id, tournament_id, user_id, permission, granted_by) VALUES (?, ?, ?, ?, ?)',
        [permissionId, tournamentId, userId, 'owner', userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('CREATE', 'tournaments', tournamentId, null, { name: tournamentData.name, from_template: id }, req);

    res.status(201).json({
      success: true,
      message: 'Tournament created from template successfully',
      data: {
        tournament: {
          id: tournamentId,
          name: tournamentData.name,
          format: tournamentData.format || 'swiss',
          rounds: tournamentData.rounds || 5
        }
      }
    });

  } catch (error) {
    console.error('Create tournament from template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tournament from template'
    });
  }
});

module.exports = router;
