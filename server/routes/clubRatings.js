const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @route GET /api/club-ratings/:organizationId
 * @desc Get all club ratings for an organization
 * @access Private
 */
router.get('/:organizationId', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { limit = 100, offset = 0, rating_type, min_rating, max_rating } = req.query;

    const db = require('../database');
    
    let query = `
      SELECT * FROM club_ratings 
      WHERE organization_id = ?
    `;
    const params = [organizationId];

    if (rating_type) {
      query += ' AND rating_type = ?';
      params.push(rating_type);
    }

    if (min_rating) {
      query += ' AND rating >= ?';
      params.push(parseInt(min_rating));
    }

    if (max_rating) {
      query += ' AND rating <= ?';
      params.push(parseInt(max_rating));
    }

    query += ' ORDER BY rating DESC, player_name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, ratings) => {
      if (err) {
        console.error('Error fetching club ratings:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch club ratings'
        });
      }

      res.json({
        success: true,
        data: ratings
      });
    });
  } catch (error) {
    console.error('Club ratings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/club-ratings
 * @desc Add or update a club rating
 * @access Private
 */
router.post('/', authenticate, (req, res) => {
  try {
    const {
      organization_id,
      player_id,
      player_name,
      rating,
      rating_type = 'regular',
      games_played = 0,
      wins = 0,
      losses = 0,
      draws = 0
    } = req.body;

    if (!organization_id || !player_id || !player_name || rating === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, player ID, player name, and rating are required'
      });
    }

    const db = require('../database');
    const id = uuidv4();

    db.run(
      `INSERT OR REPLACE INTO club_ratings 
       (id, organization_id, player_id, player_name, rating, rating_type, games_played, wins, losses, draws, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, organization_id, player_id, player_name, rating, rating_type, games_played, wins, losses, draws],
      function(err) {
        if (err) {
          console.error('Error saving club rating:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to save club rating'
          });
        }

        res.json({
          success: true,
          data: {
            id,
            organization_id,
            player_id,
            player_name,
            rating,
            rating_type,
            games_played,
            wins,
            losses,
            draws
          }
        });
      }
    );
  } catch (error) {
    console.error('Create club rating error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/club-ratings/:id
 * @desc Update a club rating
 * @access Private
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const {
      player_name,
      rating,
      rating_type,
      games_played,
      wins,
      losses,
      draws
    } = req.body;

    const db = require('../database');

    db.run(
      `UPDATE club_ratings 
       SET player_name = COALESCE(?, player_name),
           rating = COALESCE(?, rating),
           rating_type = COALESCE(?, rating_type),
           games_played = COALESCE(?, games_played),
           wins = COALESCE(?, wins),
           losses = COALESCE(?, losses),
           draws = COALESCE(?, draws),
           last_updated = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [player_name, rating, rating_type, games_played, wins, losses, draws, id],
      function(err) {
        if (err) {
          console.error('Error updating club rating:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to update club rating'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Club rating not found'
          });
        }

        res.json({
          success: true,
          message: 'Club rating updated successfully'
        });
      }
    );
  } catch (error) {
    console.error('Update club rating error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/club-ratings/:id
 * @desc Delete a club rating
 * @access Private
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../database');

    db.run(
      'DELETE FROM club_ratings WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          console.error('Error deleting club rating:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete club rating'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Club rating not found'
          });
        }

        res.json({
          success: true,
          message: 'Club rating deleted successfully'
        });
      }
    );
  } catch (error) {
    console.error('Delete club rating error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/club-ratings/import-from-tournament
 * @desc Import ratings from tournament results
 * @access Private
 */
router.post('/import-from-tournament', authenticate, (req, res) => {
  try {
    const { organization_id, tournament_id, rating_type = 'regular' } = req.body;

    if (!organization_id || !tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and tournament ID are required'
      });
    }

    const db = require('../database');

    // Get tournament results
    db.all(
      `SELECT p.id as player_id, p.name as player_name, p.rating, p.uscf_id,
              COUNT(pr.id) as games_played,
              SUM(CASE WHEN pr.result = '1-0' AND pr.white_id = p.id THEN 1
                       WHEN pr.result = '0-1' AND pr.black_id = p.id THEN 1
                       ELSE 0 END) as wins,
              SUM(CASE WHEN pr.result = '0-1' AND pr.white_id = p.id THEN 1
                       WHEN pr.result = '1-0' AND pr.black_id = p.id THEN 1
                       ELSE 0 END) as losses,
              SUM(CASE WHEN pr.result = '1/2-1/2' THEN 1 ELSE 0 END) as draws
       FROM players p
       LEFT JOIN pairings pr ON p.tournament_id = pr.tournament_id 
         AND (pr.white_id = p.id OR pr.black_id = p.id)
       WHERE p.tournament_id = ? AND p.status = 'active'
       GROUP BY p.id, p.name, p.rating, p.uscf_id`,
      [tournament_id],
      (err, players) => {
        if (err) {
          console.error('Error fetching tournament players:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch tournament players'
          });
        }

        let imported = 0;
        let errors = [];

        // Import each player's rating
        players.forEach((player, index) => {
          const id = uuidv4();
          
          db.run(
            `INSERT OR REPLACE INTO club_ratings 
             (id, organization_id, player_id, player_name, rating, rating_type, games_played, wins, losses, draws, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [id, organization_id, player.player_id, player.player_name, player.rating, rating_type, 
             player.games_played, player.wins, player.losses, player.draws],
            function(err) {
              if (err) {
                console.error(`Error importing rating for ${player.player_name}:`, err);
                errors.push({
                  player: player.player_name,
                  error: err.message
                });
              } else {
                imported++;
              }

              // Check if this is the last player
              if (index === players.length - 1) {
                res.json({
                  success: true,
                  data: {
                    totalPlayers: players.length,
                    imported,
                    errors
                  }
                });
              }
            }
          );
        });
      }
    );
  } catch (error) {
    console.error('Import ratings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/club-ratings/:organizationId/leaderboard
 * @desc Get club rating leaderboard
 * @access Public
 */
router.get('/:organizationId/leaderboard', (req, res) => {
  try {
    const { organizationId } = req.params;
    const { rating_type = 'regular', limit = 50 } = req.query;

    const db = require('../database');
    
    db.all(
      `SELECT player_name, rating, games_played, wins, losses, draws,
              ROUND((wins * 1.0 / NULLIF(games_played, 0)) * 100, 1) as win_percentage
       FROM club_ratings 
       WHERE organization_id = ? AND rating_type = ?
       ORDER BY rating DESC, win_percentage DESC
       LIMIT ?`,
      [organizationId, rating_type, parseInt(limit)],
      (err, leaderboard) => {
        if (err) {
          console.error('Error fetching leaderboard:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard'
          });
        }

        res.json({
          success: true,
          data: leaderboard
        });
      }
    );
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
