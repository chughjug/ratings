const express = require('express');
const router = express.Router();
const chessComService = require('../services/chessComService');
const lichessService = require('../services/lichessService');
const { authenticate } = require('../middleware/auth');

/**
 * @route GET /api/chess/chesscom/player/:username
 * @desc Get Chess.com player profile
 * @access Private
 */
router.get('/chesscom/player/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const profile = await chessComService.getPlayerProfile(username);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Chess.com player profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/chesscom/player/:username/stats
 * @desc Get Chess.com player statistics
 * @access Private
 */
router.get('/chesscom/player/:username/stats', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const stats = await chessComService.getPlayerStats(username);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Chess.com player stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/chesscom/player/:username/games
 * @desc Get Chess.com player games
 * @access Private
 */
router.get('/chesscom/player/:username/games', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 10 } = req.query;
    const games = await chessComService.getPlayerGames(username, parseInt(limit));

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Chess.com player games error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/chesscom/search
 * @desc Search Chess.com players
 * @access Private
 */
router.get('/chesscom/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const results = await chessComService.searchPlayers(q);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Chess.com search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/chesscom/tournament/:tournamentId
 * @desc Get Chess.com tournament
 * @access Private
 */
router.get('/chesscom/tournament/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await chessComService.getTournament(tournamentId);

    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Chess.com tournament error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/chesscom/live-games
 * @desc Get Chess.com live games
 * @access Private
 */
router.get('/chesscom/live-games', authenticate, async (req, res) => {
  try {
    const games = await chessComService.getLiveGames();

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Chess.com live games error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/chesscom/puzzle
 * @desc Get Chess.com puzzle of the day
 * @access Private
 */
router.get('/chesscom/puzzle', authenticate, async (req, res) => {
  try {
    const puzzle = await chessComService.getPuzzleOfTheDay();

    res.json({
      success: true,
      data: puzzle
    });
  } catch (error) {
    console.error('Chess.com puzzle error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/chesscom/club/:clubId
 * @desc Get Chess.com club
 * @access Private
 */
router.get('/chesscom/club/:clubId', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;
    const club = await chessComService.getClub(clubId);

    res.json({
      success: true,
      data: club
    });
  } catch (error) {
    console.error('Chess.com club error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/player/:username
 * @desc Get Lichess player profile
 * @access Private
 */
router.get('/lichess/player/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const profile = await lichessService.getPlayerProfile(username);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Lichess player profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/player/:username/stats
 * @desc Get Lichess player statistics
 * @access Private
 */
router.get('/lichess/player/:username/stats', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const stats = await lichessService.getPlayerStats(username);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Lichess player stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/player/:username/games
 * @desc Get Lichess player games
 * @access Private
 */
router.get('/lichess/player/:username/games', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 10 } = req.query;
    const games = await lichessService.getPlayerGames(username, parseInt(limit));

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Lichess player games error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/search
 * @desc Search Lichess players
 * @access Private
 */
router.get('/lichess/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const results = await lichessService.searchPlayers(q);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Lichess search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/tournament/:tournamentId
 * @desc Get Lichess tournament
 * @access Private
 */
router.get('/lichess/tournament/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await lichessService.getTournament(tournamentId);

    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Lichess tournament error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/live-games
 * @desc Get Lichess live games
 * @access Private
 */
router.get('/lichess/live-games', authenticate, async (req, res) => {
  try {
    const games = await lichessService.getLiveGames();

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Lichess live games error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/puzzle
 * @desc Get Lichess puzzle of the day
 * @access Private
 */
router.get('/lichess/puzzle', authenticate, async (req, res) => {
  try {
    const puzzle = await lichessService.getPuzzleOfTheDay();

    res.json({
      success: true,
      data: puzzle
    });
  } catch (error) {
    console.error('Lichess puzzle error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/team/:teamId
 * @desc Get Lichess team
 * @access Private
 */
router.get('/lichess/team/:teamId', authenticate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await lichessService.getTeam(teamId);

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Lichess team error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/lichess/tv
 * @desc Get Lichess TV games
 * @access Private
 */
router.get('/lichess/tv', authenticate, async (req, res) => {
  try {
    const games = await lichessService.getTVGames();

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Lichess TV games error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/search
 * @desc Search players across both platforms
 * @access Private
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, platform } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    let results = [];

    if (!platform || platform === 'chesscom') {
      try {
        const chessComResults = await chessComService.searchPlayers(q);
        results = results.concat(chessComResults);
      } catch (error) {
        console.error('Chess.com search failed:', error);
      }
    }

    if (!platform || platform === 'lichess') {
      try {
        const lichessResults = await lichessService.searchPlayers(q);
        results = results.concat(lichessResults);
      } catch (error) {
        console.error('Lichess search failed:', error);
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Multi-platform search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/player/:username
 * @desc Get player profile from both platforms
 * @access Private
 */
router.get('/player/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const { platform } = req.query;

    let results = {};

    if (!platform || platform === 'chesscom') {
      try {
        const chessComProfile = await chessComService.getPlayerProfile(username);
        results.chesscom = chessComProfile;
      } catch (error) {
        console.error('Chess.com profile failed:', error);
        results.chesscom = { error: error.message };
      }
    }

    if (!platform || platform === 'lichess') {
      try {
        const lichessProfile = await lichessService.getPlayerProfile(username);
        results.lichess = lichessProfile;
      } catch (error) {
        console.error('Lichess profile failed:', error);
        results.lichess = { error: error.message };
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Multi-platform player profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/status
 * @desc Get status of both chess platforms
 * @access Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const [chessComStatus, lichessStatus] = await Promise.all([
      chessComService.testConnection(),
      lichessService.testConnection()
    ]);

    res.json({
      success: true,
      data: {
        chesscom: chessComStatus,
        lichess: lichessStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Chess platform status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/chess/import-player
 * @desc Import player data from chess platforms
 * @access Private
 */
router.post('/import-player', authenticate, async (req, res) => {
  try {
    const { username, platform, tournamentId } = req.body;
    
    if (!username || !platform || !tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Username, platform, and tournament ID are required'
      });
    }

    let playerData;
    
    if (platform === 'chesscom') {
      const profile = await chessComService.getPlayerProfile(username);
      playerData = {
        name: profile.name,
        username: profile.username,
        rating: profile.stats.currentRating,
        title: profile.title,
        country: profile.country,
        platform: 'chesscom',
        platformData: profile
      };
    } else if (platform === 'lichess') {
      const profile = await lichessService.getPlayerProfile(username);
      playerData = {
        name: profile.name,
        username: profile.username,
        rating: profile.stats.currentRating,
        title: profile.title,
        country: profile.country,
        platform: 'lichess',
        platformData: profile
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Use "chesscom" or "lichess"'
      });
    }

    res.json({
      success: true,
      data: playerData,
      message: `Player data imported from ${platform}`
    });
  } catch (error) {
    console.error('Import player error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/chess/leaderboards
 * @desc Get leaderboards from both platforms
 * @access Private
 */
router.get('/leaderboards', authenticate, async (req, res) => {
  try {
    const { platform, timeControl = 'rapid' } = req.query;

    let results = {};

    if (!platform || platform === 'chesscom') {
      try {
        // Chess.com doesn't have a direct leaderboard API, so we'll simulate
        const chessComResults = await chessComService.searchPlayers(''); // Empty search returns top players
        results.chesscom = chessComResults.slice(0, 20);
      } catch (error) {
        console.error('Chess.com leaderboard failed:', error);
        results.chesscom = { error: error.message };
      }
    }

    if (!platform || platform === 'lichess') {
      try {
        const lichessResults = await lichessService.searchPlayers(''); // Empty search returns top players
        results.lichess = lichessResults.slice(0, 20);
      } catch (error) {
        console.error('Lichess leaderboard failed:', error);
        results.lichess = { error: error.message };
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Leaderboards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
