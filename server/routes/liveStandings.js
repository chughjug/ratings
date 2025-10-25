const express = require('express');
const router = express.Router();
const liveStandingsService = require('../services/liveStandingsService');
const { authenticate } = require('../middleware/auth');

/**
 * @route GET /api/live-standings/:tournamentId
 * @desc Get current live standings for tournament
 * @access Private
 */
router.get('/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const standings = liveStandingsService.getCurrentStandings(tournamentId);

    if (!standings) {
      return res.status(404).json({
        success: false,
        error: 'No live standings available for this tournament'
      });
    }

    res.json({
      success: true,
      data: standings
    });
  } catch (error) {
    console.error('Live standings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/live-standings/:tournamentId/trigger
 * @desc Manually trigger standings update
 * @access Private
 */
router.post('/:tournamentId/trigger', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await liveStandingsService.triggerUpdate(tournamentId);

    res.json({
      success: true,
      message: 'Standings update triggered successfully'
    });
  } catch (error) {
    console.error('Trigger update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/live-standings/:tournamentId/clients
 * @desc Get connected clients count for tournament
 * @access Private
 */
router.get('/:tournamentId/clients', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const clientCount = liveStandingsService.getConnectedClientsCount(tournamentId);

    res.json({
      success: true,
      data: {
        tournamentId,
        connectedClients: clientCount
      }
    });
  } catch (error) {
    console.error('Client count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/live-standings/active
 * @desc Get all active tournaments with live standings
 * @access Private
 */
router.get('/active', authenticate, async (req, res) => {
  try {
    const activeTournaments = liveStandingsService.getActiveTournaments();
    
    const tournamentsWithData = activeTournaments.map(tournamentId => {
      const standings = liveStandingsService.getCurrentStandings(tournamentId);
      const clientCount = liveStandingsService.getConnectedClientsCount(tournamentId);
      
      return {
        tournamentId,
        clientCount,
        lastUpdated: standings?.lastUpdated,
        currentRound: standings?.round
      };
    });

    res.json({
      success: true,
      data: {
        activeTournaments: tournamentsWithData,
        total: activeTournaments.length
      }
    });
  } catch (error) {
    console.error('Active tournaments error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/live-standings/update-all
 * @desc Force update all active tournaments
 * @access Private
 */
router.post('/update-all', authenticate, async (req, res) => {
  try {
    await liveStandingsService.updateAllActiveTournaments();

    res.json({
      success: true,
      message: 'All active tournaments updated successfully'
    });
  } catch (error) {
    console.error('Update all error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/live-standings/stats
 * @desc Get live standings service statistics
 * @access Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = liveStandingsService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/live-standings/cleanup
 * @desc Clean up inactive connections and data
 * @access Private
 */
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    liveStandingsService.cleanup();

    res.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/live-standings/ws-info
 * @desc Get WebSocket connection information
 * @access Private
 */
router.get('/ws-info', authenticate, async (req, res) => {
  try {
    const wsUrl = process.env.WS_URL || `ws://localhost:${process.env.PORT || 5000}/ws/standings`;
    
    res.json({
      success: true,
      data: {
        wsUrl,
        protocol: 'ws',
        path: '/ws/standings',
        instructions: {
          connect: 'Connect to WebSocket endpoint',
          subscribe: 'Send { "type": "subscribe", "tournamentId": "tournament-id" }',
          unsubscribe: 'Send { "type": "unsubscribe", "tournamentId": "tournament-id" }',
          ping: 'Send { "type": "ping" } for connection test'
        }
      }
    });
  } catch (error) {
    console.error('WS info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
