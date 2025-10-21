/**
 * Analytics Routes
 * Provides comprehensive tournament analytics and insights
 */

const express = require('express');
const db = require('../database');
const analyticsService = require('../services/analyticsService');
const router = express.Router();

// Get comprehensive tournament analytics
router.get('/tournament/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const analytics = await analyticsService.getComprehensiveAnalytics(db, tournamentId);
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching tournament analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament analytics'
    });
  }
});

// Get tournament overview
router.get('/tournament/:tournamentId/overview', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const overview = await analyticsService.getTournamentOverview(db, tournamentId);
    res.json({
      success: true,
      overview
    });
  } catch (error) {
    console.error('Error fetching tournament overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament overview'
    });
  }
});

// Get player performance analytics
router.get('/tournament/:tournamentId/players', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const playerPerformance = await analyticsService.getPlayerPerformanceAnalytics(db, tournamentId);
    res.json({
      success: true,
      playerPerformance
    });
  } catch (error) {
    console.error('Error fetching player performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player performance'
    });
  }
});

// Get rating performance analysis
router.get('/tournament/:tournamentId/ratings', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const ratingPerformance = await analyticsService.getRatingPerformanceAnalysis(db, tournamentId);
    res.json({
      success: true,
      ratingPerformance
    });
  } catch (error) {
    console.error('Error fetching rating performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rating performance'
    });
  }
});

// Get section performance analysis
router.get('/tournament/:tournamentId/sections', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const sectionPerformance = await analyticsService.getSectionPerformanceAnalysis(db, tournamentId);
    res.json({
      success: true,
      sectionPerformance
    });
  } catch (error) {
    console.error('Error fetching section performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch section performance'
    });
  }
});

// Get game result distribution
router.get('/tournament/:tournamentId/results', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const gameDistribution = await analyticsService.getGameResultDistribution(db, tournamentId);
    res.json({
      success: true,
      gameDistribution
    });
  } catch (error) {
    console.error('Error fetching game distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game distribution'
    });
  }
});

// Get color performance analysis
router.get('/tournament/:tournamentId/colors', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const colorPerformance = await analyticsService.getColorPerformanceAnalysis(db, tournamentId);
    res.json({
      success: true,
      colorPerformance
    });
  } catch (error) {
    console.error('Error fetching color performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch color performance'
    });
  }
});

// Get round-by-round analysis
router.get('/tournament/:tournamentId/rounds', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const roundAnalysis = await analyticsService.getRoundByRoundAnalysis(db, tournamentId);
    res.json({
      success: true,
      roundAnalysis
    });
  } catch (error) {
    console.error('Error fetching round analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch round analysis'
    });
  }
});

// Get top performers
router.get('/tournament/:tournamentId/top-performers', async (req, res) => {
  const { tournamentId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const topPerformers = await analyticsService.getTopPerformers(db, tournamentId, parseInt(limit));
    res.json({
      success: true,
      topPerformers
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top performers'
    });
  }
});

module.exports = router;
