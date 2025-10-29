const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @route POST /api/club-ratings/auto-generate
 * @desc Auto-generate club ratings based on tournament results
 * @access Private
 */
router.post('/auto-generate', authenticate, async (req, res) => {
  try {
    const { organization_id, tournament_ids, rating_type = 'regular', k_factor = 32 } = req.body;

    if (!organization_id || !tournament_ids || !Array.isArray(tournament_ids)) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and tournament IDs array are required'
      });
    }

    const db = require('../database');
    const ratingService = require('../services/clubRatingService');

    // Get all players from specified tournaments
    const players = await getPlayersFromTournaments(tournament_ids);
    
    if (players.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No players found in specified tournaments'
      });
    }

    // Generate ratings for each player
    const results = {
      processed: 0,
      updated: 0,
      errors: []
    };

    for (const player of players) {
      try {
        const newRating = await ratingService.calculateNewRating({
          playerId: player.player_id,
          playerName: player.player_name,
          currentRating: player.current_rating || 1200,
          tournamentResults: player.results,
          kFactor: k_factor,
          ratingType: rating_type
        });

        // Save or update club rating
        const id = uuidv4();
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR REPLACE INTO club_ratings 
             (id, organization_id, player_id, player_name, rating, rating_type, games_played, wins, losses, draws, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [id, organization_id, player.player_id, player.player_name, newRating.rating, rating_type, 
             newRating.games_played, newRating.wins, newRating.losses, newRating.draws],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        results.processed++;
        if (newRating.rating !== player.current_rating) {
          results.updated++;
        }
      } catch (error) {
        console.error(`Error processing player ${player.player_name}:`, error);
        results.errors.push({
          player: player.player_name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Auto-generate ratings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/club-ratings/bulk-update
 * @desc Bulk update multiple club ratings
 * @access Private
 */
router.post('/bulk-update', authenticate, (req, res) => {
  try {
    const { organization_id, ratings } = req.body;

    if (!organization_id || !ratings || !Array.isArray(ratings)) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and ratings array are required'
      });
    }

    const db = require('../database');
    let processed = 0;
    let errors = [];

    ratings.forEach((rating, index) => {
      const {
        player_id,
        player_name,
        rating: new_rating,
        rating_type = 'regular',
        games_played = 0,
        wins = 0,
        losses = 0,
        draws = 0
      } = rating;

      if (!player_id || !player_name || new_rating === undefined) {
        errors.push({
          index,
          error: 'Player ID, name, and rating are required'
        });
        return;
      }

      const id = uuidv4();
      
      db.run(
        `INSERT OR REPLACE INTO club_ratings 
         (id, organization_id, player_id, player_name, rating, rating_type, games_played, wins, losses, draws, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, organization_id, player_id, player_name, new_rating, rating_type, games_played, wins, losses, draws],
        function(err) {
          if (err) {
            console.error(`Error updating rating for ${player_name}:`, err);
            errors.push({
              index,
              player: player_name,
              error: err.message
            });
          } else {
            processed++;
          }

          // Check if this is the last rating
          if (index === ratings.length - 1) {
            res.json({
              success: true,
              data: {
                totalRatings: ratings.length,
                processed,
                errors
              }
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Bulk update ratings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/club-ratings/:organizationId/stats
 * @desc Get club rating statistics
 * @access Private
 */
router.get('/:organizationId/stats', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { rating_type = 'regular' } = req.query;

    const db = require('../database');
    
    db.all(
      `SELECT 
        COUNT(*) as total_players,
        AVG(rating) as average_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating,
        SUM(games_played) as total_games,
        SUM(wins) as total_wins,
        SUM(losses) as total_losses,
        SUM(draws) as total_draws
       FROM club_ratings 
       WHERE organization_id = ? AND rating_type = ?`,
      [organizationId, rating_type],
      (err, stats) => {
        if (err) {
          console.error('Error fetching rating stats:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch rating statistics'
          });
        }

        const stat = stats[0];
        if (stat) {
          stat.win_percentage = stat.total_games > 0 
            ? Math.round((stat.total_wins / stat.total_games) * 100 * 10) / 10 
            : 0;
        }

        res.json({
          success: true,
          data: stat || {
            total_players: 0,
            average_rating: 0,
            min_rating: 0,
            max_rating: 0,
            total_games: 0,
            total_wins: 0,
            total_losses: 0,
            total_draws: 0,
            win_percentage: 0
          }
        });
      }
    );
  } catch (error) {
    console.error('Rating stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to get players from tournaments with their results
 */
async function getPlayersFromTournaments(tournamentIds) {
  const db = require('../database');
  
  return new Promise((resolve, reject) => {
    const placeholders = tournamentIds.map(() => '?').join(',');
    
    db.all(
      `SELECT DISTINCT p.id as player_id, p.name as player_name, p.rating as current_rating,
              COUNT(pr.id) as games_played,
              SUM(CASE WHEN pr.result = '1-0' AND pr.white_id = p.id THEN 1
                       WHEN pr.result = '0-1' AND pr.black_id = p.id THEN 1
                       ELSE 0 END) as wins,
              SUM(CASE WHEN pr.result = '0-1' AND pr.white_id = p.id THEN 1
                       WHEN pr.result = '1-0' AND pr.black_id = p.id THEN 1
                       ELSE 0 END) as losses,
              SUM(CASE WHEN pr.result = '1/2-1/2' THEN 1 ELSE 0 END) as draws,
              GROUP_CONCAT(
                CASE 
                  WHEN pr.white_id = p.id THEN 'W' || pr.black_rating
                  WHEN pr.black_id = p.id THEN 'B' || pr.white_rating
                END, ','
              ) as results
       FROM players p
       LEFT JOIN pairings pr ON p.tournament_id = pr.tournament_id 
         AND (pr.white_id = p.id OR pr.black_id = p.id)
       WHERE p.tournament_id IN (${placeholders}) AND p.status = 'active'
       GROUP BY p.id, p.name, p.rating`,
      tournamentIds,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse results string into array of opponent ratings
          const players = rows.map(row => ({
            ...row,
            results: row.results ? row.results.split(',').map(r => {
              const color = r[0];
              const rating = parseInt(r.substring(1));
              return { color, opponentRating: rating };
            }) : []
          }));
          resolve(players);
        }
      }
    );
  });
}

module.exports = router;
