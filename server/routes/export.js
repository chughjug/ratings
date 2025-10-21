const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exportTournamentDBF } = require('../services/dbfExport');
const db = require('../database');
const router = express.Router();

/**
 * Export tournament data as USCF-compatible DBF files
 * GET /api/export/dbf/:tournamentId
 */
router.get('/dbf/:tournamentId', async (req, res) => {
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

    // Set default export path if not provided - use tournament-specific directory
    const finalExportPath = exportPath || path.join(__dirname, '../exports', tournamentId);

    // Ensure export directory exists
    try {
      await fs.mkdir(finalExportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }

    // Export DBF files
    const result = await exportTournamentDBF(db, tournamentId, finalExportPath);

    if (result.success) {
      res.json({
        success: true,
        message: 'DBF files exported successfully',
        tournament: {
          id: tournament.id,
          name: tournament.name,
          rounds: tournament.rounds,
          format: tournament.format
        },
        files: result.files,
        exportPath: result.exportPath
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to export DBF files'
      });
    }
  } catch (error) {
    console.error('DBF export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to export DBF files'
    });
  }
});

/**
 * Download exported DBF files as a ZIP archive
 * GET /api/export/dbf/:tournamentId/download
 */
router.get('/dbf/:tournamentId/download', async (req, res) => {
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

    const exportPath = path.join(__dirname, '../exports');
    const tournamentExportPath = path.join(exportPath, tournamentId);

    // Check if files exist
    const files = ['THEXPORT.DBF', 'TSEXPORT.DBF', 'TDEXPORT.DBF'];
    const filePaths = files.map(file => path.join(tournamentExportPath, file));

    // Check if all files exist
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
      } catch (error) {
        // Files don't exist, export them first
        const result = await exportTournamentDBF(db, tournamentId, tournamentExportPath);
        if (!result.success) {
          return res.status(500).json({
            success: false,
            error: result.error,
            message: 'Failed to export DBF files'
          });
        }
        break;
      }
    }

    // Create ZIP file
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_USCF_Export.zip"`);

    archive.pipe(res);

    // Add DBF files to archive
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      archive.file(filePath, { name: fileName });
    }

    await archive.finalize();

  } catch (error) {
    console.error('DBF download error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to download DBF files'
    });
  }
});

/**
 * Get export status and available files for a tournament
 * GET /api/export/status/:tournamentId
 */
router.get('/status/:tournamentId', async (req, res) => {
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

    const exportPath = path.join(__dirname, '../exports');
    const tournamentExportPath = path.join(exportPath, tournamentId);

    // Ensure export directory exists
    try {
      await fs.mkdir(tournamentExportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }

    // Check which files exist
    const files = ['THEXPORT.DBF', 'TSEXPORT.DBF', 'TDEXPORT.DBF'];
    const fileStatus = {};
    let needsExport = false;

    for (const file of files) {
      const filePath = path.join(tournamentExportPath, file);
      try {
        const stats = await fs.stat(filePath);
        fileStatus[file] = {
          exists: true,
          size: stats.size,
          modified: stats.mtime,
          path: filePath
        };
      } catch (error) {
        fileStatus[file] = {
          exists: false,
          size: 0,
          modified: null,
          path: filePath
        };
        needsExport = true;
      }
    }

    // If any files are missing, automatically generate them
    if (needsExport) {
      console.log('Some DBF files are missing, generating them automatically...');
      try {
        const result = await exportTournamentDBF(db, tournamentId, tournamentExportPath);
        if (result.success) {
          // Re-check file status after generation
          for (const file of files) {
            const filePath = path.join(tournamentExportPath, file);
            try {
              const stats = await fs.stat(filePath);
              fileStatus[file] = {
                exists: true,
                size: stats.size,
                modified: stats.mtime,
                path: filePath
              };
            } catch (error) {
              fileStatus[file] = {
                exists: false,
                size: 0,
                modified: null,
                path: filePath
              };
            }
          }
        }
      } catch (error) {
        console.error('Failed to auto-generate DBF files:', error);
      }
    }

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        rounds: tournament.rounds,
        format: tournament.format,
        status: tournament.status
      },
      exportPath: tournamentExportPath,
      files: fileStatus,
      allFilesExist: Object.values(fileStatus).every(file => file.exists)
    });

  } catch (error) {
    console.error('Export status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get export status'
    });
  }
});

module.exports = router;

