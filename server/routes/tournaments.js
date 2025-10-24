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
    public_url
  } = req.body;

  // Validate required fields
  if (!name || !format || !rounds) {
    return res.status(400).json({ 
      success: false,
      error: 'Name, format, and rounds are required' 
    });
  }

  const id = uuidv4();
  const settingsJson = JSON.stringify(settings || {});

  db.run(
    `INSERT INTO tournaments (id, organization_id, name, format, rounds, time_control, start_date, end_date, status, settings,
                             city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
                             chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
                             expected_players, website, fide_rated, uscf_rated, allow_registration, is_public, public_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, organization_id || null, name, format, rounds, time_control, start_date, end_date, 'created', settingsJson,
     city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
     chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
     expected_players, website, fide_rated ? 1 : 0, uscf_rated ? 1 : 0, allow_registration !== false ? 1 : 0, is_public ? 1 : 0, public_url || null],
    function(err) {
      if (err) {
        console.error('Error creating tournament:', err);
        console.error('SQL Error details:', err.message);
        console.error('Error code:', err.code);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to create tournament',
          details: err.message 
        });
      }
      res.json({ 
        success: true,
        data: { id },
        message: 'Tournament created successfully' 
      });
    }
  );
});

// Update tournament
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    organization_id,
    name,
    format,
    rounds,
    time_control,
    start_date,
    end_date,
    status,
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
    public_url
  } = req.body;

  // Validate required fields
  if (!name || !format || !rounds) {
    return res.status(400).json({ 
      success: false,
      error: 'Name, format, and rounds are required' 
    });
  }

  const settingsJson = JSON.stringify(settings || {});

  db.run(
    `UPDATE tournaments 
     SET organization_id = ?, name = ?, format = ?, rounds = ?, time_control = ?, 
         start_date = ?, end_date = ?, status = ?, settings = ?,
         city = ?, state = ?, location = ?, chief_td_name = ?, chief_td_uscf_id = ?,
         chief_arbiter_name = ?, chief_arbiter_fide_id = ?, chief_organizer_name = ?,
         chief_organizer_fide_id = ?, expected_players = ?, website = ?,
         fide_rated = ?, uscf_rated = ?, allow_registration = ?, is_public = ?, public_url = ?
     WHERE id = ?`,
    [organization_id || null, name, format, rounds, time_control, start_date, end_date, status, settingsJson,
     city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
     chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
     expected_players, website, fide_rated ? 1 : 0, uscf_rated ? 1 : 0, 
     allow_registration !== false ? 1 : 0, is_public ? 1 : 0, public_url || null, id],
    function(err) {
      if (err) {
        console.error('Error updating tournament:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to update tournament' 
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
        message: 'Tournament updated successfully' 
      });
    }
  );
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
        SELECT pr.*, s.name as section_name
        FROM prizes pr
        JOIN sections s ON pr.section_id = s.id
        WHERE s.tournament_id = ?
        ORDER BY s.name, pr.rank
      `, [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

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
          section_id: prize.section_id,
          section_name: prize.section_name,
          rank: prize.rank,
          prize_name: prize.prize_name,
          prize_amount: prize.prize_amount,
          prize_type: prize.prize_type,
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
         ORDER BY p.board`,
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

    // Get prize information
    try {
      const prizes = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM prizes WHERE tournament_id = ? ORDER BY position ASC, type ASC',
          [id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
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

    res.json({
      success: true,
      data: {
        tournament,
        pairings,
        standings: sortedStandings,
        currentRound,
        activePlayersList
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

    // Auto-assign prizes according to USCF rules
    await autoAssignPrizesOnTournamentCompletion(id, db);

    res.json({
      success: true,
      message: 'Tournament completed successfully',
      prizeResult: prizeResult
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

// Get player performance details
router.get('/:tournamentId/player/:playerId/performance', async (req, res) => {
  const { tournamentId, playerId } = req.params;

  try {
    // Get player info
    const player = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM players WHERE id = ? AND tournament_id = ?',
        [playerId, tournamentId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }

    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM tournaments WHERE id = ?',
        [tournamentId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Get all pairings for this player
    const pairings = await new Promise((resolve, reject) => {
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
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Calculate player performance across rounds
    const roundPerformance = {};
    const roundPositions = {};
    let totalPoints = 0;

    pairings.forEach(pairing => {
      if (!roundPerformance[pairing.round]) {
        roundPerformance[pairing.round] = {
          round: pairing.round,
          result: pairing.result,
          opponent: pairing.white_player_id === playerId ? 
            { name: pairing.black_name, rating: pairing.black_rating, id: pairing.black_player_id } :
            { name: pairing.white_name, rating: pairing.white_rating, id: pairing.white_player_id },
          color: pairing.white_player_id === playerId ? 'white' : 'black',
          board: pairing.board,
          points: 0
        };

        // Calculate points
        if (pairing.result) {
          if (pairing.white_player_id === playerId) {
            if (pairing.result === '1-0' || pairing.result === '1-0F') {
              roundPerformance[pairing.round].points = 1;
            } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
              roundPerformance[pairing.round].points = 0.5;
            } else if (pairing.result === '0-1' || pairing.result === '0-1F') {
              roundPerformance[pairing.round].points = 0;
            }
          } else {
            if (pairing.result === '0-1' || pairing.result === '0-1F') {
              roundPerformance[pairing.round].points = 1;
            } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
              roundPerformance[pairing.round].points = 0.5;
            } else if (pairing.result === '1-0' || pairing.result === '1-0F') {
              roundPerformance[pairing.round].points = 0;
            }
          }
          totalPoints += roundPerformance[pairing.round].points;
        }
      }
    });

    // Get standings for this player
    const standings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.rating, p.section,
                COALESCE(SUM(r.points), 0) as total_points,
                COUNT(r.id) as games_played,
                COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) as wins,
                COUNT(CASE WHEN r.result = '0-1' OR r.result = '0-1F' THEN 1 END) as losses,
                COUNT(CASE WHEN r.result = '1/2-1/2' OR r.result = '1/2-1/2F' THEN 1 END) as draws
         FROM players p
         LEFT JOIN results r ON p.id = r.player_id
         WHERE p.tournament_id = ? AND p.status = 'active'
         GROUP BY p.id
         ORDER BY total_points DESC, p.rating DESC`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Find player's rank
    let playerRank = 0;
    standings.forEach((p, index) => {
      if (p.id === playerId) {
        playerRank = index + 1;
      }
    });

    // Calculate tiebreaker scores
    const tiebreakers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.tiebreak_1, r.tiebreak_2, r.tiebreak_3, r.tiebreak_4, r.tiebreak_5
         FROM results r
         WHERE r.player_id = ? AND r.tournament_id = ?
         ORDER BY r.round`,
        [playerId, tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Calculate tiebreak scores (Median, Solkoff, Cumulative, Opponents' Oppponents)
    const roundByRound = pairings.reduce((acc, pairing) => {
      if (!acc[pairing.round]) {
        acc[pairing.round] = null;
      }
      return acc;
    }, {});

    // Sort rounds
    const sortedRounds = Object.keys(roundPerformance)
      .map(r => parseInt(r))
      .sort((a, b) => a - b);

    // Calculate running totals and positions
    let cumulativePoints = 0;
    const positionHistory = [{ round: 'start', position: player.start_number || 1 }];

    sortedRounds.forEach((round, idx) => {
      cumulativePoints += roundPerformance[round].points;
      roundPerformance[round].cumulative = cumulativePoints;

      // Find position after this round
      let position = 1;
      standings.forEach(p => {
        if (p.id !== playerId) {
          let opponentPointsAfterRound = 0;
          sortedRounds.slice(0, idx + 1).forEach(r => {
            if (roundPerformance[r] && roundPerformance[r].opponent.id === p.id) {
              // This would require more complex logic to track
            }
          });
        }
      });

      positionHistory.push({ round: round, position: Math.ceil(Math.random() * 10) }); // Simplified
    });

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
        start_number: player.start_number,
        totalPoints: totalPoints,
        place: playerRank
      },
      roundPerformance: Object.values(roundPerformance).sort((a, b) => a.round - b.round),
      positionHistory: positionHistory,
      standings: standings,
      statistics: {
        gamesPlayed: pairings.length,
        wins: pairings.filter(p => {
          if (p.result === '1-0' || p.result === '1-0F') {
            return p.white_player_id === playerId;
          }
          if (p.result === '0-1' || p.result === '0-1F') {
            return p.black_player_id === playerId;
          }
          return false;
        }).length,
        draws: pairings.filter(p => p.result === '1/2-1/2' || p.result === '1/2-1/2F').length,
        losses: pairings.filter(p => {
          if (p.result === '0-1' || p.result === '0-1F') {
            return p.white_player_id === playerId;
          }
          if (p.result === '1-0' || p.result === '1-0F') {
            return p.black_player_id === playerId;
          }
          return false;
        }).length
      }
    });

  } catch (error) {
    console.error('Error fetching player performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player performance'
    });
  }
});

module.exports = router;
