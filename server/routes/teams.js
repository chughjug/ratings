/**
 * Team Management Routes
 * Handles team creation, management, and team-based tournaments
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const teamService = require('../services/teamService');
const router = express.Router();

// Create a new team
router.post('/', async (req, res) => {
  const { tournamentId, name, captainId, boardCount = 4 } = req.body;

  if (!tournamentId || !name) {
    return res.status(400).json({ 
      success: false, 
      error: 'Tournament ID and team name are required' 
    });
  }

  try {
    const teamId = await teamService.createTeam(db, tournamentId, {
      name,
      captainId,
      boardCount
    });

    res.json({
      success: true,
      message: 'Team created successfully',
      teamId
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create team'
    });
  }
});

// Get all teams for a tournament
router.get('/tournament/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const teams = await teamService.getTournamentTeams(db, tournamentId);
    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
});

// Get team members
router.get('/:teamId/members', async (req, res) => {
  const { teamId } = req.params;

  try {
    const members = await teamService.getTeamMembers(db, teamId);
    res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team members'
    });
  }
});

// Add player to team
router.post('/:teamId/members', async (req, res) => {
  const { teamId } = req.params;
  const { playerId, boardNumber } = req.body;

  if (!playerId || boardNumber === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Player ID and board number are required'
    });
  }

  try {
    const memberId = await teamService.addTeamMember(db, teamId, playerId, boardNumber);
    res.json({
      success: true,
      message: 'Player added to team successfully',
      memberId
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add player to team'
    });
  }
});

// Remove player from team
router.delete('/:teamId/members/:playerId', async (req, res) => {
  const { teamId, playerId } = req.params;

  try {
    await teamService.removeTeamMember(db, teamId, playerId);
    res.json({
      success: true,
      message: 'Player removed from team successfully'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove player from team'
    });
  }
});

// Generate team pairings for a round
router.post('/pairings/generate', async (req, res) => {
  const { tournamentId, round } = req.body;

  if (!tournamentId || !round) {
    return res.status(400).json({
      success: false,
      error: 'Tournament ID and round are required'
    });
  }

  try {
    const pairings = await teamService.generateTeamPairings(db, tournamentId, round);
    res.json({
      success: true,
      pairings
    });
  } catch (error) {
    console.error('Error generating team pairings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate team pairings'
    });
  }
});

// Get team standings
router.get('/tournament/:tournamentId/standings', async (req, res) => {
  const { tournamentId } = req.params;
  const { 
    type = 'team', 
    scoring_method = 'all_players', 
    top_n = null 
  } = req.query; 

  try {
    let standings;
    if (type === 'individual') {
      // Individual tournaments with team scoring
      const topN = top_n ? parseInt(top_n) : null;
      standings = await teamService.calculateIndividualTournamentTeamStandings(
        db, 
        tournamentId, 
        scoring_method, 
        topN
      );
    } else {
      // Team tournaments (teams vs teams)
      standings = await teamService.calculateTeamStandings(db, tournamentId);
    }
    
    res.json({
      success: true,
      standings,
      type,
      scoring_method: type === 'individual' ? scoring_method : 'team_match',
      top_n: type === 'individual' ? topN : null
    });
  } catch (error) {
    console.error('Error calculating team standings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate team standings'
    });
  }
});

// Record team match result
router.post('/results', async (req, res) => {
  const { tournamentId, round, teamId, opponentTeamId, teamScore, opponentScore } = req.body;

  if (!tournamentId || !round || !teamId || teamScore === undefined || opponentScore === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Tournament ID, round, team ID, and scores are required'
    });
  }

  try {
    const resultId = await teamService.recordTeamResult(
      db, 
      tournamentId, 
      round, 
      teamId, 
      opponentTeamId, 
      teamScore, 
      opponentScore
    );
    
    res.json({
      success: true,
      message: 'Team result recorded successfully',
      resultId
    });
  } catch (error) {
    console.error('Error recording team result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record team result'
    });
  }
});

// Get team results for a round
router.get('/tournament/:tournamentId/round/:round/results', async (req, res) => {
  const { tournamentId, round } = req.params;

  try {
    const results = await teamService.getTeamResults(db, tournamentId, parseInt(round));
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error fetching team results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team results'
    });
  }
});

module.exports = router;
