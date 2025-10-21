const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../database');
const { calculatePrizeDistribution, calculateLeftoverPrizes, validatePrizeConfiguration } = require('../services/prizeCalculator');
const { calculateTiebreakers } = require('../utils/tiebreakers');

// Get all prizes for a tournament
router.get('/tournament/:tournamentId', (req, res) => {
  const { tournamentId } = req.params;

  db.all(
    'SELECT * FROM prizes WHERE tournament_id = ? ORDER BY position ASC, type ASC',
    [tournamentId],
    (err, prizes) => {
      if (err) {
        console.error('Error fetching prizes:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch prizes'
        });
      }

      res.json({
        success: true,
        data: prizes.map(prize => ({
          ...prize,
          conditions: prize.conditions ? JSON.parse(prize.conditions) : [],
          amount: prize.amount ? parseFloat(prize.amount) : undefined
        }))
      });
    }
  );
});

// Create a new prize
router.post('/', (req, res) => {
  const {
    tournamentId,
    name,
    type,
    position,
    ratingCategory,
    section,
    amount,
    description,
    conditions
  } = req.body;

  if (!tournamentId || !name || !type) {
    return res.status(400).json({
      success: false,
      error: 'Tournament ID, name, and type are required'
    });
  }

  if (!['cash', 'trophy', 'medal', 'plaque'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Prize type must be cash, trophy, medal, or plaque'
    });
  }

  if (type === 'cash' && (!amount || amount <= 0)) {
    return res.status(400).json({
      success: false,
      error: 'Cash prizes must have a positive amount'
    });
  }

  const prizeId = uuidv4();
  const conditionsJson = conditions && conditions.length > 0 ? JSON.stringify(conditions) : null;

  db.run(
    `INSERT INTO prizes (id, tournament_id, name, type, position, rating_category, section, amount, description, conditions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [prizeId, tournamentId, name, type, position, ratingCategory, section, amount, description, conditionsJson],
    function(err) {
      if (err) {
        console.error('Error creating prize:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create prize'
        });
      }

      res.json({
        success: true,
        data: {
          id: prizeId,
          tournament_id: tournamentId,
          name,
          type,
          position,
          rating_category: ratingCategory,
          section,
          amount,
          description,
          conditions: conditions || []
        }
      });
    }
  );
});

// Update a prize
router.put('/:prizeId', (req, res) => {
  const { prizeId } = req.params;
  const {
    name,
    type,
    position,
    ratingCategory,
    section,
    amount,
    description,
    conditions
  } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: 'Name and type are required'
    });
  }

  if (!['cash', 'trophy', 'medal', 'plaque'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Prize type must be cash, trophy, medal, or plaque'
    });
  }

  if (type === 'cash' && (!amount || amount <= 0)) {
    return res.status(400).json({
      success: false,
      error: 'Cash prizes must have a positive amount'
    });
  }

  const conditionsJson = conditions && conditions.length > 0 ? JSON.stringify(conditions) : null;

  db.run(
    `UPDATE prizes 
     SET name = ?, type = ?, position = ?, rating_category = ?, section = ?, amount = ?, description = ?, conditions = ?
     WHERE id = ?`,
    [name, type, position, ratingCategory, section, amount, description, conditionsJson, prizeId],
    function(err) {
      if (err) {
        console.error('Error updating prize:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update prize'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Prize not found'
        });
      }

      res.json({
        success: true,
        message: 'Prize updated successfully'
      });
    }
  );
});

// Delete a prize
router.delete('/:prizeId', (req, res) => {
  const { prizeId } = req.params;

  db.run('DELETE FROM prizes WHERE id = ?', [prizeId], function(err) {
    if (err) {
      console.error('Error deleting prize:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete prize'
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Prize not found'
      });
    }

    res.json({
      success: true,
      message: 'Prize deleted successfully'
    });
  });
});

// Calculate prize distribution for a tournament
router.post('/tournament/:tournamentId/calculate', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Get tournament settings
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
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

    // Get prizes
    const prizes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM prizes WHERE tournament_id = ?', [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get standings with tiebreakers
    const standings = await getTournamentStandings(tournamentId, tournament);

    // Calculate prize distribution
    const prizeDistributions = calculatePrizeDistribution(
      standings,
      prizes.map(prize => ({
        ...prize,
        conditions: prize.conditions ? JSON.parse(prize.conditions) : [],
        amount: prize.amount ? parseFloat(prize.amount) : undefined
      })),
      tournament.settings ? JSON.parse(tournament.settings) : {}
    );

    // Calculate leftover prizes
    const leftoverAmount = calculateLeftoverPrizes(prizes, prizeDistributions);

    res.json({
      success: true,
      data: {
        distributions: prizeDistributions,
        leftoverAmount,
        totalPrizeFund: prizes
          .filter(p => p.type === 'cash' && p.amount)
          .reduce((sum, p) => sum + parseFloat(p.amount), 0)
      }
    });

  } catch (error) {
    console.error('Error calculating prize distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate prize distribution'
    });
  }
});

// Save prize distribution results
router.post('/tournament/:tournamentId/distribute', async (req, res) => {
  const { tournamentId } = req.params;
  const { distributions } = req.body;

  if (!distributions || !Array.isArray(distributions)) {
    return res.status(400).json({
      success: false,
      error: 'Distributions array is required'
    });
  }

  try {
    // Clear existing distributions
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM prize_distributions WHERE tournament_id = ?', [tournamentId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Insert new distributions
    const stmt = db.prepare(`
      INSERT INTO prize_distributions (id, tournament_id, player_id, prize_id, amount, position, rating_category, section, tie_group)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    distributions.forEach(dist => {
      const id = uuidv4();
      stmt.run([
        id,
        tournamentId,
        dist.player_id,
        dist.prize_id,
        dist.amount,
        dist.position,
        dist.rating_category,
        dist.section,
        dist.tie_group
      ]);
    });

    stmt.finalize((err) => {
      if (err) {
        console.error('Error saving prize distributions:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to save prize distributions'
        });
      }

      res.json({
        success: true,
        message: 'Prize distributions saved successfully'
      });
    });

  } catch (error) {
    console.error('Error saving prize distributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save prize distributions'
    });
  }
});

// Get prize distribution results for a tournament
router.get('/tournament/:tournamentId/distribution', (req, res) => {
  const { tournamentId } = req.params;

  db.all(
    `SELECT pd.*, p.name as player_name, pr.name as prize_name, pr.type as prize_type
     FROM prize_distributions pd
     JOIN players p ON pd.player_id = p.id
     JOIN prizes pr ON pd.prize_id = pr.id
     WHERE pd.tournament_id = ?
     ORDER BY pd.position ASC, pr.type ASC`,
    [tournamentId],
    (err, distributions) => {
      if (err) {
        console.error('Error fetching prize distributions:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch prize distributions'
        });
      }

      res.json({
        success: true,
        data: distributions.map(dist => ({
          ...dist,
          amount: dist.amount ? parseFloat(dist.amount) : undefined
        }))
      });
    }
  );
});

// Helper function to get tournament standings with tiebreakers
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

module.exports = router;
