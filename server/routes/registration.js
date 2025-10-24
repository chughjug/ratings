const express = require('express');
const path = require('path');
const db = require('../database');
const router = express.Router();

// Serve registration form for a specific tournament
router.get('/:tournamentId', (req, res) => {
  const { tournamentId } = req.params;
  
  // Verify tournament exists
  db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) {
      console.error('Error fetching tournament:', err);
      return res.status(500).send('Internal server error');
    }
    
    if (!tournament) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tournament Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">Tournament Not Found</h1>
          <p>The tournament you're looking for doesn't exist or has been removed.</p>
        </body>
        </html>
      `);
    }
    
    // Serve the registration form with tournament data
    const registrationFormPath = path.join(__dirname, '../../registration-form-example.html');
    res.sendFile(registrationFormPath, (err) => {
      if (err) {
        console.error('Error serving registration form:', err);
        res.status(500).send('Error loading registration form');
      }
    });
  });
});

// Get tournament registration info (for API)
router.get('/:tournamentId/info', (req, res) => {
  const { tournamentId } = req.params;
  
  db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) {
      console.error('Error fetching tournament:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tournament'
      });
    }
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }
    
    const baseUrl = req.protocol + '://' + req.get('host');
    
    res.json({
      success: true,
      data: {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          rounds: tournament.rounds,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          city: tournament.city,
          state: tournament.state,
          location: tournament.location,
          allow_registration: tournament.allow_registration
        },
        registration_url: `${baseUrl}/register/${tournamentId}`,
        api_endpoints: {
          register_player: `${baseUrl}/api/players/register/${tournamentId}`,
          import_players: `${baseUrl}/api/players/api-import/${tournamentId}`,
          get_players: `${baseUrl}/api/players/tournament/${tournamentId}`
        },
        supported_fields: [
          'name', 'uscf_id', 'fide_id', 'rating', 'section', 'school', 'grade',
          'email', 'phone', 'state', 'city', 'notes', 'parent_name', 'parent_email',
          'parent_phone', 'emergency_contact', 'emergency_phone', 'tshirt_size',
          'dietary_restrictions', 'special_needs'
        ]
      }
    });
  });
});

// Get Google Forms Connector configuration for a specific tournament
router.get('/:tournamentId/forms-config', (req, res) => {
  const { tournamentId } = req.params;
  
  db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) {
      console.error('Error fetching tournament:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tournament'
      });
    }
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }
    
    // Build the dynamic API base URL using the request's protocol and host
    const apiBaseUrl = req.protocol + '://' + req.get('host');
    
    // Parse settings if they exist
    let settings = {};
    try {
      if (tournament.settings) {
        settings = typeof tournament.settings === 'string' 
          ? JSON.parse(tournament.settings) 
          : tournament.settings;
      }
    } catch (e) {
      console.warn('Failed to parse tournament settings:', e);
    }
    
    // Extract Google Forms settings from tournament settings
    const formsSettings = settings.google_forms_config || {};
    
    res.json({
      success: true,
      data: {
        // Core configuration - DYNAMICALLY POPULATED
        ENABLE_FORM_IMPORT: formsSettings.ENABLE_FORM_IMPORT !== false,
        FORM_ID: formsSettings.FORM_ID || '',
        API_BASE_URL: apiBaseUrl,  // DYNAMIC - from request
        API_KEY: process.env.API_KEY || 'demo-key-123',
        TOURNAMENT_ID: tournamentId,
        CHECK_INTERVAL: formsSettings.CHECK_INTERVAL || 5,
        
        // Import options
        SEND_CONFIRMATION_EMAILS: formsSettings.SEND_CONFIRMATION_EMAILS !== false,
        AUTO_ASSIGN_SECTIONS: formsSettings.AUTO_ASSIGN_SECTIONS !== false,
        LOOKUP_RATINGS: formsSettings.LOOKUP_RATINGS !== false,
        
        // Tournament metadata
        tournament: {
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          rounds: tournament.rounds,
          city: tournament.city,
          state: tournament.state,
          location: tournament.location,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          allow_registration: tournament.allow_registration
        }
      }
    });
  });
});

module.exports = router;

