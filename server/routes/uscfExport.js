const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exportTournamentUSCF } = require('../services/uscfDbfExport');
const db = require('../database');
const router = express.Router();

/**
 * Export tournament data as USCF-compatible DBF files (Full Compliance)
 * GET /api/export/uscf/:tournamentId
 */
router.get('/uscf/:tournamentId', async (req, res) => {
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

    // Set default export path if not provided
    const finalExportPath = exportPath || path.join(__dirname, '../exports', tournamentId);

    // Ensure export directory exists
    try {
      await fs.mkdir(finalExportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }

    // Export USCF DBF files
    const result = await exportTournamentUSCF(db, tournamentId, finalExportPath);

    if (result.success) {
      res.json({
        success: true,
        message: 'USCF DBF files exported successfully with full compliance',
        tournament: {
          id: tournament.id,
          name: tournament.name,
          rounds: tournament.rounds,
          format: tournament.format
        },
        files: result.files,
        exportPath: result.exportPath,
        compliance: {
          standard: 'USCF Rating Report Data Standard',
          version: 'DBase IV',
          cardinality: '1:1:N (THEXPORT:TSEXPORT:TDEXPORT)',
          fieldPrecision: 'Fixed-length records with strict data types',
          roundSegmentation: '1-10 rounds: single record, 11-20 rounds: dual records'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to export USCF DBF files'
      });
    }
  } catch (error) {
    console.error('USCF export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to export USCF DBF files'
    });
  }
});

/**
 * Download USCF DBF files as ZIP
 * GET /api/export/uscf/:tournamentId/download
 */
router.get('/uscf/:tournamentId/download', async (req, res) => {
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

    // Check if files exist, if not generate them
    const files = ['THEXPORT.DBF', 'TSEXPORT.DBF', 'TDEXPORT.DBF'];
    const filePaths = files.map(file => path.join(exportPath, file));

    // Check if all files exist
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
      } catch (error) {
        // Files don't exist, export them first
        const result = await exportTournamentUSCF(db, tournamentId, exportPath);
        if (!result.success) {
          return res.status(500).json({
            success: false,
            error: result.error,
            message: 'Failed to export USCF DBF files'
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
    console.error('USCF ZIP download error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create USCF ZIP file'
    });
  }
});

/**
 * Get USCF export status and file information
 * GET /api/export/uscf/:tournamentId/status
 */
router.get('/uscf/:tournamentId/status', async (req, res) => {
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
    const files = ['THEXPORT.DBF', 'TSEXPORT.DBF', 'TDEXPORT.DBF'];
    
    const fileStatus = [];
    let allExist = true;

    for (const fileName of files) {
      const filePath = path.join(exportPath, fileName);
      try {
        const stats = await fs.stat(filePath);
        fileStatus.push({
          name: fileName,
          exists: true,
          size: stats.size,
          modified: stats.mtime,
          sizeFormatted: formatFileSize(stats.size)
        });
      } catch (error) {
        fileStatus.push({
          name: fileName,
          exists: false,
          size: 0,
          modified: null,
          sizeFormatted: '0 Bytes'
        });
        allExist = false;
      }
    }

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        rounds: tournament.rounds
      },
      exportStatus: {
        allFilesExist: allExist,
        files: fileStatus
      },
      compliance: {
        standard: 'USCF Rating Report Data Standard',
        description: 'Export tournament data in USCF-compatible DBF format for rating submission',
        files: {
          THEXPORT_DBF: 'Tournament Header - exactly one record',
          TSEXPORT_DBF: 'Section Header - one record per section',
          TDEXPORT_DBF: 'Player Details - variable records per section'
        }
      }
    });

  } catch (error) {
    console.error('USCF status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check USCF export status'
    });
  }
});

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
