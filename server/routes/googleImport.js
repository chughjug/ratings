const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { googleSheetsImportService } = require('../services/googleSheetsImport');
const { smartImportService } = require('../services/smartImport');
const { importPlayersFromCSV } = require('../services/csvImport');
const { assignSectionToPlayer } = require('./players');
const router = express.Router();

/**
 * Google Sheets and Forms Import Routes
 * Provides API endpoints for importing player data from Google Sheets and Forms
 */

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Google Import router is working' });
});

/**
 * Import players from Google Sheets
 * POST /api/google-import/sheets
 */
router.post('/sheets', async (req, res) => {
  try {
    const {
      spreadsheet_id,
      range = 'Sheet1!A1:Z1000',
      tournament_id,
      lookup_ratings = true,
      auto_assign_sections = true,
      api_key
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Validate required fields
    if (!spreadsheet_id) {
      return res.status(400).json({
        success: false,
        error: 'Spreadsheet ID is required'
      });
    }

    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournament_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    console.log(`📊 Starting Google Sheets import for tournament: ${tournament.name}`);
    console.log(`📋 Spreadsheet ID: ${spreadsheet_id}`);
    console.log(`📏 Range: ${range}`);

    // Import from Google Sheets
    const importResult = await googleSheetsImportService.importFromSheets(
      spreadsheet_id,
      range,
      { lookup_ratings, auto_assign_sections }
    );

    if (!importResult.success) {
      return res.status(400).json({
        success: false,
        error: importResult.error,
        players: []
      });
    }

    const { players, errors } = importResult;

    if (players.length === 0) {
      return res.json({
        success: true,
        message: 'No valid players found in the spreadsheet',
        data: {
          tournament_id,
          tournament_name: tournament.name,
          imported_count: 0,
          errors: errors
        }
      });
    }

    // Import players into database
    const dbResult = await importPlayersFromCSV(db, tournament_id, players, lookup_ratings);

    // Auto-assign sections if requested
    if (auto_assign_sections && dbResult.ratingLookupResults) {
      for (const lookupResult of dbResult.ratingLookupResults) {
        if (lookupResult.success && lookupResult.rating) {
          try {
            const assignedSection = await assignSectionToPlayer(db, tournament_id, lookupResult.rating);
            if (assignedSection) {
              // Find the player ID and update their section
              const playerId = dbResult.playerIds.find((id, index) => 
                dbResult.ratingLookupResults[index] === lookupResult
              );
              if (playerId) {
                await new Promise((resolve, reject) => {
                  db.run('UPDATE players SET section = ? WHERE id = ?', [assignedSection, playerId], (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                });
              }
            }
          } catch (error) {
            console.error(`Error auto-assigning section for player:`, error);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${dbResult.importedCount} players from Google Sheets`,
      data: {
        tournament_id,
        tournament_name: tournament.name,
        imported_count: dbResult.importedCount,
        player_ids: dbResult.playerIds,
        rating_lookup_results: dbResult.ratingLookupResults || [],
        import_errors: dbResult.importErrors || [],
        validation_errors: errors,
        metadata: importResult.metadata
      }
    });

  } catch (error) {
    console.error('Error importing from Google Sheets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import from Google Sheets',
      details: error.message
    });
  }
});

/**
 * Import players from Google Forms
 * POST /api/google-import/forms
 */
router.post('/forms', async (req, res) => {
  try {
    const {
      form_id,
      tournament_id,
      lookup_ratings = true,
      auto_assign_sections = true,
      api_key
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Validate required fields
    if (!form_id) {
      return res.status(400).json({
        success: false,
        error: 'Form ID is required'
      });
    }

    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournament_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    console.log(`📝 Starting Google Forms import for tournament: ${tournament.name}`);
    console.log(`📋 Form ID: ${form_id}`);

    // Import from Google Forms
    const importResult = await googleSheetsImportService.importFromForms(
      form_id,
      { lookup_ratings, auto_assign_sections }
    );

    if (!importResult.success) {
      return res.status(400).json({
        success: false,
        error: importResult.error,
        players: []
      });
    }

    const { players, errors } = importResult;

    if (players.length === 0) {
      return res.json({
        success: true,
        message: 'No valid players found in the form responses',
        data: {
          tournament_id,
          tournament_name: tournament.name,
          imported_count: 0,
          errors: errors
        }
      });
    }

    // Import players into database
    const dbResult = await importPlayersFromCSV(db, tournament_id, players, lookup_ratings);

    // Auto-assign sections if requested
    if (auto_assign_sections && dbResult.ratingLookupResults) {
      for (const lookupResult of dbResult.ratingLookupResults) {
        if (lookupResult.success && lookupResult.rating) {
          try {
            const assignedSection = await assignSectionToPlayer(db, tournament_id, lookupResult.rating);
            if (assignedSection) {
              // Find the player ID and update their section
              const playerId = dbResult.playerIds.find((id, index) => 
                dbResult.ratingLookupResults[index] === lookupResult
              );
              if (playerId) {
                await new Promise((resolve, reject) => {
                  db.run('UPDATE players SET section = ? WHERE id = ?', [assignedSection, playerId], (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                });
              }
            }
          } catch (error) {
            console.error(`Error auto-assigning section for player:`, error);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${dbResult.importedCount} players from Google Forms`,
      data: {
        tournament_id,
        tournament_name: tournament.name,
        imported_count: dbResult.importedCount,
        player_ids: dbResult.playerIds,
        rating_lookup_results: dbResult.ratingLookupResults || [],
        import_errors: dbResult.importErrors || [],
        validation_errors: errors,
        metadata: importResult.metadata
      }
    });

  } catch (error) {
    console.error('Error importing from Google Forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import from Google Forms',
      details: error.message
    });
  }
});

/**
 * Get Google Sheets information
 * GET /api/google-import/sheets/info
 */
router.get('/sheets/info', async (req, res) => {
  try {
    const { spreadsheet_id, api_key } = req.query;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    if (!spreadsheet_id) {
      return res.status(400).json({
        success: false,
        error: 'Spreadsheet ID is required'
      });
    }

    const info = await googleSheetsImportService.getSpreadsheetInfo(spreadsheet_id);
    
    if (!info.success) {
      return res.status(400).json({
        success: false,
        error: info.error
      });
    }

    res.json({
      success: true,
      data: info.data
    });

  } catch (error) {
    console.error('Error getting spreadsheet info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get spreadsheet information',
      details: error.message
    });
  }
});

/**
 * Get Google Forms information
 * GET /api/google-import/forms/info
 */
router.get('/forms/info', async (req, res) => {
  try {
    const { form_id, api_key } = req.query;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    if (!form_id) {
      return res.status(400).json({
        success: false,
        error: 'Form ID is required'
      });
    }

    const info = await googleSheetsImportService.getFormInfo(form_id);
    
    if (!info.success) {
      return res.status(400).json({
        success: false,
        error: info.error
      });
    }

    res.json({
      success: true,
      data: info.data
    });

  } catch (error) {
    console.error('Error getting form info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get form information',
      details: error.message
    });
  }
});

/**
 * Preview Google Sheets data without importing
 * POST /api/google-import/sheets/preview
 */
router.post('/sheets/preview', async (req, res) => {
  try {
    const {
      spreadsheet_id,
      range = 'Sheet1!A1:Z1000',
      api_key
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    if (!spreadsheet_id) {
      return res.status(400).json({
        success: false,
        error: 'Spreadsheet ID is required'
      });
    }

    // Import from Google Sheets (preview only)
    const importResult = await googleSheetsImportService.importFromSheets(
      spreadsheet_id,
      range,
      { lookup_ratings: false, auto_assign_sections: false }
    );

    if (!importResult.success) {
      return res.status(400).json({
        success: false,
        error: importResult.error
      });
    }

    res.json({
      success: true,
      data: {
        players: importResult.players,
        errors: importResult.errors,
        metadata: importResult.metadata
      }
    });

  } catch (error) {
    console.error('Error previewing Google Sheets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview Google Sheets data',
      details: error.message
    });
  }
});

/**
 * Preview Google Forms data without importing
 * POST /api/google-import/forms/preview
 */
router.post('/forms/preview', async (req, res) => {
  try {
    const {
      form_id,
      api_key
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    if (!form_id) {
      return res.status(400).json({
        success: false,
        error: 'Form ID is required'
      });
    }

    // Import from Google Forms (preview only)
    const importResult = await googleSheetsImportService.importFromForms(
      form_id,
      { lookup_ratings: false, auto_assign_sections: false }
    );

    if (!importResult.success) {
      return res.status(400).json({
        success: false,
        error: importResult.error
      });
    }

    res.json({
      success: true,
      data: {
        players: importResult.players,
        errors: importResult.errors,
        metadata: importResult.metadata
      }
    });

  } catch (error) {
    console.error('Error previewing Google Forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview Google Forms data',
      details: error.message
    });
  }
});

/**
 * Smart import from Google Sheets with intelligent field mapping
 * POST /api/google-import/smart/sheets
 */
router.post('/smart/sheets', async (req, res) => {
  try {
    const {
      spreadsheet_id,
      tournament_id,
      range = 'Sheet1!A1:Z1000',
      lookup_ratings = true,
      auto_assign_sections = true,
      api_key
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Validate required fields
    if (!spreadsheet_id || !tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Spreadsheet ID and Tournament ID are required'
      });
    }

    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournament_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    console.log(`🧠 Starting smart import from Google Sheets for tournament: ${tournament.name}`);

    // Perform smart import
    const result = await smartImportService.smartImportFromSheets(
      spreadsheet_id,
      tournament_id,
      { range, lookup_ratings, auto_assign_sections }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Successfully imported ${result.data.imported_count} players using smart import`,
      data: result.data
    });

  } catch (error) {
    console.error('Error in smart import from sheets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform smart import from Google Sheets',
      details: error.message
    });
  }
});

/**
 * Smart import from Google Forms with intelligent field mapping
 * POST /api/google-import/smart/forms
 */
router.post('/smart/forms', async (req, res) => {
  try {
    const {
      form_id,
      tournament_id,
      lookup_ratings = true,
      auto_assign_sections = true,
      api_key
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Validate required fields
    if (!form_id || !tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Form ID and Tournament ID are required'
      });
    }

    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournament_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    console.log(`🧠 Starting smart import from Google Forms for tournament: ${tournament.name}`);

    // Perform smart import
    const result = await smartImportService.smartImportFromForms(
      form_id,
      tournament_id,
      { lookup_ratings, auto_assign_sections }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Successfully imported ${result.data.imported_count} players using smart import`,
      data: result.data
    });

  } catch (error) {
    console.error('Error in smart import from forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform smart import from Google Forms',
      details: error.message
    });
  }
});

module.exports = router;
