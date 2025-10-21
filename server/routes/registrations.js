const express = require('express');
const { v4: uuidv4 } = require('uuid');
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
        resolve(null); // No sections defined
        return;
      }
      
      try {
        const settings = JSON.parse(tournament.settings);
        const sections = settings.sections || [];
        
        if (sections.length === 0) {
          resolve(null); // No sections defined
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
        
        // If no section matches, assign to the first section or null
        resolve(sections.length > 0 ? sections[0].name : null);
      } catch (parseError) {
        console.error('Error parsing tournament settings:', parseError);
        resolve(null);
      }
    });
  });
}

// Get tournament information for registration
router.get('/tournament/:tournamentId/info', (req, res) => {
  const { tournamentId } = req.params;
  
  db.get('SELECT id, name, format, rounds, start_date, end_date, settings FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
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
    
    res.json({ 
      success: true,
      data: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        rounds: tournament.rounds,
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        sections: sections
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
      email,
      phone,
      section,
      bye_requests = [],
      notes
    } = req.body;

    // Validate required fields
    if (!tournament_id || !player_name || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Tournament ID, player name, and email are required' 
      });
    }

    // Check if tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT id, name FROM tournaments WHERE id = ?', [tournament_id], (err, row) => {
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
    let finalRating = null;
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
    
    // Insert registration record
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO registrations (id, tournament_id, player_name, uscf_id, email, phone, section, bye_requests, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [registrationId, tournament_id, player_name, uscf_id, email, phone, finalSection, 
         JSON.stringify(bye_requests), notes, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Insert player record with pending status
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO players (id, tournament_id, name, uscf_id, rating, section, status, expiration_date, intentional_bye_rounds, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [playerId, tournament_id, player_name, uscf_id, finalRating, finalSection, 'pending',
         ratingLookupResult?.expirationDate || null,
         bye_requests.length > 0 ? JSON.stringify(bye_requests) : null, 
         notes ? `Registration: ${notes}` : 'Public Registration'],
        function(err) {
          if (err) reject(err);
          else resolve();
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

module.exports = router;


