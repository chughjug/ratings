const express = require('express');
const router = express.Router();
const playerProfileService = require('../services/playerProfileService');
const { authenticate } = require('../middleware/auth');

/**
 * @route GET /api/player-profiles/:playerId
 * @desc Get player profile with photos and achievements
 * @access Private
 */
router.get('/:playerId', authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;
    const result = await playerProfileService.getPlayerProfile(playerId);

    res.json(result);
  } catch (error) {
    console.error('Player profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/player-profiles/:playerId
 * @desc Update player profile
 * @access Private
 */
router.put('/:playerId', authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = req.body;

    const result = await playerProfileService.updatePlayerProfile(playerId, updates);

    res.json(result);
  } catch (error) {
    console.error('Player profile update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/player-profiles/:playerId/photo
 * @desc Upload player photo
 * @access Private
 */
router.post('/:playerId/photo', authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;
    const upload = playerProfileService.getPhotoUpload();

    upload.single('photo')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No photo file provided'
        });
      }

      try {
        const result = await playerProfileService.processPhoto(req.file.path, playerId);
        res.json(result);
      } catch (error) {
        console.error('Photo processing error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/player-profiles/:playerId/photo/:photoType
 * @desc Delete player photo
 * @access Private
 */
router.delete('/:playerId/photo/:photoType', authenticate, async (req, res) => {
  try {
    const { playerId, photoType } = req.params;

    if (!['thumb', 'medium', 'large'].includes(photoType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid photo type. Must be thumb, medium, or large'
      });
    }

    const result = await playerProfileService.deletePlayerPhoto(playerId, photoType);

    res.json(result);
  } catch (error) {
    console.error('Photo deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/player-profiles/:playerId/statistics
 * @desc Get player statistics
 * @access Private
 */
router.get('/:playerId/statistics', authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;
    const result = await playerProfileService.getPlayerStatistics(playerId);

    res.json(result);
  } catch (error) {
    console.error('Player statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/player-profiles/:playerId/tournaments
 * @desc Get player tournament history
 * @access Private
 */
router.get('/:playerId/tournaments', authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 20, offset = 0, year = null } = req.query;

    const result = await playerProfileService.getPlayerTournamentHistory(playerId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      year: year ? parseInt(year) : null
    });

    res.json(result);
  } catch (error) {
    console.error('Player tournament history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/player-profiles/:playerId/achievements
 * @desc Get player achievements
 * @access Private
 */
router.get('/:playerId/achievements', authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { type = null } = req.query;

    const result = await playerProfileService.getPlayerAchievements(playerId, type);

    res.json(result);
  } catch (error) {
    console.error('Player achievements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/player-profiles/:playerId/achievements
 * @desc Add achievement to player profile
 * @access Private
 */
router.post('/:playerId/achievements', authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;
    const achievement = req.body;

    if (!achievement.type || !achievement.title) {
      return res.status(400).json({
        success: false,
        error: 'Achievement type and title are required'
      });
    }

    const result = await playerProfileService.addAchievement(playerId, achievement);

    res.json(result);
  } catch (error) {
    console.error('Add achievement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/player-profiles/search
 * @desc Search players by name or rating
 * @access Private
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, limit = 20, offset = 0, minRating = null, maxRating = null } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const result = await playerProfileService.searchPlayers(q, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      minRating: minRating ? parseInt(minRating) : null,
      maxRating: maxRating ? parseInt(maxRating) : null
    });

    res.json(result);
  } catch (error) {
    console.error('Player search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/player-profiles/leaderboard
 * @desc Get player leaderboard
 * @access Private
 */
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { type = 'rating', limit = 50, minGames = 10 } = req.query;

    // This would integrate with your existing database
    const leaderboard = [
      {
        rank: 1,
        player: {
          id: '1',
          name: 'John Doe',
          uscf_id: '12345678',
          rating: 2200,
          state: 'CA',
          photo: '/uploads/player-photos/player-1-thumb.jpg'
        },
        games: 45,
        win_percentage: 75.6
      }
    ];

    res.json({
      success: true,
      data: {
        leaderboard,
        type,
        total: leaderboard.length,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/player-profiles/achievements/types
 * @desc Get available achievement types
 * @access Private
 */
router.get('/achievements/types', authenticate, async (req, res) => {
  try {
    const achievementTypes = [
      {
        value: 'tournament_win',
        label: 'Tournament Win',
        description: 'Won a tournament or section',
        icon: '🏆'
      },
      {
        value: 'rating_milestone',
        label: 'Rating Milestone',
        description: 'Reached a rating milestone',
        icon: '📈'
      },
      {
        value: 'perfect_score',
        label: 'Perfect Score',
        description: 'Achieved a perfect score in a tournament',
        icon: '💯'
      },
      {
        value: 'upset_win',
        label: 'Upset Win',
        description: 'Beat a higher-rated opponent',
        icon: '⚡'
      },
      {
        value: 'long_streak',
        label: 'Long Streak',
        description: 'Achieved a long winning streak',
        icon: '🔥'
      },
      {
        value: 'first_tournament',
        label: 'First Tournament',
        description: 'Played in first tournament',
        icon: '🎯'
      }
    ];

    res.json({
      success: true,
      data: achievementTypes
    });
  } catch (error) {
    console.error('Achievement types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
