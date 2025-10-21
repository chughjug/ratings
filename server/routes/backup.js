const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { 
  authenticate, 
  authorize, 
  logAudit 
} = require('../middleware/auth');
const { 
  createBackup, 
  restoreBackup, 
  getBackups, 
  deleteBackup, 
  exportTournament 
} = require('../services/backup');

const router = express.Router();

/**
 * Create database backup
 * POST /api/backup/create
 */
router.post('/create', authenticate, authorize(['admin', 'td']), async (req, res) => {
  try {
    const backup = await createBackup();

    // Log audit
    logAudit('CREATE', 'backup', backup.backupId, null, { fileName: backup.fileName }, req);

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

/**
 * Get list of available backups
 * GET /api/backup/list
 */
router.get('/list', authenticate, authorize(['admin', 'td']), async (req, res) => {
  try {
    const result = await getBackups();

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backups'
    });
  }
});

/**
 * Download backup file
 * GET /api/backup/download/:fileName
 */
router.get('/download/:fileName', authenticate, authorize(['admin', 'td']), async (req, res) => {
  try {
    const { fileName } = req.params;
    const backupDir = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, fileName);

    // Validate file name to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file name'
      });
    }

    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }

    // Log audit
    logAudit('DOWNLOAD', 'backup', fileName, null, null, req);

    res.download(backupPath, fileName);

  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download backup'
    });
  }
});

/**
 * Restore database from backup
 * POST /api/backup/restore
 */
router.post('/restore', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'File name is required'
      });
    }

    const backupDir = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, fileName);

    // Validate file name to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file name'
      });
    }

    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }

    const result = await restoreBackup(backupPath);

    // Log audit
    logAudit('RESTORE', 'backup', fileName, null, { restoredTables: result.restoredTables }, req);

    res.json({
      success: true,
      message: 'Database restored successfully',
      data: result
    });

  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup'
    });
  }
});

/**
 * Delete backup file
 * DELETE /api/backup/:fileName
 */
router.delete('/:fileName', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { fileName } = req.params;

    // Validate file name to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file name'
      });
    }

    const result = await deleteBackup(fileName);

    // Log audit
    logAudit('DELETE', 'backup', fileName, null, null, req);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
      data: result
    });

  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup'
    });
  }
});

/**
 * Export tournament data
 * POST /api/backup/export-tournament
 */
router.post('/export-tournament', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.body;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    const result = await exportTournament(tournamentId);

    // Log audit
    logAudit('EXPORT', 'tournament', tournamentId, null, { fileName: result.fileName }, req);

    res.json({
      success: true,
      message: 'Tournament exported successfully',
      data: result
    });

  } catch (error) {
    console.error('Export tournament error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export tournament'
    });
  }
});

/**
 * Download tournament export
 * GET /api/backup/export/:fileName
 */
router.get('/export/:fileName', authenticate, async (req, res) => {
  try {
    const { fileName } = req.params;
    const exportDir = path.join(__dirname, '../exports');
    const exportPath = path.join(exportDir, fileName);

    // Validate file name to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file name'
      });
    }

    try {
      await fs.access(exportPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Export file not found'
      });
    }

    // Log audit
    logAudit('DOWNLOAD', 'export', fileName, null, null, req);

    res.download(exportPath, fileName);

  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download export'
    });
  }
});

module.exports = router;
