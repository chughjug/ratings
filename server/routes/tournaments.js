const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const router = express.Router();
const { autoPopulatePrizes } = require('../services/prizeAutoPopulate');
const { calculateTiebreakers } = require('../utils/tiebreakers');
const { calculateAndDistributePrizes, getPrizeDistributions, autoAssignPrizesOnRoundCompletion } = require('../services/prizeService');
const { authenticate, verifyToken } = require('../middleware/auth');

// Optional authentication middleware - tries to authenticate but doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        // Check if user exists and is active
        const user = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id, username, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
            [decoded.userId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (user) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // If authentication fails, just continue without user info
    next();
  }
};

// Get all tournaments
router.get('/', optionalAuth, (req, res) => {
  const { organization_id, is_public } = req.query;
  
  let query = 'SELECT * FROM tournaments WHERE 1=1';
  const params = [];
  
  if (organization_id) {
    query += ' AND organization_id = ?';
    params.push(organization_id);
  }
  
  if (is_public !== undefined) {
    query += ' AND is_public = ?';
    params.push(is_public === 'true' ? 1 : 0);
  }
  
  // Hide tournaments with no organization from non-admin users
  // If user is authenticated and not admin, filter out tournaments without organization
  if (req.user && req.user.role !== 'admin') {
    query += ' AND organization_id IS NOT NULL';
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching tournaments:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch tournaments' 
      });
    }
    res.json({ 
      success: true,
      data: rows 
    });
  });
});

// Get tournament by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, tournament) => {
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
    res.json({ 
      success: true,
      data: tournament 
    });
  });
});

// Create new tournament
router.post('/', (req, res) => {
  try {
    const {
      organization_id,
      name,
      format,
      rounds,
      time_control,
      start_date,
      end_date,
      settings,
      city,
      state,
      location,
      chief_td_name,
      chief_td_uscf_id,
      chief_arbiter_name,
      chief_arbiter_fide_id,
      chief_organizer_name,
      chief_organizer_fide_id,
      expected_players,
      website,
      fide_rated,
      uscf_rated,
      allow_registration,
      is_public,
      public_url,
      logo_url,
      tournament_information
    } = req.body;

    console.log('Creating tournament with data:', { name, format, rounds });

    // Validate required fields
    if (!name || !format || !rounds) {
      console.error('Missing required fields:', { name: !!name, format: !!format, rounds: !!rounds });
      return res.status(400).json({ 
        success: false,
        error: 'Name, format, and rounds are required' 
      });
    }

    // Validate format
    if (!['swiss', 'online', 'quad', 'team-swiss'].includes(format)) {
      console.error('Invalid format:', format);
      return res.status(400).json({ 
        success: false,
        error: 'Format must be one of: swiss, online, quad, team-swiss' 
      });
    }

    const id = uuidv4();
    const settingsJson = JSON.stringify(settings || {});
    
    // Prepare parameters with proper null handling
    const params = [
      id,
      organization_id || null,
      name,
      format,
      rounds,
      time_control || null,
      start_date || null,
      end_date || null,
      'created',
      settingsJson,
      city || null,
      state || null,
      location || null,
      chief_td_name || null,
      chief_td_uscf_id || null,
      chief_arbiter_name || null,
      chief_arbiter_fide_id || null,
      chief_organizer_name || null,
      chief_organizer_fide_id || null,
      expected_players || null,
      website || null,
      fide_rated ? 1 : 0,
      uscf_rated ? 1 : 0,
      allow_registration !== false ? 1 : 0,
      is_public ? 1 : 0,
      public_url || null,
      logo_url || null,
      tournament_information || null
    ];

    console.log('Executing SQL with params:', params.length);

    db.run(
      `INSERT INTO tournaments (id, organization_id, name, format, rounds, time_control, start_date, end_date, status, settings,
                               city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
                               chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
                               expected_players, website, fide_rated, uscf_rated, allow_registration, is_public, public_url, logo_url, tournament_information)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
      function(err) {
        if (err) {
          console.error('Error creating tournament:', err);
          console.error('SQL Error details:', err.message);
          console.error('Error code:', err.code);
          console.error('SQL:', err.sql);
          console.error('Error stack:', err.stack);
          return res.status(500).json({ 
            success: false,
            error: 'Failed to create tournament',
            details: err.message,
            code: err.code
          });
        }
        console.log('Tournament created successfully with ID:', id);
        res.json({ 
          success: true,
          data: { id },
          message: 'Tournament created successfully' 
        });
      }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/tournaments:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update tournament
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;
  
  console.log('Update fields received:', Object.keys(updateFields));
  
  // If only a single field is being updated (like tournament_information), use dynamic SQL
  if (Object.keys(updateFields).length === 1 && updateFields.tournament_information !== undefined) {
    return db.run(
      'UPDATE tournaments SET tournament_information = ? WHERE id = ?',
      [updateFields.tournament_information, id],
      function(err) {
        if (err) {
          console.error('Error updating tournament:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Failed to update tournament',
            details: err.message 
          });
        }
        
        // Return the updated tournament data
        db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, tournament) => {
          if (err) {
            console.error('Error fetching updated tournament:', err);
            return res.json({ 
              success: true,
              message: 'Tournament updated successfully' 
            });
          }
          res.json({ 
            success: true,
            data: tournament,
            message: 'Tournament updated successfully' 
          });
        });
      }
    );
  }
  
  // For updates with multiple fields or the name/format/rounds, proceed with full update
  // First, get the existing tournament to support partial updates
  db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, existingTournament) => {
    if (err) {
      console.error('Error fetching existing tournament:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch tournament' 
      });
    }
    
    if (!existingTournament) {
      return res.status(404).json({ 
        success: false,
        error: 'Tournament not found' 
      });
    }
    
    // Merge existing data with update data - only use new values if they exist
    const organization_id = updateFields.organization_id !== undefined ? updateFields.organization_id : existingTournament.organization_id;
    const name = updateFields.name !== undefined ? updateFields.name : existingTournament.name;
    const format = updateFields.format !== undefined ? updateFields.format : existingTournament.format;
    const rounds = updateFields.rounds !== undefined ? updateFields.rounds : existingTournament.rounds;
    const time_control = updateFields.time_control !== undefined ? updateFields.time_control : existingTournament.time_control;
    const start_date = updateFields.start_date !== undefined ? updateFields.start_date : existingTournament.start_date;
    const end_date = updateFields.end_date !== undefined ? updateFields.end_date : existingTournament.end_date;
    const status = updateFields.status !== undefined ? updateFields.status : existingTournament.status;
    const settings = updateFields.settings !== undefined ? updateFields.settings : existingTournament.settings;
    const city = updateFields.city !== undefined ? updateFields.city : existingTournament.city;
    const state = updateFields.state !== undefined ? updateFields.state : existingTournament.state;
    const location = updateFields.location !== undefined ? updateFields.location : existingTournament.location;
    const chief_td_name = updateFields.chief_td_name !== undefined ? updateFields.chief_td_name : existingTournament.chief_td_name;
    const chief_td_uscf_id = updateFields.chief_td_uscf_id !== undefined ? updateFields.chief_td_uscf_id : existingTournament.chief_td_uscf_id;
    const chief_arbiter_name = updateFields.chief_arbiter_name !== undefined ? updateFields.chief_arbiter_name : existingTournament.chief_arbiter_name;
    const chief_arbiter_fide_id = updateFields.chief_arbiter_fide_id !== undefined ? updateFields.chief_arbiter_fide_id : existingTournament.chief_arbiter_fide_id;
    const chief_organizer_name = updateFields.chief_organizer_name !== undefined ? updateFields.chief_organizer_name : existingTournament.chief_organizer_name;
    const chief_organizer_fide_id = updateFields.chief_organizer_fide_id !== undefined ? updateFields.chief_organizer_fide_id : existingTournament.chief_organizer_fide_id;
    const expected_players = updateFields.expected_players !== undefined ? updateFields.expected_players : existingTournament.expected_players;
    const website = updateFields.website !== undefined ? updateFields.website : existingTournament.website;
    const fide_rated = updateFields.fide_rated !== undefined ? updateFields.fide_rated : existingTournament.fide_rated;
    const uscf_rated = updateFields.uscf_rated !== undefined ? updateFields.uscf_rated : existingTournament.uscf_rated;
    const allow_registration = updateFields.allow_registration !== undefined ? updateFields.allow_registration : existingTournament.allow_registration;
    const is_public = updateFields.is_public !== undefined ? updateFields.is_public : existingTournament.is_public;
    const public_url = updateFields.public_url !== undefined ? updateFields.public_url : existingTournament.public_url;
    const logo_url = updateFields.logo_url !== undefined ? updateFields.logo_url : existingTournament.logo_url;
    const tournament_information = updateFields.tournament_information !== undefined ? updateFields.tournament_information : existingTournament.tournament_information;
    const public_display_config = updateFields.public_display_config !== undefined ? updateFields.public_display_config : existingTournament.public_display_config;
    const registration_settings = updateFields.registration_settings !== undefined ? updateFields.registration_settings : existingTournament.registration_settings;
    
    // Extract payment fields
    const entry_fee = updateFields.entry_fee !== undefined ? updateFields.entry_fee : existingTournament.entry_fee;
    const paypal_client_id = updateFields.paypal_client_id !== undefined ? updateFields.paypal_client_id : existingTournament.paypal_client_id;
    const paypal_secret = updateFields.paypal_secret !== undefined ? updateFields.paypal_secret : existingTournament.paypal_secret;
    const stripe_publishable_key = updateFields.stripe_publishable_key !== undefined ? updateFields.stripe_publishable_key : existingTournament.stripe_publishable_key;
    const stripe_secret_key = updateFields.stripe_secret_key !== undefined ? updateFields.stripe_secret_key : existingTournament.stripe_secret_key;
    const payment_method = updateFields.payment_method !== undefined ? updateFields.payment_method : existingTournament.payment_method;
    
    // Extract SMS/Twilio fields
    const twilio_account_sid = updateFields.twilio_account_sid !== undefined ? updateFields.twilio_account_sid : existingTournament.twilio_account_sid;
    const twilio_auth_token = updateFields.twilio_auth_token !== undefined ? updateFields.twilio_auth_token : existingTournament.twilio_auth_token;
    const twilio_phone_number = updateFields.twilio_phone_number !== undefined ? updateFields.twilio_phone_number : existingTournament.twilio_phone_number;
    const sms_notifications_enabled = updateFields.sms_notifications_enabled !== undefined ? (updateFields.sms_notifications_enabled ? 1 : 0) : existingTournament.sms_notifications_enabled;

    // Debug logging for tournament updates
    console.log('Tournament update request:', {
      id,
      name: name ? 'present' : 'missing',
      format: format ? 'present' : 'missing', 
      rounds: rounds ? 'present' : 'missing',
      roundsType: typeof rounds,
      roundsValue: rounds
    });
    
    // Log payment field updates
    console.log('💳 Payment fields being updated:', {
      entry_fee: entry_fee,
      payment_method: payment_method,
      paypal_client_id: paypal_client_id ? paypal_client_id.substring(0, 20) + '...' : 'EMPTY',
      paypal_secret: paypal_secret ? '***SET***' : 'EMPTY',
      stripe_publishable_key: stripe_publishable_key ? stripe_publishable_key.substring(0, 20) + '...' : 'EMPTY',
      stripe_secret_key: stripe_secret_key ? '***SET***' : 'EMPTY'
    });
    
    // Also log what we received in the request
    console.log('📥 Raw updateFields received:', {
      has_paypal_client_id: !!updateFields.paypal_client_id,
      has_paypal_secret: !!updateFields.paypal_secret,
      has_stripe_publishable_key: !!updateFields.stripe_publishable_key,
      has_stripe_secret_key: !!updateFields.stripe_secret_key,
      paypal_client_id_length: updateFields.paypal_client_id?.length || 0
    });

    // Validate required fields
    if (!name || !format || rounds === undefined || rounds === null) {
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!format) missingFields.push('format');
      if (rounds === undefined || rounds === null) missingFields.push('rounds');
      
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }

    // Additional validation - convert rounds to number if it's a string
    const roundsNum = typeof rounds === 'string' ? parseInt(rounds, 10) : rounds;
    if (typeof roundsNum !== 'number' || isNaN(roundsNum) || roundsNum < 1) {
      console.error('Invalid rounds value:', rounds, 'as number:', roundsNum);
      return res.status(400).json({ 
        success: false,
        error: 'Rounds must be a positive number' 
      });
    }

    if (!['swiss', 'online', 'quad', 'team-swiss'].includes(format)) {
      return res.status(400).json({ 
        success: false,
        error: 'Format must be one of: swiss, online, quad, team-swiss' 
      });
    }

    const settingsJson = typeof settings === 'string' ? settings : JSON.stringify(settings || {});

    // Convert boolean fields properly (handle 0, 1, true, false, null, undefined)
    const fideRated = fide_rated === true || fide_rated === 1 || fide_rated === '1' ? 1 : 0;
    const uscfRated = uscf_rated === true || uscf_rated === 1 || uscf_rated === '1' ? 1 : 0;
    const allowReg = allow_registration === true || allow_registration === 1 || allow_registration === '1' ? 1 : 0;
    const isPublic = is_public === true || is_public === 1 || is_public === '1' ? 1 : 0;

    // Debug logging
    console.log('Updating tournament with parameters:', {
      id,
      name,
      format,
      rounds: roundsNum,
      settings: settingsJson ? (settingsJson.length > 100 ? settingsJson.substring(0, 100) + '...' : settingsJson) : 'empty'
    });
    
    // Parse registration_settings if it's a string
    const registrationSettingsJson = typeof registration_settings === 'string' ? registration_settings : JSON.stringify(registration_settings || {});
    
    // Check all parameters
    const params = [organization_id || null, name, format, roundsNum, time_control, start_date, end_date, status, settingsJson,
     city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
     chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
     expected_players, website, fideRated, uscfRated, 
     allowReg, isPublic, public_url || null, logo_url || null, tournament_information || null, public_display_config || null,
     registrationSettingsJson, entry_fee, paypal_client_id || null, paypal_secret || null, 
     stripe_publishable_key || null, stripe_secret_key || null, payment_method || 'both',
     twilio_account_sid || null, twilio_auth_token || null, twilio_phone_number || null, sms_notifications_enabled,
     id];
     
    console.log('💳 Saving payment credentials to tournament:', {
      tournament_id: id,
      entry_fee: entry_fee,
      payment_method: payment_method || 'both',
      paypal_client_id: paypal_client_id ? '***SET***' : 'EMPTY',
      paypal_secret: paypal_secret ? '***SET***' : 'EMPTY',
      stripe_publishable_key: stripe_publishable_key ? '***SET***' : 'EMPTY',
      stripe_secret_key: stripe_secret_key ? '***SET***' : 'EMPTY'
    });
    
    console.log('Parameters count:', params.length);
    console.log('Updating tournament information:', tournament_information?.substring(0, 50) || 'null');

    db.run(
      `UPDATE tournaments 
       SET organization_id = ?, name = ?, format = ?, rounds = ?, time_control = ?, 
           start_date = ?, end_date = ?, status = ?, settings = ?,
           city = ?, state = ?, location = ?, chief_td_name = ?, chief_td_uscf_id = ?,
           chief_arbiter_name = ?, chief_arbiter_fide_id = ?, chief_organizer_name = ?,
           chief_organizer_fide_id = ?, expected_players = ?, website = ?,
           fide_rated = ?, uscf_rated = ?, allow_registration = ?, is_public = ?, public_url = ?, logo_url = ?, tournament_information = ?, public_display_config = ?,
           registration_settings = ?, entry_fee = ?, paypal_client_id = ?, paypal_secret = ?, stripe_publishable_key = ?, stripe_secret_key = ?, payment_method = ?,
           twilio_account_sid = ?, twilio_auth_token = ?, twilio_phone_number = ?, sms_notifications_enabled = ?
       WHERE id = ?`,
      params,
    function(err) {
      if (err) {
        console.error('Error updating tournament:', err);
        console.error('SQL Error details:', err.message);
        console.error('Error code:', err.code);
        console.error('Tournament ID:', id);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to update tournament',
          details: err.message 
        });
      }
      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Tournament not found' 
        });
      }
      // Return the updated tournament data
      db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, tournament) => {
        if (err) {
          console.error('Error fetching updated tournament:', err);
          return res.json({ 
            success: true,
            message: 'Tournament updated successfully' 
          });
        }
        res.json({ 
          success: true,
          data: tournament,
          message: 'Tournament updated successfully' 
        });
      });
    }
    );
  }); // Close the outer db.get callback
});

// Delete tournament
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM tournaments WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting tournament:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete tournament' 
      });
    }
    if (this.changes === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Tournament not found' 
      });
    }
    res.json({ 
      success: true,
      message: 'Tournament deleted successfully' 
    });
  });
});

// Get public tournament display data for a specific organization
router.get('/public/organization/:orgSlug/:tournamentId', async (req, res) => {
  try {
    const { orgSlug, tournamentId } = req.params;
    
    // First verify the organization exists and get its ID
    const organization = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, slug FROM organizations WHERE slug = ? AND is_active = 1', [orgSlug], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!organization) {
      return res.status(404).json({ 
        success: false,
        error: 'Organization not found' 
      });
    }

    // Get tournament info and verify it belongs to this organization
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ? AND organization_id = ? AND is_public = 1', [tournamentId, organization.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ 
        success: false,
        error: 'Tournament not found or not public' 
      });
    }

    // Get sections
    const sections = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM sections WHERE tournament_id = ? ORDER BY name', [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get players for all sections
    const players = await new Promise((resolve, reject) => {
      db.all(`
        SELECT p.*, s.name as section_name, s.id as section_id
        FROM players p
        JOIN sections s ON p.section_id = s.id
        WHERE s.tournament_id = ?
        ORDER BY s.name, p.last_name, p.first_name
      `, [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get current round pairings
    const currentRound = tournament.status === 'active' ? Math.max(1, tournament.current_round || 1) : 1;
    const pairings = await new Promise((resolve, reject) => {
      db.all(`
        SELECT p.*, s.name as section_name
        FROM pairings p
        JOIN sections s ON p.section_id = s.id
        WHERE s.tournament_id = ? AND p.round = ?
        ORDER BY s.name, p.board_number
      `, [tournamentId, currentRound], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get standings for all sections
    const standings = await new Promise((resolve, reject) => {
      db.all(`
        SELECT st.*, s.name as section_name
        FROM standings st
        JOIN sections s ON st.section_id = s.id
        WHERE s.tournament_id = ?
        ORDER BY s.name, st.rank
      `, [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get team standings if applicable
    let teamStandings = [];
    if (tournament.format.includes('team')) {
      teamStandings = await new Promise((resolve, reject) => {
        db.all(`
          SELECT ts.*, s.name as section_name
          FROM team_standings ts
          JOIN sections s ON ts.section_id = s.id
          WHERE s.tournament_id = ?
          ORDER BY s.name, ts.rank
        `, [tournamentId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }

    // Get prizes if any
    const prizes = await new Promise((resolve, reject) => {
      db.all(`
        SELECT *
        FROM prizes
        WHERE tournament_id = ?
        ORDER BY section, position, type
      `, [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Get custom pages
    let customPages = [];
    try {
      customPages = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM custom_pages WHERE tournament_id = ? AND is_active = 1 ORDER BY order_index, created_at',
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.warn('Could not fetch custom pages:', error);
    }

    res.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        },
        tournament: {
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          rounds: tournament.rounds,
          time_control: tournament.time_control,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          status: tournament.status,
          city: tournament.city,
          state: tournament.state,
          location: tournament.location,
          website: tournament.website,
          is_public: tournament.is_public,
          public_url: tournament.public_url,
          allow_registration: tournament.allow_registration,
          created_at: tournament.created_at
        },
        sections: sections.map(section => ({
          id: section.id,
          name: section.name,
          max_players: section.max_players,
          time_control: section.time_control,
          rating_min: section.rating_min,
          rating_max: section.rating_max,
          is_active: section.is_active
        })),
        players: players.map(player => ({
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          uscf_id: player.uscf_id,
          fide_id: player.fide_id,
          rating: player.rating,
          section_id: player.section_id,
          section_name: player.section_name,
          team_name: player.team_name,
          created_at: player.created_at
        })),
        pairings: pairings.map(pairing => ({
          id: pairing.id,
          round: pairing.round,
          board_number: pairing.board_number,
          white_player_id: pairing.white_player_id,
          black_player_id: pairing.black_player_id,
          result: pairing.result,
          section_id: pairing.section_id,
          section_name: pairing.section_name,
          created_at: pairing.created_at
        })),
        standings: standings.map(standing => ({
          id: standing.id,
          player_id: standing.player_id,
          section_id: standing.section_id,
          section_name: standing.section_name,
          points: standing.points,
          rank: standing.rank,
          tiebreak1: standing.tiebreak1,
          tiebreak2: standing.tiebreak2,
          tiebreak3: standing.tiebreak3,
          tiebreak4: standing.tiebreak4,
          tiebreak5: standing.tiebreak5,
          updated_at: standing.updated_at
        })),
        teamStandings: teamStandings.map(standing => ({
          id: standing.id,
          team_name: standing.team_name,
          section_id: standing.section_id,
          section_name: standing.section_name,
          points: standing.points,
          rank: standing.rank,
          tiebreak1: standing.tiebreak1,
          tiebreak2: standing.tiebreak2,
          tiebreak3: standing.tiebreak3,
          tiebreak4: standing.tiebreak4,
          tiebreak5: standing.tiebreak5,
          updated_at: standing.updated_at
        })),
        prizes: prizes.map(prize => ({
          id: prize.id,
          section: prize.section || 'Open',
          position: prize.position,
          name: prize.name,
          amount: prize.amount,
          type: prize.type,
          rating_category: prize.rating_category,
          description: prize.description,
          created_at: prize.created_at
        })),
        currentRound
      }
    });

  } catch (error) {
    console.error('Error fetching organization public tournament data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tournament data' 
    });
  }
});

// Get public tournament display data
router.get('/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, row) => {
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

    // Get current round pairings
    const pairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating,
                bp.name as black_name, bp.rating as black_rating
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ? AND p.round = (
           SELECT MAX(round) FROM pairings WHERE tournament_id = ?
         )
         ORDER BY p.section, p.board`,
        [id, id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get standings with round results
    const standings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.rating, p.section, p.uscf_id,
                COALESCE(SUM(r.points), 0) as total_points,
                COUNT(r.id) as games_played,
                COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) as wins,
                COUNT(CASE WHEN r.result = '0-1' OR r.result = '0-1F' THEN 1 END) as losses,
                COUNT(CASE WHEN r.result = '1/2-1/2' OR r.result = '1/2-1/2F' THEN 1 END) as draws
         FROM players p
         LEFT JOIN results r ON p.id = r.player_id
         WHERE p.tournament_id = ? AND p.status = 'active'
         GROUP BY p.id
         ORDER BY p.section, total_points DESC, p.rating DESC`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get round-by-round results for standings
    const roundResults = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          r.player_id,
          r.round,
          r.result,
          r.opponent_id,
          r.points,
          op.name as opponent_name,
          op.rating as opponent_rating,
          op.section as opponent_section,
          r.color,
          r.board
        FROM results r
        LEFT JOIN players op ON r.opponent_id = op.id
        WHERE r.tournament_id = ?
        ORDER BY r.player_id, r.round`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Group standings by section and rank within each section
    const standingsBySection = {};
    standings.forEach(player => {
      const section = player.section || 'Open';
      if (!standingsBySection[section]) {
        standingsBySection[section] = [];
      }
      standingsBySection[section].push(player);
    });

    // Rank players within each section
    Object.keys(standingsBySection).forEach(section => {
      standingsBySection[section].forEach((player, index) => {
        player.rank = index + 1;
      });
    });

    // Group round results by player and add to standings
    const roundResultsByPlayer = {};
    roundResults.forEach(result => {
      if (!roundResultsByPlayer[result.player_id]) {
        roundResultsByPlayer[result.player_id] = {};
      }
      
      // Find opponent's rank in their section
      let opponentRank = null;
      if (result.opponent_id && result.opponent_section) {
        const opponentSection = standingsBySection[result.opponent_section];
        if (opponentSection) {
          const opponent = opponentSection.find(p => p.id === result.opponent_id);
          if (opponent) {
            opponentRank = opponent.rank;
          }
        }
      }
      
      roundResultsByPlayer[result.player_id][result.round] = {
        result: result.result,
        opponent_name: result.opponent_name,
        opponent_rating: result.opponent_rating,
        opponent_rank: opponentRank,
        points: result.points,
        color: result.color,
        board: result.board
      };
    });

    // Add round results to standings
    Object.keys(standingsBySection).forEach(section => {
      standingsBySection[section].forEach((player) => {
        player.roundResults = roundResultsByPlayer[player.id] || {};
      });
    });

    // Flatten back to single array
    const sortedStandings = [];
    Object.keys(standingsBySection).sort().forEach(section => {
      sortedStandings.push(...standingsBySection[section]);
    });

    // Calculate tiebreakers for standings
    try {
      const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
      const tiebreakCriteria = settings.tie_break_criteria || ['buchholz', 'sonnebornBerger', 'performanceRating'];
      const standingsWithTiebreakers = await calculateTiebreakers(sortedStandings, id, tiebreakCriteria);
      
      // Merge tiebreakers into sortedStandings
      standingsWithTiebreakers.forEach(standing => {
        const index = sortedStandings.findIndex(p => p.id === standing.id);
        if (index !== -1) {
          sortedStandings[index].tiebreakers = standing.tiebreakers || {
            buchholz: 0,
            sonnebornBerger: 0,
            performanceRating: 0,
            modifiedBuchholz: 0,
            cumulative: 0
          };
        }
      });
    } catch (error) {
      console.warn('Could not calculate tiebreakers for public view:', error);
      // Add default tiebreakers if calculation fails
      sortedStandings.forEach(player => {
        if (!player.tiebreakers) {
          player.tiebreakers = {
            buchholz: 0,
            sonnebornBerger: 0,
            performanceRating: 0,
            modifiedBuchholz: 0,
            cumulative: 0
          };
        }
      });
    }

    // Get prize information
    let prizes = [];
    try {
      prizes = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM prizes WHERE tournament_id = ? ORDER BY position ASC, type ASC',
          [id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (prizes && prizes.length > 0) {
        const { distributeSectionPrizes } = require('../services/prizeService');
        const prizeDistributions = distributeSectionPrizes(
          sortedStandings,
          {
            name: 'Open',
            prizes: prizes.map(prize => ({
              ...prize,
              conditions: prize.conditions ? JSON.parse(prize.conditions) : [],
              amount: prize.amount ? parseFloat(prize.amount) : undefined
            }))
          },
          tournament.id
        );

        // Add prize information to standings
        const prizeMap = {};
        prizeDistributions.forEach(distribution => {
          prizeMap[distribution.player_id] = distribution.prize_amount ? `$${distribution.prize_amount}` : distribution.prize_name;
        });

        sortedStandings.forEach(player => {
          player.prize = prizeMap[player.id] || '';
        });
      }
    } catch (error) {
      console.warn('Could not calculate prizes:', error);
    }

    // Get current round number
    const currentRound = pairings.length > 0 ? pairings[0].round : 1;

    // Get active players list
    const activePlayersList = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, rating, section, uscf_id, status, created_at
         FROM players
         WHERE tournament_id = ? AND status = 'active'
         ORDER BY section, rating DESC NULLS LAST, name`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get custom pages
    let customPages = [];
    try {
      customPages = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM custom_pages WHERE tournament_id = ? AND is_active = 1 ORDER BY order_index, created_at',
          [id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.warn('Could not fetch custom pages:', error);
    }

    res.json({
      success: true,
      data: {
        tournament,
        pairings,
        standings: sortedStandings,
        currentRound,
        activePlayersList,
        customPages,
        prizes: prizes.map(prize => ({
          ...prize,
          amount: prize.amount ? parseFloat(prize.amount) : undefined,
          conditions: prize.conditions ? JSON.parse(prize.conditions) : []
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching public tournament data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tournament data' 
    });
  }
});

// Complete tournament and auto-populate prizes
router.post('/:id/complete', async (req, res) => {
  const { id } = req.params;

  try {
    // Get tournament
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, row) => {
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

    // Check if tournament is already completed
    if (tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Tournament is already completed'
      });
    }

    // Get current standings
    const standings = await getTournamentStandings(id, tournament);

    // Update tournament status to completed
    await new Promise((resolve, reject) => {
      db.run('UPDATE tournaments SET status = ? WHERE id = ?', ['completed', id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Auto-populate prizes if enabled
    const prizeResult = await autoPopulatePrizes(db, id, tournament, standings);

    // Calculate and distribute prizes based on tournament settings
    const prizeDistributions = await calculateAndDistributePrizes(id, db);

    res.json({
      success: true,
      message: 'Tournament completed successfully',
      prizeResult: prizeResult,
      prizeDistributions: prizeDistributions
    });

  } catch (error) {
    console.error('Error completing tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete tournament'
    });
  }
});

// Helper function to get tournament standings
async function getTournamentStandings(tournamentId, tournament) {
  // Get players
  const players = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM players WHERE tournament_id = ? AND status = "active" ORDER BY name',
      [tournamentId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // Get results for each player
  const standings = await Promise.all(players.map(async (player) => {
    const results = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM results WHERE tournament_id = ? AND player_id = ? ORDER BY round',
        [tournamentId, player.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const totalPoints = results.reduce((sum, result) => sum + result.points, 0);
    const wins = results.filter(r => r.points === 1).length;
    const losses = results.filter(r => r.points === 0).length;
    const draws = results.filter(r => r.points === 0.5).length;

    return {
      id: player.id,
      name: player.name,
      rating: player.rating,
      section: player.section,
      total_points: totalPoints,
      games_played: results.length,
      wins,
      losses,
      draws,
      results
    };
  }));

  // Sort by points
  standings.sort((a, b) => b.total_points - a.total_points);

  // Calculate tiebreakers
  const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
  const tiebreakCriteria = settings.tie_break_criteria || ['buchholz', 'sonnebornBerger'];
  
  const standingsWithTiebreakers = await calculateTiebreakers(standings, tournamentId, tiebreakCriteria);

  return standingsWithTiebreakers;
}

// Prize management endpoints

// Get sections from standings (same logic as prizes)
router.get('/:id/sections', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { getStandingsForPrizes } = require('../services/prizeService');
    const standings = await getStandingsForPrizes(id, db);
    
    // Extract unique sections from standings
    const sections = new Set();
    standings.forEach(player => {
      if (player.section) {
        sections.add(player.section);
      }
    });
    
    console.log(`Sections from standings: ${Array.from(sections).join(', ')}`);
    
    res.json({
      success: true,
      data: Array.from(sections)
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sections'
    });
  }
});

// Get prize distributions for a tournament
router.get('/:id/prizes', async (req, res) => {
  const { id } = req.params;
  
  try {
    const distributions = await getPrizeDistributions(id, db);
    res.json({
      success: true,
      data: distributions
    });
  } catch (error) {
    console.error('Error fetching prize distributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prize distributions'
    });
  }
});

// Calculate and distribute prizes for a tournament
router.post('/:id/prizes/calculate', async (req, res) => {
  const { id } = req.params;
  
  try {
    const distributions = await calculateAndDistributePrizes(id, db);
    res.json({
      success: true,
      data: distributions,
      message: `Successfully distributed ${distributions.length} prizes`
    });
  } catch (error) {
    console.error('Error calculating prize distributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate prize distributions'
    });
  }
});

// Update tournament prize settings
router.put('/:id/prize-settings', async (req, res) => {
  const { id } = req.params;
  const { prizeSettings } = req.body;
  
  try {
    // Get current tournament settings
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, row) => {
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

    // Update settings with new prize configuration
    const currentSettings = tournament.settings ? JSON.parse(tournament.settings) : {};
    const updatedSettings = {
      ...currentSettings,
      prizes: prizeSettings
    };

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tournaments SET settings = ? WHERE id = ?',
        [JSON.stringify(updatedSettings), id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Prize settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating prize settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prize settings'
    });
  }
});

// Generate standard prize structure for a tournament
router.post('/:id/generate-prize-structure', async (req, res) => {
  const { id } = req.params;
  const { prizeFund = 0 } = req.body;
  
  try {
    // Get tournament
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, row) => {
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

    // Get player count
    const playerCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM players WHERE tournament_id = ? AND status = "active"', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Generate standard prize structure
    const { generateStandardPrizeStructure } = require('../services/prizeService');
    const prizeStructure = generateStandardPrizeStructure(tournament, playerCount, prizeFund);

    res.json({
      success: true,
      data: prizeStructure,
      message: 'Standard prize structure generated successfully'
    });
  } catch (error) {
    console.error('Error generating prize structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate prize structure'
    });
  }
});

// Continue to next round - ENHANCED VERSION
router.post('/:id/continue', async (req, res) => {
  const { id } = req.params;
  const { currentRound } = req.body;

  try {
    const roundNum = parseInt(currentRound);
    
    if (isNaN(roundNum) || roundNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid round number. Must be a positive integer.'
      });
    }

    // Use the enhanced pairing system's built-in continue functionality
    const { EnhancedPairingSystem } = require('../utils/enhancedPairingSystem');
    const result = await EnhancedPairingSystem.continueToNextRound(id, roundNum, db);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        incompleteSections: result.incompleteSections
      });
    }

    res.json({
      success: true,
      message: result.message,
      nextRound: result.nextRound,
      currentRound: result.currentRound,
      pairings: result.pairings,
      sectionResults: result.sectionResults,
      tournament: {
        id: id,
        status: 'in_progress'
      }
    });

  } catch (error) {
    console.error('Error continuing to next round:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to continue to next round'
    });
  }
});

// Update tournament status
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['upcoming', 'active', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
  }

  db.run(
    'UPDATE tournaments SET status = ? WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        console.error('Error updating tournament status:', err);
        return res.status(500).json({ error: 'Failed to update tournament status' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json({
        success: true,
        message: 'Tournament status updated successfully',
        tournamentId: id,
        newStatus: status
      });
    }
  );
});

// Merge sections endpoint
router.post('/:id/merge-sections', async (req, res) => {
  const { id } = req.params;
  const { sourceSection, targetSection, removeSourceSection } = req.body;

  try {
    // Validate inputs
    if (!sourceSection || !targetSection) {
      return res.status(400).json({
        success: false,
        error: 'Source section and target section are required'
      });
    }

    if (sourceSection === targetSection) {
      return res.status(400).json({
        success: false,
        error: 'Source and target sections must be different'
      });
    }

    // Get tournament settings
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT settings FROM tournaments WHERE id = ?', [id], (err, row) => {
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

    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 1. Update players in source section to target section
      db.run(
        'UPDATE players SET section = ? WHERE tournament_id = ? AND section = ?',
        [targetSection, id, sourceSection],
        function(err) {
          if (err) {
            console.error('Error updating player sections:', err);
            db.run('ROLLBACK');
            return res.status(500).json({
              success: false,
              error: 'Failed to update player sections'
            });
          }
          const playersUpdated = this.changes;
          console.log(`Updated ${playersUpdated} players from ${sourceSection} to ${targetSection}`);

          // 2. Update pairings in source section to target section
          db.run(
            'UPDATE pairings SET section = ? WHERE tournament_id = ? AND COALESCE(section, "Open") = ?',
            [targetSection, id, sourceSection],
            function(err) {
              if (err) {
                console.error('Error updating pairing sections:', err);
                db.run('ROLLBACK');
                return res.status(500).json({
                  success: false,
                  error: 'Failed to update pairing sections'
                });
              }
              const pairingsUpdated = this.changes;
              console.log(`Updated ${pairingsUpdated} pairings from ${sourceSection} to ${targetSection}`);

              // 3. If requested, remove the source section from tournament settings
              if (removeSourceSection) {
                try {
                  const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
                  if (settings.sections && Array.isArray(settings.sections)) {
                    settings.sections = settings.sections.filter(s => s.name !== sourceSection);
                    
                    db.run(
                      'UPDATE tournaments SET settings = ? WHERE id = ?',
                      [JSON.stringify(settings), id],
                      function(err) {
                        if (err) {
                          console.error('Error updating tournament settings:', err);
                          db.run('ROLLBACK');
                          return res.status(500).json({
                            success: false,
                            error: 'Failed to update tournament settings'
                          });
                        }
                        
                        db.run('COMMIT', (err) => {
                          if (err) {
                            console.error('Error committing transaction:', err);
                            return res.status(500).json({
                              success: false,
                              error: 'Failed to commit changes'
                            });
                          }
                          
                          res.json({
                            success: true,
                            message: `Successfully merged ${sourceSection} into ${targetSection}`,
                            data: {
                              playersUpdated,
                              pairingsUpdated,
                              sourceSectionRemoved: removeSourceSection
                            }
                          });
                        });
                      }
                    );
                  } else {
                    // No sections array, just commit
                    db.run('COMMIT', (err) => {
                      if (err) {
                        console.error('Error committing transaction:', err);
                        return res.status(500).json({
                          success: false,
                          error: 'Failed to commit changes'
                        });
                      }
                      
                      res.json({
                        success: true,
                        message: `Successfully merged ${sourceSection} into ${targetSection}`,
                        data: {
                          playersUpdated,
                          pairingsUpdated,
                          sourceSectionRemoved: false
                        }
                      });
                    });
                  }
                } catch (parseError) {
                  console.error('Error parsing tournament settings:', parseError);
                  db.run('ROLLBACK');
                  return res.status(500).json({
                    success: false,
                    error: 'Failed to parse tournament settings'
                  });
                }
              } else {
                // Don't remove section, just commit
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing transaction:', err);
                    return res.status(500).json({
                      success: false,
                      error: 'Failed to commit changes'
                    });
                  }
                  
                  res.json({
                    success: true,
                    message: `Successfully merged ${sourceSection} into ${targetSection}`,
                    data: {
                      playersUpdated,
                      pairingsUpdated,
                      sourceSectionRemoved: false
                    }
                  });
                });
              }
            }
          );
        }
      );
    });

  } catch (error) {
    console.error('Error merging sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to merge sections',
      details: error.message
    });
  }
});

// Get player performance details
router.get('/:tournamentId/player/:playerId/performance', async (req, res) => {
  const { tournamentId, playerId } = req.params;
  
  console.log('🔍 Player Performance Request:', { tournamentId, playerId });

  try {
    // 1. Get player info
    console.log('Step 1: Fetching player info...');
    const player = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM players WHERE id = ? AND tournament_id = ?',
        [playerId, tournamentId],
        (err, row) => {
          if (err) {
            console.error('❌ Error fetching player:', err);
            reject(err);
          } else {
            console.log('✅ Player found:', row ? row.name : 'not found');
            resolve(row);
          }
        }
      );
    });

    if (!player) {
      console.error('❌ Player not found:', playerId, 'in tournament:', tournamentId);
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }

    // 2. Get tournament info
    console.log('Step 2: Fetching tournament info...');
    const tournament = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM tournaments WHERE id = ?',
        [tournamentId],
        (err, row) => {
          if (err) {
            console.error('❌ Error fetching tournament:', err);
            reject(err);
          } else {
            console.log('✅ Tournament found:', row ? row.name : 'not found');
            resolve(row);
          }
        }
      );
    });

    if (!tournament) {
      console.error('❌ Tournament not found:', tournamentId);
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // 3. Get player's pairings
    console.log('Step 3: Fetching pairings for this player...');
    const playerPairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating,
                bp.name as black_name, bp.rating as black_rating
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ? AND (p.white_player_id = ? OR p.black_player_id = ?)
         ORDER BY p.round, p.board`,
        [tournamentId, playerId, playerId],
        (err, rows) => {
          if (err) {
            console.error('❌ Error fetching pairings:', err);
            reject(err);
          } else {
            console.log('✅ Player pairings found:', rows ? rows.length : 0);
            resolve(rows || []);
          }
        }
      );
    });

    // 3b. Get ALL pairings for tournament (for standings calculation)
    console.log('Step 3b: Fetching ALL pairings for standings...');
    const allPairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM pairings WHERE tournament_id = ? ORDER BY round, board`,
        [tournamentId],
        (err, rows) => {
          if (err) {
            console.error('❌ Error fetching all pairings:', err);
            reject(err);
          } else {
            console.log('✅ All pairings found:', rows ? rows.length : 0);
            resolve(rows || []);
          }
        }
      );
    });

    // 4. Get all players for standings
    console.log('Step 4: Fetching all players...');
    const allPlayers = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name, rating, section FROM players WHERE tournament_id = ? AND status = "active" ORDER BY name',
        [tournamentId],
        (err, rows) => {
          if (err) {
            console.error('❌ Error fetching players:', err);
            reject(err);
          } else {
            console.log('✅ Players found:', rows ? rows.length : 0);
            resolve(rows || []);
          }
        }
      );
    });

    // 5. Calculate player's round performance
    console.log('Step 5: Calculating round performance...');
    const roundPerformance = [];
    let totalPoints = 0;

    playerPairings.forEach(pairing => {
      let points = 0;
      let result = pairing.result || 'TBD';
      const isWhite = pairing.white_player_id === playerId;
      
      if (result && result !== 'TBD') {
        if (isWhite) {
          if (result === '1-0' || result === '1-0F') points = 1;
          else if (result === '1/2-1/2' || result === '1/2-1/2F') points = 0.5;
          else points = 0;
        } else {
          if (result === '0-1' || result === '0-1F') points = 1;
          else if (result === '1/2-1/2' || result === '1/2-1/2F') points = 0.5;
          else points = 0;
        }
        totalPoints += points;
      }

      const opponent = isWhite 
        ? { name: pairing.black_name, rating: pairing.black_rating, id: pairing.black_player_id }
        : { name: pairing.white_name, rating: pairing.white_rating, id: pairing.white_player_id };

      roundPerformance.push({
        round: pairing.round,
        result: result,
        opponent: opponent,
        color: isWhite ? 'white' : 'black',
        board: pairing.board,
        points: points
      });
    });
    console.log('✅ Round performance calculated. Total points:', totalPoints);

    // 6. Calculate player stats
    console.log('Step 6: Calculating player stats...');
    let wins = 0, draws = 0, losses = 0;
    playerPairings.forEach(p => {
      if (!p.result || p.result === 'TBD') return;
      const isWhite = p.white_player_id === playerId;
      if (isWhite) {
        if (p.result === '1-0' || p.result === '1-0F') wins++;
        else if (p.result === '1/2-1/2' || p.result === '1/2-1/2F') draws++;
        else losses++;
      } else {
        if (p.result === '0-1' || p.result === '0-1F') wins++;
        else if (p.result === '1/2-1/2' || p.result === '1/2-1/2F') draws++;
        else losses++;
      }
    });
    console.log('✅ Stats: W:', wins, 'D:', draws, 'L:', losses);

    // 7. Calculate standings and find player rank
    console.log('Step 7: Calculating standings...');
    const standingsData = allPlayers.map(p => {
      let playerTotalPoints = 0;
      let playerWins = 0, playerDraws = 0, playerLosses = 0;
      
      allPairings.forEach(pairing => {
        if ((pairing.white_player_id === p.id || pairing.black_player_id === p.id) && pairing.result && pairing.result !== 'TBD') {
          const isWhite = pairing.white_player_id === p.id;
          if (isWhite) {
            if (pairing.result === '1-0' || pairing.result === '1-0F') {
              playerTotalPoints += 1;
              playerWins++;
            } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
              playerTotalPoints += 0.5;
              playerDraws++;
            } else {
              playerLosses++;
            }
          } else {
            if (pairing.result === '0-1' || pairing.result === '0-1F') {
              playerTotalPoints += 1;
              playerWins++;
            } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
              playerTotalPoints += 0.5;
              playerDraws++;
            } else {
              playerLosses++;
            }
          }
        }
      });

      return {
        id: p.id,
        name: p.name,
        rating: p.rating,
        section: p.section,
        total_points: playerTotalPoints,
        games_played: playerWins + playerDraws + playerLosses,
        wins: playerWins,
        draws: playerDraws,
        losses: playerLosses
      };
    }).sort((a, b) => b.total_points - a.total_points);

    let playerPlace = 1;
    standingsData.forEach((s, idx) => {
      if (s.id === playerId) playerPlace = idx + 1;
    });
    console.log('✅ Player rank:', playerPlace);

    console.log('✅ SUCCESS - Sending response');
    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        rounds: tournament.rounds,
        format: tournament.format
      },
      player: {
        id: player.id,
        name: player.name,
        rating: player.rating,
        uscf_id: player.uscf_id,
        fide_id: player.fide_id,
        section: player.section,
        start_number: player.start_number || 1,
        totalPoints: totalPoints,
        place: playerPlace
      },
      roundPerformance: roundPerformance,
      positionHistory: [
        { round: 'start', position: player.start_number || 1 }
      ],
      standings: standingsData.slice(0, 20),
      statistics: {
        gamesPlayed: playerPairings.length,
        wins: wins,
        draws: draws,
        losses: losses
      }
    });

  } catch (error) {
    console.error('❌ ERROR in player performance endpoint:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player performance: ' + error.message,
      details: error.stack
    });
  }
});

// ============================================================================
// EMBEDDABLE PUBLIC TOURNAMENT API ENDPOINT
// Returns complete tournament data for embedding/reconstruction
// ============================================================================

// Handle preflight OPTIONS requests for embed endpoint
router.options('/:id/embed', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

router.get('/:id/embed', async (req, res) => {
  try {
    // Set CORS headers for embeddable API (allow from any origin)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    const { id } = req.params;
    const { format = 'json' } = req.query;
    
    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [id], (err, row) => {
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

    // Parse settings
    let settings = {};
    try {
      settings = tournament.settings ? JSON.parse(tournament.settings) : {};
    } catch (e) {
      console.warn('Failed to parse tournament settings:', e);
    }

    // Get all players
    const players = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, rating, uscf_id, fide_id, section, status, notes
         FROM players WHERE tournament_id = ? ORDER BY section, rating DESC NULLS LAST`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get pairings for ALL rounds
    const allPairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id,
                bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ?
         ORDER BY p.round, p.section, p.board`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Group pairings by round
    const pairingsByRound = {};
    allPairings.forEach(pairing => {
      if (!pairingsByRound[pairing.round]) {
        pairingsByRound[pairing.round] = [];
      }
      pairingsByRound[pairing.round].push(pairing);
    });

    // Get standings with calculations
    const standings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.rating, p.section, p.uscf_id,
                COALESCE(SUM(r.points), 0) as total_points,
                COUNT(r.id) as games_played,
                COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) as wins,
                COUNT(CASE WHEN r.result = '0-1' OR r.result = '0-1F' THEN 1 END) as losses,
                COUNT(CASE WHEN r.result = '1/2-1/2' OR r.result = '1/2-1/2F' THEN 1 END) as draws
         FROM players p
         LEFT JOIN results r ON p.id = r.player_id
         WHERE p.tournament_id = ? AND p.status = 'active'
         GROUP BY p.id
         ORDER BY p.section, total_points DESC, p.rating DESC`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get round-by-round results
    const roundResults = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          r.player_id,
          r.round,
          r.result,
          r.opponent_id,
          r.points,
          op.name as opponent_name,
          op.rating as opponent_rating,
          op.section as opponent_section,
          r.color,
          r.board
        FROM results r
        LEFT JOIN players op ON r.opponent_id = op.id
        WHERE r.tournament_id = ?
        ORDER BY r.player_id, r.round`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Group standings by section
    const standingsBySection = {};
    standings.forEach(player => {
      const section = player.section || 'Open';
      if (!standingsBySection[section]) {
        standingsBySection[section] = [];
      }
      standingsBySection[section].push(player);
    });

    // Rank players within each section
    Object.keys(standingsBySection).forEach(section => {
      standingsBySection[section].forEach((player, index) => {
        player.rank = index + 1;
      });
    });

    // Add round results to standings
    const roundResultsByPlayer = {};
    roundResults.forEach(result => {
      if (!roundResultsByPlayer[result.player_id]) {
        roundResultsByPlayer[result.player_id] = {};
      }
      roundResultsByPlayer[result.player_id][result.round] = {
        result: result.result,
        opponent_name: result.opponent_name,
        opponent_rating: result.opponent_rating,
        points: result.points,
        color: result.color,
        board: result.board
      };
    });

    Object.keys(standingsBySection).forEach(section => {
      standingsBySection[section].forEach((player) => {
        player.roundResults = roundResultsByPlayer[player.id] || {};
      });
    });

    // Calculate tiebreakers
    const tiebreakCriteria = settings.tie_break_criteria || ['buchholz', 'sonnebornBerger', 'performanceRating'];
    try {
      const standingsWithTiebreakers = await calculateTiebreakers(Object.values(standingsBySection).flat(), id, tiebreakCriteria);
      const tiebreakerMap = {};
      standingsWithTiebreakers.forEach(standing => {
        tiebreakerMap[standing.id] = standing.tiebreakers;
      });
      
      standings.forEach(player => {
        player.tiebreakers = tiebreakerMap[player.id] || {
          buchholz: 0,
          sonnebornBerger: 0,
          performanceRating: 0,
          modifiedBuchholz: 0,
          cumulative: 0
        };
      });
    } catch (error) {
      console.warn('Could not calculate tiebreakers:', error);
    }

    // Get prize information
    let prizes = [];
    try {
      prizes = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM prizes WHERE tournament_id = ? ORDER BY position ASC, type ASC',
          [id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.warn('Could not fetch prizes:', error);
    }

    // Get organization branding if tournament has organization
    let organization = null;
    if (tournament.organization_id) {
      try {
        organization = await new Promise((resolve, reject) => {
          db.get(
            `SELECT id, name, slug, website, logoUrl, settings 
             FROM organizations WHERE id = ?`,
            [tournament.organization_id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
      } catch (error) {
        console.warn('Could not fetch organization:', error);
      }
    }

    // Get custom pages
    let customPages = [];
    try {
      customPages = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM custom_pages WHERE tournament_id = ? AND is_active = 1 ORDER BY order_index, created_at',
          [id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.warn('Could not fetch custom pages:', error);
    }

    // Calculate current round
    const currentRound = allPairings.length > 0 
      ? Math.max(...allPairings.map(p => p.round))
      : 1;

    // Build comprehensive response
    const responseData = {
      success: true,
      meta: {
        generatedAt: new Date().toISOString(),
        tournamentId: id,
        format: 'embed',
        version: '1.0.0'
      },
      tournament: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        rounds: tournament.rounds,
        time_control: tournament.time_control,
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        status: tournament.status,
        city: tournament.city,
        state: tournament.state,
        location: tournament.location,
        chief_td_name: tournament.chief_td_name,
        chief_td_uscf_id: tournament.chief_td_uscf_id,
        website: tournament.website,
        fide_rated: tournament.fide_rated,
        uscf_rated: tournament.uscf_rated,
        allow_registration: tournament.allow_registration,
        is_public: tournament.is_public,
        public_url: tournament.public_url,
        logo_url: tournament.logo_url,
        tournament_information: tournament.tournament_information,
        settings: settings
      },
      currentRound,
      players,
      pairings: allPairings,
      pairingsByRound,
      standings: Object.values(standingsBySection).flat(),
      standingsBySection,
      prizes,
      customPages,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        website: organization.website,
        logoUrl: organization.logoUrl,
        branding: organization.settings ? JSON.parse(organization.settings) : null
      } : null,
      statistics: {
        totalPlayers: players.length,
        activePlayers: players.filter(p => p.status === 'active').length,
        totalGames: allPairings.length,
        completedGames: allPairings.filter(p => p.result && p.result !== 'TBD').length,
        averageRating: players.length > 0 
          ? players.reduce((sum, p) => sum + (p.rating || 0), 0) / players.length 
          : 0
      }
    };

    // Return appropriate format
    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${tournament.name} - Tournament Data</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            h1 { color: #333; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
            .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${tournament.name}</h1>
            <div class="meta">Generated: ${new Date().toLocaleString()}</div>
            <p>This is the embeddable API data for the tournament.</p>
            <p><strong>Usage:</strong> Make a GET request to <code>/api/tournaments/${id}/embed</code> to get JSON data.</p>
            <h2>Tournament Data (JSON)</h2>
            <pre>${JSON.stringify(responseData, null, 2)}</pre>
          </div>
        </body>
        </html>
      `);
    } else {
      res.json(responseData);
    }

  } catch (error) {
    console.error('Error fetching embeddable tournament data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch embeddable tournament data',
      details: error.message
    });
  }
});

module.exports = router;
