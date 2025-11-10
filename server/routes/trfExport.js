const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exportTournamentTRF, exportAllRoundsTRF, generateTrfContent, validateTrfContent } = require('../services/trfExport');
const db = require('../database');
const router = express.Router();

/**
 * Export tournament data as TRF file using bbpPairings-master logic
 * GET /api/export/trf/:tournamentId
 */
router.get('/trf/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;
  const { round, exportPath } = req.query;

  try {
    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Set default export path if not provided
    const finalExportPath = exportPath || path.join(__dirname, '../exports', tournamentId);

    // Ensure export directory exists
    try {
      await fs.mkdir(finalExportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }

    // Export TRF file
    const result = await exportTournamentTRF(db, tournamentId, finalExportPath, {
      round: round ? parseInt(round) : undefined
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'TRF file exported successfully using bbpPairings-master logic',
        tournament: {
          id: tournament.id,
          name: tournament.name,
          rounds: tournament.rounds,
          format: tournament.format
        },
        file: {
          fileName: result.fileName,
          filePath: result.filePath,
          size: result.content.length
        },
        content: result.content,
        metadata: result.metadata
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to export TRF file'
      });
    }
  } catch (error) {
    console.error('TRF export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to export TRF file'
    });
  }
});

/**
 * Export all rounds as separate TRF files
 * GET /api/export/trf/:tournamentId/all-rounds
 */
router.get('/trf/:tournamentId/all-rounds', async (req, res) => {
  const { tournamentId } = req.params;
  const { exportPath } = req.query;

  try {
    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const finalExportPath = exportPath || path.join(__dirname, '../exports', tournamentId);

    // Ensure export directory exists
    try {
      await fs.mkdir(finalExportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }

    // Export all rounds
    const result = await exportAllRoundsTRF(db, tournamentId, finalExportPath);

    if (result.success) {
      res.json({
        success: true,
        message: `Exported ${result.summary.successCount} of ${result.summary.totalRounds} rounds as TRF files`,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          rounds: tournament.rounds
        },
        summary: result.summary,
        files: result.results.filter(r => r.success).map(r => ({
          round: r.round,
          fileName: r.fileName,
          filePath: r.filePath
        })),
        errors: result.results.filter(r => !r.success).map(r => ({
          round: r.round,
          error: r.error
        }))
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to export TRF files'
      });
    }
  } catch (error) {
    console.error('TRF export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to export TRF files'
    });
  }
});

/**
 * Generate TRF content without writing to file
 * GET /api/export/trf/:tournamentId/content
 */
router.get('/trf/:tournamentId/content', async (req, res) => {
  const { tournamentId } = req.params;
  const { round } = req.query;

  try {
    const result = await generateTrfContent(db, tournamentId, parseInt(round) || 1);

    if (result.success) {
      res.json({
        success: true,
        content: result.content,
        metadata: result.metadata
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to generate TRF content'
      });
    }
  } catch (error) {
    console.error('TRF content generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate TRF content'
    });
  }
});

/**
 * Download TRF file
 * GET /api/export/trf/:tournamentId/download
 */
router.get('/trf/:tournamentId/download', async (req, res) => {
  const { tournamentId } = req.params;
  const { round } = req.query;

  try {
    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const exportPath = path.join(__dirname, '../exports', tournamentId);
    const roundNum = round ? parseInt(round) : tournament.rounds;
    const fileName = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_Round${roundNum}.trf`;
    const filePath = path.join(exportPath, fileName);

    // Check if file exists, if not generate it
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, generate it
      const result = await exportTournamentTRF(db, tournamentId, exportPath, { round: roundNum });
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to generate TRF file'
        });
      }
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file
    const fileContent = await fs.readFile(filePath, 'utf8');
    res.send(fileContent);

  } catch (error) {
    console.error('TRF download error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to download TRF file'
    });
  }
});

/**
 * Download all TRF files as ZIP
 * GET /api/export/trf/:tournamentId/download-all
 */
router.get('/trf/:tournamentId/download-all', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const exportPath = path.join(__dirname, '../exports', tournamentId);

    // Export all rounds first
    const result = await exportAllRoundsTRF(db, tournamentId, exportPath);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to export TRF files'
      });
    }

    // Create ZIP file
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_TRF_Export.zip"`);

    archive.pipe(res);

    // Add TRF files to archive
    for (const fileResult of result.results) {
      if (fileResult.success) {
        archive.file(fileResult.filePath, { name: fileResult.fileName });
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('TRF ZIP download error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create TRF ZIP file'
    });
  }
});

/**
 * Validate TRF content
 * POST /api/export/trf/validate
 */
router.post('/trf/validate', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'No content provided'
      });
    }

    const validation = validateTrfContent(content);

    res.json({
      success: true,
      validation: validation
    });

  } catch (error) {
    console.error('TRF validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to validate TRF content'
    });
  }
});

module.exports = router;
