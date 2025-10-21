const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const router = express.Router();

// Get all tournaments
router.get('/', (req, res) => {
  db.all('SELECT * FROM tournaments ORDER BY created_at DESC', (err, rows) => {
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
    uscf_rated
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
    `INSERT INTO tournaments (id, name, format, rounds, time_control, start_date, end_date, status, settings,
                             city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
                             chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
                             expected_players, website, fide_rated, uscf_rated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, format, rounds, time_control, start_date, end_date, 'created', settingsJson,
     city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
     chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
     expected_players, website, fide_rated ? 1 : 0, uscf_rated ? 1 : 0],
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
    uscf_rated
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
     SET name = ?, format = ?, rounds = ?, time_control = ?, 
         start_date = ?, end_date = ?, status = ?, settings = ?,
         city = ?, state = ?, location = ?, chief_td_name = ?, chief_td_uscf_id = ?,
         chief_arbiter_name = ?, chief_arbiter_fide_id = ?, chief_organizer_name = ?,
         chief_organizer_fide_id = ?, expected_players = ?, website = ?,
         fide_rated = ?, uscf_rated = ?
     WHERE id = ?`,
    [name, format, rounds, time_control, start_date, end_date, status, settingsJson,
     city, state, location, chief_td_name, chief_td_uscf_id, chief_arbiter_name,
     chief_arbiter_fide_id, chief_organizer_name, chief_organizer_fide_id,
     expected_players, website, fide_rated ? 1 : 0, uscf_rated ? 1 : 0, id],
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
         ORDER BY total_points DESC, p.rating DESC`,
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

    // Group round results by player and add to standings
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

    // Add round results and rank to standings
    standings.forEach((player, index) => {
      player.rank = index + 1;
      player.roundResults = roundResultsByPlayer[player.id] || {};
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
        const { calculatePrizeDistribution } = require('../services/prizeCalculator');
        const prizeDistributions = calculatePrizeDistribution(
          standings,
          prizes.map(prize => ({
            ...prize,
            conditions: prize.conditions ? JSON.parse(prize.conditions) : [],
            amount: prize.amount ? parseFloat(prize.amount) : undefined
          })),
          tournament.settings ? JSON.parse(tournament.settings) : {}
        );

        // Add prize information to standings
        const prizeMap = {};
        prizeDistributions.forEach(distribution => {
          prizeMap[distribution.player_id] = distribution.prize_amount ? `$${distribution.prize_amount}` : distribution.prize_name;
        });

        standings.forEach(player => {
          player.prize = prizeMap[player.id] || '';
        });
      }
    } catch (error) {
      console.warn('Could not calculate prizes:', error);
    }

    // Get current round number
    const currentRound = pairings.length > 0 ? pairings[0].round : 1;

    res.json({
      success: true,
      data: {
        tournament,
        pairings,
        standings,
        currentRound
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

module.exports = router;
