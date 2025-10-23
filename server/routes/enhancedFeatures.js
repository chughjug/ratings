const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { generateEnhancedSwissPairings, generateKnockoutPairings, generateBlitzRapidPairings, generateSimultaneousPairings, generateMultiDayPairings } = require('../utils/enhancedPairingAlgorithm');
const { generateCustomReport, generateAdvancedExcelExport, generateCustomPDF, createDataVisualization } = require('../services/advancedExportService');

const router = express.Router();

// Enhanced Pairing System Endpoints

/**
 * Generate enhanced pairings with manual override support
 * POST /api/enhanced/pairings/generate
 */
router.post('/pairings/generate', async (req, res) => {
  try {
    const { tournamentId, round, options = {} } = req.body;

    // Get tournament data
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get section from options
    const section = options.section || 'Open';

    // Get players for the specific section
    const players = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM players WHERE tournament_id = ? AND status = "active" AND section = ?', [tournamentId, section], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get previous pairings for the specific section
    const previousPairings = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM pairings WHERE tournament_id = ? AND round < ? AND section = ?', [tournamentId, round, section], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get color preferences
    const colorPreferences = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM color_preferences WHERE tournament_id = ?', [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Generate enhanced pairings using FIDE Dutch system
    const result = generateEnhancedSwissPairings(players, round, {
      previousPairings,
      colorPreferences: colorPreferences.reduce((acc, pref) => {
        acc[pref.player_id] = pref;
        return acc;
      }, {}),
      tournamentSettings: tournament,
      tiebreakerOrder: options.tiebreakerOrder || ['buchholz', 'sonneborn_berger', 'direct_encounter'],
      colorBalanceRules: options.colorBalanceRules || 'fide',
      accelerationSettings: options.accelerationSettings || {
        enabled: false,
        type: 'standard',
        rounds: 2,
        threshold: null
      },
      byeSettings: options.byeSettings || {
        fullPointBye: true,
        avoidUnratedDropping: true
      },
      section: section,
      ...options
    });

    // Save pairings to database
    for (const pairing of result.pairings) {
      const pairingId = uuidv4();
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO pairings (id, tournament_id, round, board, white_player_id, black_player_id, section)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          pairingId,
          tournamentId,
          round,
          pairing.board,
          pairing.white_player_id,
          pairing.black_player_id,
          section
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Fetch detailed pairing information with player names and ratings
    const detailedPairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id,
                bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ? AND p.round = ? AND p.section = ?
         ORDER BY p.board`,
        [tournamentId, round, section],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      pairings: detailedPairings,
      validation: result.validation
    });
  } catch (error) {
    console.error('Error generating enhanced pairings:', error);
    res.status(500).json({ error: 'Failed to generate pairings' });
  }
});

/**
 * Apply manual pairing override
 * POST /api/enhanced/pairings/override
 */
router.post('/pairings/override', async (req, res) => {
  try {
    const { tournamentId, round, originalPairingId, newWhiteId, newBlackId, reason, createdBy } = req.body;

    const overrideId = uuidv4();

    // Save override record
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO pairing_overrides (id, tournament_id, round, original_pairing_id, new_white_player_id, new_black_player_id, reason, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [overrideId, tournamentId, round, originalPairingId, newWhiteId, newBlackId, reason, createdBy], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update the pairing
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE pairings 
        SET white_player_id = ?, black_player_id = ?
        WHERE id = ?
      `, [newWhiteId, newBlackId, originalPairingId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, overrideId });
  } catch (error) {
    console.error('Error applying pairing override:', error);
    res.status(500).json({ error: 'Failed to apply pairing override' });
  }
});

/**
 * Get pairing history for visualization
 * GET /api/enhanced/pairings/history/:tournamentId
 */
router.get('/pairings/history/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const history = await new Promise((resolve, reject) => {
      db.all(`
        SELECT ph.*, 
               p1.name as player1_name, 
               p2.name as player2_name
        FROM pairing_history ph
        LEFT JOIN players p1 ON ph.player1_id = p1.id
        LEFT JOIN players p2 ON ph.player2_id = p2.id
        WHERE ph.tournament_id = ?
        ORDER BY ph.round, ph.created_at
      `, [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching pairing history:', error);
    res.status(500).json({ error: 'Failed to fetch pairing history' });
  }
});

/**
 * Update color preferences
 * POST /api/enhanced/color-preferences
 */
router.post('/color-preferences', async (req, res) => {
  try {
    const { tournamentId, playerId, preferredColor, priority = 1 } = req.body;

    const preferenceId = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO color_preferences (id, tournament_id, player_id, preferred_color, priority)
        VALUES (?, ?, ?, ?, ?)
      `, [preferenceId, tournamentId, playerId, preferredColor, priority], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, preferenceId });
  } catch (error) {
    console.error('Error updating color preferences:', error);
    res.status(500).json({ error: 'Failed to update color preferences' });
  }
});

// Tournament Templates Endpoints

/**
 * Get all tournament templates
 * GET /api/enhanced/templates
 */
router.get('/templates', async (req, res) => {
  try {
    const { public_only = false } = req.query;

    let query = 'SELECT * FROM tournament_templates';
    let params = [];

    if (public_only === 'true') {
      query += ' WHERE is_public = 1';
    }

    query += ' ORDER BY usage_count DESC, created_at DESC';

    const templates = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Create new tournament template
 * POST /api/enhanced/templates
 */
router.post('/templates', async (req, res) => {
  try {
    const { name, description, format, settings, isPublic = false, createdBy } = req.body;

    const templateId = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO tournament_templates (id, name, description, format, settings, is_public, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [templateId, name, description, format, JSON.stringify(settings), isPublic ? 1 : 0, createdBy], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, templateId });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Use tournament template
 * POST /api/enhanced/templates/:id/use
 */
router.post('/templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;

    // Increment usage count
    await new Promise((resolve, reject) => {
      db.run('UPDATE tournament_templates SET usage_count = usage_count + 1 WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get template
    const template = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournament_templates WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error('Error using template:', error);
    res.status(500).json({ error: 'Failed to use template' });
  }
});

// QR Code Endpoints

/**
 * Generate QR code for pairing
 * POST /api/enhanced/qr/pairing
 */
router.post('/qr/pairing', async (req, res) => {
  try {
    const { tournamentId, round, board, whitePlayer, blackPlayer, timeControl, startTime } = req.body;

    // This would typically use a QR code library
    const qrData = {
      type: 'pairing',
      tournamentId,
      round,
      board,
      whitePlayer,
      blackPlayer,
      timeControl,
      startTime,
      timestamp: new Date().toISOString()
    };

    // For now, return the data that would be encoded
    res.json({ success: true, qrData });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Advanced Export Endpoints

/**
 * Generate custom report
 * POST /api/enhanced/reports/generate
 */
router.post('/reports/generate', async (req, res) => {
  try {
    const { tournamentId, reportConfig } = req.body;

    const report = await generateCustomReport(tournamentId, reportConfig);

    res.json({ success: true, report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * Generate advanced Excel export
 * POST /api/enhanced/export/excel
 */
router.post('/export/excel', async (req, res) => {
  try {
    const { tournamentId, options = {} } = req.body;

    const workbook = await generateAdvancedExcelExport(tournamentId, options);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tournament-${tournamentId}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel export:', error);
    res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

/**
 * Generate custom PDF
 * POST /api/enhanced/export/pdf
 */
router.post('/export/pdf', async (req, res) => {
  try {
    const { tournamentId, template, options = {} } = req.body;

    const doc = await generateCustomPDF(tournamentId, template, options);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="tournament-${tournamentId}.pdf"`);

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

/**
 * Create data visualization
 * POST /api/enhanced/visualizations
 */
router.post('/visualizations', async (req, res) => {
  try {
    const { tournamentId, config } = req.body;

    const visualization = await createDataVisualization(tournamentId, config);

    res.json({ success: true, visualization });
  } catch (error) {
    console.error('Error creating visualization:', error);
    res.status(500).json({ error: 'Failed to create visualization' });
  }
});

// Player Photos Endpoints

/**
 * Upload player photo
 * POST /api/enhanced/photos/upload
 */
router.post('/photos/upload', async (req, res) => {
  try {
    const { tournamentId, playerId, photoUrl } = req.body;

    const photoId = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO player_photos (id, tournament_id, player_id, photo_url)
        VALUES (?, ?, ?, ?)
      `, [photoId, tournamentId, playerId, photoUrl], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, photoId });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

/**
 * Get player photos
 * GET /api/enhanced/photos/:tournamentId
 */
router.get('/photos/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const photos = await new Promise((resolve, reject) => {
      db.all(`
        SELECT pp.*, p.name as player_name
        FROM player_photos pp
        LEFT JOIN players p ON pp.player_id = p.id
        WHERE pp.tournament_id = ?
        ORDER BY pp.uploaded_at DESC
      `, [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

module.exports = router;
