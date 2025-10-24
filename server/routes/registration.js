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

// Get Google Forms configuration for a tournament
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
    
    const baseUrl = req.protocol + '://' + req.get('host');
    
    // Parse settings to extract Google Forms configuration
    let googleFormsConfig = {};
    if (tournament.settings) {
      try {
        const settings = JSON.parse(tournament.settings);
        googleFormsConfig = settings.googleForms || settings.forms || {};
      } catch (parseError) {
        console.error('Error parsing tournament settings:', parseError);
      }
    }
    
    res.json({
      success: true,
      API_BASE_URL: baseUrl,
      TOURNAMENT_ID: tournamentId,
      TOURNAMENT_NAME: tournament.name,
      FORM_ID: googleFormsConfig.formId || null,
      SHEET_ID: googleFormsConfig.sheetId || null,
      SHEET_NAME: googleFormsConfig.sheetName || 'Responses',
      AUTO_SYNC: googleFormsConfig.autoSync !== false,
      SYNC_INTERVAL: googleFormsConfig.syncInterval || 5,
      WEBHOOK_URL: googleFormsConfig.webhookUrl || null,
      api_endpoints: {
        import_players: `${baseUrl}/api/players/api-import/${tournamentId}`,
        get_tournament: `${baseUrl}/api/registration/${tournamentId}/info`
      },
      supported_fields: [
        'name', 'uscf_id', 'rating', 'section', 'school', 'grade',
        'email', 'phone', 'state', 'city', 'notes', 'parent_name', 'parent_email'
      ]
    });
  });
});

module.exports = router;

