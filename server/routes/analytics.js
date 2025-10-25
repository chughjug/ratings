const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { authenticate } = require('../middleware/auth');

/**
 * @route GET /api/analytics/tournament/:tournamentId
 * @desc Get comprehensive analytics for a specific tournament
 * @access Private
 */
router.get('/tournament/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const analytics = await analyticsService.getTournamentAnalytics(tournamentId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Tournament analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/overview
 * @desc Get tournament overview analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/overview', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const overview = await analyticsService.getTournamentOverview(tournamentId);

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Tournament overview analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/players
 * @desc Get player statistics analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/players', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const playerStats = await analyticsService.getPlayerStatistics(tournamentId);

    res.json({
      success: true,
      data: playerStats
    });
  } catch (error) {
    console.error('Player analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/pairings
 * @desc Get pairing analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/pairings', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const pairingStats = await analyticsService.getPairingAnalytics(tournamentId);

    res.json({
      success: true,
      data: pairingStats
    });
  } catch (error) {
    console.error('Pairing analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/ratings
 * @desc Get rating distribution analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/ratings', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const ratingStats = await analyticsService.getRatingDistribution(tournamentId);

    res.json({
      success: true,
      data: ratingStats
    });
  } catch (error) {
    console.error('Rating analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/performance
 * @desc Get performance metrics analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/performance', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const performanceStats = await analyticsService.getPerformanceMetrics(tournamentId);

    res.json({
      success: true,
      data: performanceStats
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/time
 * @desc Get time analysis analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/time', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const timeStats = await analyticsService.getTimeAnalysis(tournamentId);

    res.json({
      success: true,
      data: timeStats
    });
  } catch (error) {
    console.error('Time analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/sections
 * @desc Get section analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/sections', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const sectionStats = await analyticsService.getSectionAnalytics(tournamentId);

    res.json({
      success: true,
      data: sectionStats
    });
  } catch (error) {
    console.error('Section analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/tournament/:tournamentId/financial
 * @desc Get financial analytics
 * @access Private
 */
router.get('/tournament/:tournamentId/financial', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const financialStats = await analyticsService.getFinancialAnalytics(tournamentId);

    res.json({
      success: true,
      data: financialStats
    });
  } catch (error) {
    console.error('Financial analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/system
 * @desc Get system-wide analytics
 * @access Private
 */
router.get('/system', authenticate, async (req, res) => {
  try {
    const systemAnalytics = await analyticsService.getSystemAnalytics();

    res.json({
      success: true,
      data: systemAnalytics
    });
  } catch (error) {
    console.error('System analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/trends/tournaments
 * @desc Get tournament trends over time
 * @access Private
 */
router.get('/trends/tournaments', authenticate, async (req, res) => {
  try {
    const trends = await analyticsService.getTournamentTrends();

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Tournament trends error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/trends/players
 * @desc Get player trends over time
 * @access Private
 */
router.get('/trends/players', authenticate, async (req, res) => {
  try {
    const trends = await analyticsService.getPlayerTrends();

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Player trends error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/metrics
 * @desc Get system metrics
 * @access Private
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const metrics = await analyticsService.getSystemMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/features
 * @desc Get popular features analytics
 * @access Private
 */
router.get('/features', authenticate, async (req, res) => {
  try {
    const features = await analyticsService.getPopularFeatures();

    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Features analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/analytics/clear-cache
 * @desc Clear analytics cache
 * @access Private
 */
router.post('/clear-cache', authenticate, async (req, res) => {
  try {
    analyticsService.clearCache();

    res.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/export/:tournamentId
 * @desc Export analytics data as CSV/JSON
 * @access Private
 */
router.get('/export/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { format = 'json' } = req.query;
    
    const analytics = await analyticsService.getTournamentAnalytics(tournamentId);

    if (format === 'csv') {
      // Convert analytics to CSV format
      const csv = convertToCSV(analytics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tournament-${tournamentId}-analytics.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="tournament-${tournamentId}-analytics.json"`);
      res.json(analytics);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/dashboard/:tournamentId
 * @desc Get dashboard-specific analytics data
 * @access Private
 */
router.get('/dashboard/:tournamentId', authenticate, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { widgets = [] } = req.query;
    
    const analytics = await analyticsService.getTournamentAnalytics(tournamentId);
    
    // Filter data based on requested widgets
    const dashboardData = {};
    if (widgets.includes('overview')) dashboardData.overview = analytics.overview;
    if (widgets.includes('players')) dashboardData.players = analytics.players;
    if (widgets.includes('pairings')) dashboardData.pairings = analytics.pairings;
    if (widgets.includes('ratings')) dashboardData.ratings = analytics.ratings;
    if (widgets.includes('performance')) dashboardData.performance = analytics.performance;
    if (widgets.includes('time')) dashboardData.timeAnalysis = analytics.timeAnalysis;
    if (widgets.includes('sections')) dashboardData.sections = analytics.sections;
    if (widgets.includes('financial')) dashboardData.financial = analytics.financial;

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to convert analytics to CSV
function convertToCSV(analytics) {
  const lines = [];
  
  // Add overview data
  lines.push('Section,Key,Value');
  if (analytics.overview) {
    Object.entries(analytics.overview).forEach(([key, value]) => {
      lines.push(`Overview,${key},${value}`);
    });
  }
  
  // Add player statistics
  if (analytics.players && analytics.players.topPerformers) {
    lines.push('Player Statistics,Name,Rating,Score,Rank');
    analytics.players.topPerformers.forEach(player => {
      lines.push(`Player Statistics,${player.name},${player.rating},${player.score},${player.final_rank}`);
    });
  }
  
  return lines.join('\n');
}

module.exports = router;