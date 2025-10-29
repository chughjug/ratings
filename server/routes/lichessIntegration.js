const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * @route GET /api/lichess/integrations/:organizationId
 * @desc Get Lichess integrations for an organization
 * @access Private
 */
router.get('/integrations/:organizationId', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const db = require('../database');
    
    db.all(
      'SELECT * FROM lichess_integrations WHERE organization_id = ? AND is_active = 1',
      [organizationId],
      (err, integrations) => {
        if (err) {
          console.error('Error fetching Lichess integrations:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch Lichess integrations'
          });
        }

        res.json({
          success: true,
          data: integrations
        });
      }
    );
  } catch (error) {
    console.error('Lichess integrations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/lichess/connect
 * @desc Connect Lichess account to organization
 * @access Private
 */
router.post('/connect', authenticate, async (req, res) => {
  try {
    const { organization_id, lichess_username, access_token } = req.body;

    if (!organization_id || !lichess_username) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and Lichess username are required'
      });
    }

    const db = require('../database');
    const id = uuidv4();

    // Verify Lichess username exists
    try {
      const lichessUser = await axios.get(`https://lichess.org/api/user/${lichess_username}`);
      if (!lichessUser.data) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Lichess username'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Lichess username not found'
      });
    }

    db.run(
      `INSERT OR REPLACE INTO lichess_integrations 
       (id, organization_id, lichess_username, access_token, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [id, organization_id, lichess_username, access_token],
      function(err) {
        if (err) {
          console.error('Error connecting Lichess account:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to connect Lichess account'
          });
        }

        res.json({
          success: true,
          data: {
            id,
            organization_id,
            lichess_username,
            connected: true
          }
        });
      }
    );
  } catch (error) {
    console.error('Connect Lichess error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/lichess/create-challenge
 * @desc Create Lichess challenge for tournament pairing
 * @access Private
 */
router.post('/create-challenge', authenticate, async (req, res) => {
  try {
    const {
      organization_id,
      tournament_id,
      pairing_id,
      white_player,
      black_player,
      time_control,
      rated = true
    } = req.body;

    if (!organization_id || !tournament_id || !pairing_id || !white_player || !black_player) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, tournament ID, pairing ID, and both players are required'
      });
    }

    const db = require('../database');
    
    // Get Lichess integration
    const integration = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM lichess_integrations WHERE organization_id = ? AND is_active = 1',
        [organization_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!integration) {
      return res.status(400).json({
        success: false,
        error: 'Lichess integration not found for this organization'
      });
    }

    // Parse time control
    const timeControl = parseTimeControl(time_control);
    
    // Create challenge data
    const challengeData = {
      name: `${white_player.name} vs ${black_player.name}`,
      rated: rated,
      clock: {
        limit: timeControl.limit,
        increment: timeControl.increment
      },
      color: 'random',
      variant: 'standard',
      message: `Tournament: ${tournament_id}, Pairing: ${pairing_id}`
    };

    // Create Lichess challenge
    const lichessService = require('../services/lichessService');
    const challenge = await lichessService.createChallenge(integration.access_token, challengeData);

    // Update pairing with Lichess challenge ID
    db.run(
      'UPDATE pairings SET lichess_challenge_id = ? WHERE id = ?',
      [challenge.id, pairing_id],
      function(err) {
        if (err) {
          console.error('Error updating pairing with challenge ID:', err);
        }
      }
    );

    res.json({
      success: true,
      data: {
        challenge_id: challenge.id,
        challenge_url: challenge.url,
        pairing_id: pairing_id,
        white_player: white_player.name,
        black_player: black_player.name
      }
    });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/lichess/challenge-status/:challengeId
 * @desc Get Lichess challenge status
 * @access Private
 */
router.get('/challenge-status/:challengeId', authenticate, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const db = require('../database');
    
    // Get pairing with challenge ID
    const pairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE lichess_challenge_id = ?',
        [challengeId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!pairing) {
      return res.status(404).json({
        success: false,
        error: 'Pairing not found'
      });
    }

    // Get Lichess integration
    const integration = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM lichess_integrations WHERE organization_id = ? AND is_active = 1',
        [pairing.organization_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!integration) {
      return res.status(400).json({
        success: false,
        error: 'Lichess integration not found'
      });
    }

    // Get challenge status from Lichess
    const lichessService = require('../services/lichessService');
    const challengeStatus = await lichessService.getChallengeStatus(integration.access_token, challengeId);

    res.json({
      success: true,
      data: {
        challenge_id: challengeId,
        status: challengeStatus.status,
        game_id: challengeStatus.game_id,
        pairing_id: pairing.id
      }
    });
  } catch (error) {
    console.error('Challenge status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/lichess/sync-game-result
 * @desc Sync Lichess game result to pairing
 * @access Private
 */
router.post('/sync-game-result', authenticate, async (req, res) => {
  try {
    const { game_id, pairing_id } = req.body;

    if (!game_id || !pairing_id) {
      return res.status(400).json({
        success: false,
        error: 'Game ID and pairing ID are required'
      });
    }

    const db = require('../database');
    
    // Get pairing details
    const pairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairing_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!pairing) {
      return res.status(404).json({
        success: false,
        error: 'Pairing not found'
      });
    }

    // Get Lichess integration
    const integration = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM lichess_integrations WHERE organization_id = ? AND is_active = 1',
        [pairing.organization_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!integration) {
      return res.status(400).json({
        success: false,
        error: 'Lichess integration not found'
      });
    }

    // Get game result from Lichess
    const lichessService = require('../services/lichessService');
    const gameResult = await lichessService.getGameResult(integration.access_token, game_id);

    // Update pairing with result
    db.run(
      'UPDATE pairings SET result = ?, lichess_game_id = ? WHERE id = ?',
      [gameResult.result, game_id, pairing_id],
      function(err) {
        if (err) {
          console.error('Error updating pairing result:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to update pairing result'
          });
        }

        res.json({
          success: true,
          data: {
            pairing_id: pairing_id,
            game_id: game_id,
            result: gameResult.result,
            synced: true
          }
        });
      }
    );
  } catch (error) {
    console.error('Sync game result error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/lichess/player-stats/:username
 * @desc Get Lichess player statistics
 * @access Public
 */
router.get('/player-stats/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const lichessService = require('../services/lichessService');
    const stats = await lichessService.getPlayerStats(username);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Player stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/lichess/disconnect/:organizationId
 * @desc Disconnect Lichess integration
 * @access Private
 */
router.delete('/disconnect/:organizationId', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const db = require('../database');

    db.run(
      'UPDATE lichess_integrations SET is_active = 0 WHERE organization_id = ?',
      [organizationId],
      function(err) {
        if (err) {
          console.error('Error disconnecting Lichess:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to disconnect Lichess integration'
          });
        }

        res.json({
          success: true,
          message: 'Lichess integration disconnected successfully'
        });
      }
    );
  } catch (error) {
    console.error('Disconnect Lichess error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to parse time control
 */
function parseTimeControl(timeControl) {
  if (!timeControl) {
    return { limit: 1800, increment: 0 }; // Default 30+0
  }

  // Parse formats like "30+0", "15+10", "5+3"
  const match = timeControl.match(/(\d+)\+(\d+)/);
  if (match) {
    return {
      limit: parseInt(match[1]) * 60, // Convert minutes to seconds
      increment: parseInt(match[2])
    };
  }

  // Parse formats like "1800+0" (seconds)
  const secondsMatch = timeControl.match(/(\d+)\+(\d+)/);
  if (secondsMatch) {
    return {
      limit: parseInt(secondsMatch[1]),
      increment: parseInt(secondsMatch[2])
    };
  }

  return { limit: 1800, increment: 0 }; // Default fallback
}

module.exports = router;
