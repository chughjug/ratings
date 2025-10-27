const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../database');
const { searchUSChessPlayers } = require('../services/playerSearch');
const { lookupAndUpdatePlayer } = require('../services/ratingLookup');
const router = express.Router();

// Helper function to assign section based on tournament settings and player rating
async function assignSectionToPlayer(db, tournamentId, playerRating) {
  return new Promise((resolve, reject) => {
    // Get tournament settings
    db.get('SELECT settings FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!tournament || !tournament.settings) {
        resolve('Open'); // Default to Open section when no sections defined
        return;
      }
      
      try {
        const settings = JSON.parse(tournament.settings);
        const sections = settings.sections || [];
        
        if (sections.length === 0) {
          resolve('Open'); // Default to Open section when no sections defined
          return;
        }
        
        // Find the appropriate section based on rating
        for (const section of sections) {
          const minRating = section.min_rating || 0;
          const maxRating = section.max_rating || Infinity;
          
          if (playerRating >= minRating && playerRating <= maxRating) {
            resolve(section.name);
            return;
          }
        }
        
        // If no section matches, assign to the first section or Open
        resolve(sections.length > 0 ? sections[0].name : 'Open');
      } catch (parseError) {
        console.error('Error parsing tournament settings:', parseError);
        resolve('Open'); // Default to Open section on error
      }
    });
  });
}

// Get tournament information for registration
router.get('/tournament/:tournamentId/info', (req, res) => {
  const { tournamentId } = req.params;
  
  db.get('SELECT id, name, format, rounds, start_date, end_date, settings, allow_registration, registration_settings, entry_fee, paypal_client_id, paypal_secret, stripe_publishable_key, stripe_secret_key, payment_method, organization_id FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) {
      console.error('Error fetching tournament info:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch tournament information' 
      });
    }
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false,
        error: 'Tournament not found' 
      });
    }
    
    // Parse settings to extract sections
    let sections = [];
    
    if (tournament.settings) {
      try {
        const settings = JSON.parse(tournament.settings);
        sections = settings.sections || [];
      } catch (parseError) {
        console.error('Error parsing tournament settings:', parseError);
      }
    }
    
    // Get entry fee and payment credentials from tournament (TD) level first
    // Then fall back to organization level if empty
    const entry_fee = tournament.entry_fee || 0;
    const payment_enabled = Boolean(entry_fee > 0);
    
    // Start with tournament-level credentials
    let payment_settings = {
      payment_method: tournament.payment_method || 'both',
      paypal_client_id: tournament.paypal_client_id || '',
      paypal_secret: tournament.paypal_secret || '',
      stripe_publishable_key: tournament.stripe_publishable_key || '',
      stripe_secret_key: tournament.stripe_secret_key || ''
    };
    
    console.log('🔍 Reading tournament payment settings from database:', {
      tournament_id: tournament.id,
      payment_method: payment_settings.payment_method,
      entry_fee: entry_fee,
      paypal_client_id: payment_settings.paypal_client_id ? 'SET (length: ' + payment_settings.paypal_client_id.length + ')' : 'EMPTY',
      stripe_publishable_key: payment_settings.stripe_publishable_key ? 'SET (length: ' + payment_settings.stripe_publishable_key.length + ')' : 'EMPTY'
    });
    
    // Parse registration settings for custom fields AND payment credentials fallback
    let custom_fields = [];
    let registration_form_settings = {};
    
    if (tournament.registration_settings) {
      try {
        const regSettings = JSON.parse(tournament.registration_settings);
        console.log('🔍 Parsed registration settings:', JSON.stringify(regSettings, null, 2));
        // Support both camelCase (new) and snake_case (old) for backward compatibility
        custom_fields = regSettings.customFields || regSettings.custom_fields || [];
        console.log('📋 Custom fields extracted:', custom_fields.length, custom_fields);
        registration_form_settings = regSettings.form_settings || {};
        
        // Fallback: If tournament columns are empty, try to get payment credentials from registration_settings
        if (!payment_settings.paypal_client_id && !payment_settings.stripe_publishable_key) {
          console.log('🔄 Tournament columns empty, checking registration_settings for payment credentials...');
          if (regSettings.paypal_client_id || regSettings.stripe_publishable_key) {
            payment_settings = {
              payment_method: regSettings.payment_method || payment_settings.payment_method,
              paypal_client_id: regSettings.paypal_client_id || payment_settings.paypal_client_id || '',
              paypal_secret: regSettings.paypal_secret || payment_settings.paypal_secret || '',
              stripe_publishable_key: regSettings.stripe_publishable_key || payment_settings.stripe_publishable_key || '',
              stripe_secret_key: regSettings.stripe_secret_key || payment_settings.stripe_secret_key || ''
            };
            console.log('✅ Using payment credentials from registration_settings!');
          }
        }
      } catch (parseError) {
        console.error('Error parsing registration settings:', parseError);
        console.log('Raw registration_settings value:', tournament.registration_settings);
      }
    } else {
      console.log('⚠️ No registration_settings found in database');
    }
    
    console.log('📤 Sending response with payment_settings:', {
      paypal_client_id: payment_settings.paypal_client_id ? 'SET (length: ' + payment_settings.paypal_client_id.length + ')' : 'EMPTY',
      stripe_publishable_key: payment_settings.stripe_publishable_key ? 'SET (length: ' + payment_settings.stripe_publishable_key.length + ')' : 'EMPTY',
      custom_fields_count: custom_fields.length
    });
    
    res.json({ 
      success: true,
      data: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        rounds: tournament.rounds,
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        entry_fee: entry_fee,
        payment_enabled: payment_enabled,
        payment_settings: payment_settings,
        sections: sections,
        custom_fields: custom_fields,
        registration_form_settings: registration_form_settings,
        allow_registration: Boolean(tournament.allow_registration)
      }
    });
  });
});

// Search for players by name (public endpoint for registration)
router.get('/search-players', async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    console.log(`Registration search request: term="${searchTerm}", limit=${limit}`);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters'
      });
    }

    console.log(`Starting player search for registration: ${searchTerm}`);
    
    // Use US Chess search
    const players = await searchUSChessPlayers(searchTerm.trim(), parseInt(limit));
    console.log(`Registration search completed. Found ${players.length} players`);
    
    res.json({
      success: true,
      data: {
        players,
        count: players.length
      }
    });
  } catch (error) {
    console.error('Error searching players for registration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search players'
    });
  }
});

// Submit tournament registration
router.post('/submit', async (req, res) => {
  try {
    const {
      tournament_id,
      player_name,
      uscf_id,
      rating,
      email,
      phone,
      section,
      team_name, // Add team_name support
      fide_id, // Add fide_id support
      bye_requests = [],
      notes,
      custom_fields, // Add custom fields support
      payment_amount, // Payment amount
      payment_method, // Payment method (stripe, paypal, etc.)
      payment_intent_id, // Payment intent/transaction ID
      payment_status = 'pending' // Payment status
    } = req.body;

    // Validate required fields
    if (!tournament_id || !player_name || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Tournament ID, player name, and email are required' 
      });
    }

    // Check if tournament exists and registration is allowed
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, allow_registration FROM tournaments WHERE id = ?', [tournament_id], (err, row) => {
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

    // Check if registration is allowed
    if (tournament.allow_registration === 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Registration is currently closed for this tournament' 
      });
    }

    // Check if player is already registered
    const existingPlayer = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM players WHERE tournament_id = ? AND (name = ? OR uscf_id = ?)', 
        [tournament_id, player_name, uscf_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingPlayer) {
      return res.status(409).json({ 
        success: false,
        error: 'Player is already registered for this tournament' 
      });
    }

    const playerId = uuidv4();
    let finalRating = rating || null;
    let finalSection = section;

    // If player has a USCF ID, look up their rating and expiration date
    let ratingLookupResult = null;
    if (uscf_id && uscf_id.trim() !== '') {
      try {
        ratingLookupResult = await lookupAndUpdatePlayer(db, playerId, uscf_id);
        if (ratingLookupResult.success) {
          finalRating = ratingLookupResult.rating;
          console.log(`✅ Successfully looked up rating for ${player_name} (${uscf_id}): ${ratingLookupResult.rating}`);
        } else {
          console.warn(`⚠️ Failed to look up rating for ${player_name} (${uscf_id}): ${ratingLookupResult.error}`);
        }
      } catch (error) {
        console.error(`Error looking up rating for ${player_name} (${uscf_id}):`, error.message);
        ratingLookupResult = {
          success: false,
          error: error.message
        };
      }
    }

    // Auto-assign section if not provided and rating is available
    if (!finalSection && finalRating) {
      try {
        finalSection = await assignSectionToPlayer(db, tournament_id, finalRating);
        if (finalSection) {
          console.log(`📋 Auto-assigned ${player_name} to section: ${finalSection}`);
        }
      } catch (error) {
        console.error(`Error assigning section for ${player_name}:`, error);
      }
    }

    // Store registration data
    const registrationId = uuidv4();
    
    // Combine notes with custom fields data
    let finalNotes = notes || '';
    if (custom_fields && Array.isArray(custom_fields) && custom_fields.length > 0) {
      const customFieldsData = custom_fields.map(f => 
        `${f.label}: ${f.value}${f.linkedField ? ` (→ ${f.linkedField})` : ''}`
      ).join('; ');
      finalNotes = finalNotes ? `${finalNotes}. Custom Fields: ${customFieldsData}` : `Custom Fields: ${customFieldsData}`;
    }
    
    // Insert registration record with payment information
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO registrations (id, tournament_id, player_name, uscf_id, email, phone, section, bye_requests, notes, status, created_at, payment_amount, payment_method, payment_id, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)`,
        [registrationId, tournament_id, player_name, uscf_id, email, phone, finalSection, 
         JSON.stringify(bye_requests), finalNotes, 'pending',
         payment_amount || null, payment_method || null, payment_intent_id || null, payment_status],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Map custom linked fields to their database columns
    let mappedSection = finalSection;
    let mappedTeamName = team_name;
    
    // Process custom fields to map linked fields
    if (custom_fields && Array.isArray(custom_fields)) {
      for (const customField of custom_fields) {
        if (customField.linkedField && customField.value) {
          // Map linked fields to database columns
          if (customField.linkedField === 'section') {
            mappedSection = customField.value;
          } else if (customField.linkedField === 'team') {
            mappedTeamName = customField.value;
          }
        }
      }
    }
    
    // Insert player record with pending status
    await new Promise((resolve, reject) => {
      // Convert bye_requests array to intentional_bye_rounds string format (comma-separated)
      const intentionalByeRounds = bye_requests.length > 0 
        ? bye_requests.join(',') 
        : null;
      
      const playerValues = [playerId, tournament_id, player_name, uscf_id, fide_id, finalRating, mappedSection, mappedTeamName, 'pending',
         ratingLookupResult?.expirationDate || null,
         intentionalByeRounds, 
         notes ? `Registration: ${notes}` : 'Public Registration',
         email, phone];
      
      console.log('Inserting player with bye requests:', bye_requests, '→ intentional_bye_rounds:', intentionalByeRounds);
      console.log('Inserting player with values:', playerValues);
      
      db.run(
        `INSERT INTO players (id, tournament_id, name, uscf_id, fide_id, rating, section, team_name, status, expiration_date, intentional_bye_rounds, notes, email, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        playerValues,
        function(err) {
          if (err) {
            console.error('Error inserting player:', err);
            reject(err);
          } else {
            console.log('Player inserted successfully with ID:', playerId);
            resolve();
          }
        }
      );
    });

    res.json({ 
      success: true,
      data: { 
        registration_id: registrationId,
        player_id: playerId 
      },
      message: 'Registration submitted successfully. Tournament Director will review and approve your registration.',
      ratingLookup: ratingLookupResult,
      autoAssignedSection: finalSection
    });

  } catch (error) {
    console.error('Error submitting registration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit registration' 
    });
  }
});

// Get registration status (public endpoint)
router.get('/status/:registrationId', (req, res) => {
  const { registrationId } = req.params;
  
  db.get(
    `SELECT r.*, t.name as tournament_name, p.status as player_status 
     FROM registrations r 
     JOIN tournaments t ON r.tournament_id = t.id 
     LEFT JOIN players p ON r.tournament_id = p.tournament_id AND r.player_name = p.name
     WHERE r.id = ?`,
    [registrationId],
    (err, registration) => {
      if (err) {
        console.error('Error fetching registration status:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to fetch registration status' 
        });
      }
      
      if (!registration) {
        return res.status(404).json({ 
          success: false,
          error: 'Registration not found' 
        });
      }
      
      res.json({ 
        success: true,
        data: registration
      });
    }
  );
});

// Get all registrations for a tournament (TD only - requires authentication)
router.get('/tournament/:tournamentId/registrations', (req, res) => {
  const { tournamentId } = req.params;
  
  db.all(
    `SELECT r.*, p.status as player_status, p.id as player_id
     FROM registrations r 
     LEFT JOIN players p ON r.tournament_id = p.tournament_id AND r.player_name = p.name
     WHERE r.tournament_id = ?
     ORDER BY r.created_at DESC`,
    [tournamentId],
    (err, registrations) => {
      if (err) {
        console.error('Error fetching registrations:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to fetch registrations' 
        });
      }
      
      res.json({ 
        success: true,
        data: registrations
      });
    }
  );
});

// Approve registration (TD only - requires authentication)
router.post('/:registrationId/approve', (req, res) => {
  const { registrationId } = req.params;
  const { notes } = req.body;
  
  db.run('BEGIN TRANSACTION');
  
  // Update registration status
  db.run(
    'UPDATE registrations SET status = ?, approved_at = datetime("now"), approval_notes = ? WHERE id = ?',
    ['approved', notes, registrationId],
    function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error approving registration:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to approve registration' 
        });
      }
      
      // Update player status
      db.run(
        `UPDATE players SET status = 'active' 
         WHERE tournament_id = (SELECT tournament_id FROM registrations WHERE id = ?) 
         AND name = (SELECT player_name FROM registrations WHERE id = ?)`,
        [registrationId, registrationId],
        function(err2) {
          if (err2) {
            db.run('ROLLBACK');
            console.error('Error updating player status:', err2);
            return res.status(500).json({ 
              success: false,
              error: 'Failed to update player status' 
            });
          }
          
          db.run('COMMIT');
          res.json({ 
            success: true,
            message: 'Registration approved successfully' 
          });
        }
      );
    }
  );
});

// Reject registration (TD only - requires authentication)
router.post('/:registrationId/reject', (req, res) => {
  const { registrationId } = req.params;
  const { notes } = req.body;
  
  db.run(
    'UPDATE registrations SET status = ?, rejected_at = datetime("now"), rejection_notes = ? WHERE id = ?',
    ['rejected', notes, registrationId],
    function(err) {
      if (err) {
        console.error('Error rejecting registration:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to reject registration' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Registration rejected' 
      });
    }
  );
});

// Serve registration form for a specific tournament
router.get('/form/:tournamentId', (req, res) => {
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

module.exports = router;


