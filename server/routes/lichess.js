const express = require('express');
const router = express.Router();
const LichessApiService = require('../services/lichessApi');
const db = require('../database');

const lichessApi = new LichessApiService();

// Store OAuth state and code verifiers temporarily (in production, use Redis or database)
const oauthStates = new Map();

/**
 * Initiate OAuth2 flow
 */
router.get('/auth', (req, res) => {
  try {
    const state = require('crypto').randomBytes(16).toString('hex');
    const { url, codeChallenge } = lichessApi.getAuthorizationUrl(state);
    
    // Store state and code challenge for verification
    oauthStates.set(state, { codeChallenge, timestamp: Date.now() });
    
    res.json({
      success: true,
      authUrl: url,
      state: state
    });
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth flow'
    });
  }
});

/**
 * OAuth2 callback handler
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Authorization failed',
        details: error
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
    }

    // Verify state
    const storedState = oauthStates.get(state);
    if (!storedState) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter'
      });
    }

    // Check if state is not too old (5 minutes)
    if (Date.now() - storedState.timestamp > 300000) {
      oauthStates.delete(state);
      return res.status(400).json({
        success: false,
        error: 'State expired'
      });
    }

    // Exchange code for token
    const tokenData = await lichessApi.exchangeCodeForToken(code, storedState.codeChallenge);
    
    // Clean up stored state
    oauthStates.delete(state);

    // Get user profile
    const userProfile = await lichessApi.getUserProfile(tokenData.access_token);

    res.json({
      success: true,
      accessToken: tokenData.access_token,
      user: userProfile,
      expiresIn: tokenData.expires_in
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'OAuth callback failed',
      details: error.message
    });
  }
});

/**
 * Create Lichess Swiss tournament
 */
router.post('/tournament/create', async (req, res) => {
  try {
    const { accessToken, tournamentData } = req.body;
    
    if (!accessToken || !tournamentData) {
      return res.status(400).json({
        success: false,
        error: 'Access token and tournament data are required'
      });
    }

    const lichessTournament = await lichessApi.createSwissTournament(accessToken, tournamentData);
    
    res.json({
      success: true,
      lichessTournament: lichessTournament
    });
  } catch (error) {
    console.error('Error creating Lichess tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Lichess tournament',
      details: error.message
    });
  }
});

/**
 * Create Lichess game for a pairing
 */
router.post('/create-game', async (req, res) => {
  try {
    const { pairingId, whitePlayer, blackPlayer, timeControl, accessToken } = req.body;
    
    if (!pairingId || !whitePlayer || !blackPlayer) {
      return res.status(400).json({
        success: false,
        error: 'Pairing ID and player usernames are required'
      });
    }

    // If we have an access token, try to create a real Lichess challenge
    if (accessToken) {
      try {
        const game = await lichessApi.createChallengeWithToken(
          accessToken,
          { lichess_username: whitePlayer, name: whitePlayer },
          { lichess_username: blackPlayer, name: blackPlayer },
          timeControl || 'G/45+15'
        );
        
        return res.json({
          success: true,
          game: game
        });
      } catch (tokenError) {
        console.log('OAuth challenge failed, falling back to simple game:', tokenError.message);
        // Fall through to simple game creation
      }
    }

    // Create a simple game challenge (no OAuth required)
    const game = await lichessApi.createSimpleGame(
      { lichess_username: whitePlayer, name: whitePlayer },
      { lichess_username: blackPlayer, name: blackPlayer },
      timeControl || 'G/45+15'
    );
    
    res.json({
      success: true,
      game: game
    });
  } catch (error) {
    console.error('Error creating Lichess game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Lichess game',
      details: error.message
    });
  }
});

/**
 * Join Lichess tournament
 */
router.post('/tournament/:lichessId/join', async (req, res) => {
  try {
    const { lichessId } = req.params;
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    await lichessApi.joinSwissTournament(accessToken, lichessId);
    
    res.json({
      success: true,
      message: 'Successfully joined tournament'
    });
  } catch (error) {
    console.error('Error joining tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join tournament',
      details: error.message
    });
  }
});

/**
 * Get Lichess tournament information
 */
router.get('/tournament/:lichessId', async (req, res) => {
  try {
    const { lichessId } = req.params;
    
    const tournamentInfo = await lichessApi.getTournamentInfo(lichessId);
    
    res.json({
      success: true,
      tournament: tournamentInfo
    });
  } catch (error) {
    console.error('Error getting tournament info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament information',
      details: error.message
    });
  }
});

/**
 * Get Lichess tournament results
 */
router.get('/tournament/:lichessId/results', async (req, res) => {
  try {
    const { lichessId } = req.params;
    
    const results = await lichessApi.getTournamentResults(lichessId);
    
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Error getting tournament results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament results',
      details: error.message
    });
  }
});

/**
 * Get Lichess tournament games
 */
router.get('/tournament/:lichessId/games', async (req, res) => {
  try {
    const { lichessId } = req.params;
    
    const games = await lichessApi.getTournamentGames(lichessId);
    
    res.json({
      success: true,
      games: games
    });
  } catch (error) {
    console.error('Error getting tournament games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament games',
      details: error.message
    });
  }
});

/**
 * Sync tournament results from Lichess to local database
 */
router.post('/tournament/:lichessId/sync', async (req, res) => {
  try {
    const { lichessId } = req.params;
    const { tournamentId, accessToken } = req.body;
    
    if (!tournamentId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID and access token are required'
      });
    }

    const syncResult = await lichessApi.syncTournamentResults(db, tournamentId, lichessId, accessToken);
    
    res.json({
      success: true,
      message: 'Tournament results synced successfully',
      syncedGames: syncResult.syncedGames
    });
  } catch (error) {
    console.error('Error syncing tournament results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync tournament results',
      details: error.message
    });
  }
});

/**
 * Create challenges for tournament pairings
 */
router.post('/challenges/create', async (req, res) => {
  try {
    const { accessToken, pairings, timeControl } = req.body;
    
    if (!accessToken || !pairings || !timeControl) {
      return res.status(400).json({
        success: false,
        error: 'Access token, pairings, and time control are required'
      });
    }

    const challenges = [];
    
    for (const pairing of pairings) {
      try {
        const challenge = await lichessApi.createChallenge(
          accessToken, 
          pairing.whitePlayer, 
          pairing.blackPlayer, 
          timeControl
        );
        challenges.push({
          pairingId: pairing.id,
          challengeId: challenge.id,
          status: 'created'
        });
      } catch (error) {
        console.error(`Error creating challenge for pairing ${pairing.id}:`, error);
        challenges.push({
          pairingId: pairing.id,
          error: error.message,
          status: 'failed'
        });
      }
    }
    
    res.json({
      success: true,
      challenges: challenges
    });
  } catch (error) {
    console.error('Error creating challenges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create challenges',
      details: error.message
    });
  }
});

/**
 * Search Lichess users
 */
router.get('/users/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const users = await lichessApi.searchUsers(query);
    
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users',
      details: error.message
    });
  }
});

/**
 * Get user data
 */
router.get('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const userData = await lichessApi.getUserData(username);
    
    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data',
      details: error.message
    });
  }
});

/**
 * Export game
 */
router.get('/games/:gameId/export', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { format = 'pgn' } = req.query;
    
    const gameData = await lichessApi.exportGame(gameId, format);
    
    res.json({
      success: true,
      game: gameData
    });
  } catch (error) {
    console.error('Error exporting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export game',
      details: error.message
    });
  }
});

/**
 * Create bulk pairing
 */
router.post('/bulk-pairing', async (req, res) => {
  try {
    const { accessToken, games } = req.body;
    
    if (!accessToken || !games) {
      return res.status(400).json({
        success: false,
        error: 'Access token and games are required'
      });
    }

    const bulkPairing = await lichessApi.createBulkPairing(accessToken, games);
    
    res.json({
      success: true,
      bulkPairing: bulkPairing
    });
  } catch (error) {
    console.error('Error creating bulk pairing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bulk pairing',
      details: error.message
    });
  }
});

module.exports = router;
