/**
 * Team Management Routes
 * Handles team categories for individual tournaments with team scoring
 * Also handles team tournaments (team-tournament format) with Team vs Team pairing
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const router = express.Router();

// Get all team names for a tournament
router.get('/tournament/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const teams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT team_name, COUNT(*) as member_count
         FROM players 
         WHERE tournament_id = ? AND team_name IS NOT NULL AND team_name != '' AND status = 'active'
         GROUP BY team_name
         ORDER BY team_name`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

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

// Get team members for a tournament
router.get('/tournament/:tournamentId/members', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const members = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          p.id as player_id,
          p.name as player_name,
          p.rating,
          p.uscf_id,
          p.fide_id,
          p.team_name,
          COALESCE(SUM(r.points), 0) as total_points,
          COUNT(r.id) as games_played
         FROM players p
         LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
         WHERE p.tournament_id = ? AND p.status = 'active'
         GROUP BY p.id, p.name, p.rating, p.uscf_id, p.fide_id, p.team_name
         ORDER BY p.team_name, total_points DESC, p.rating DESC`,
        [tournamentId, tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

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

// Get team standings
router.get('/tournament/:tournamentId/standings', async (req, res) => {
  const { tournamentId } = req.params;
  const { 
    scoring_method = 'top_4', 
    top_n = 4 
  } = req.query; 

  try {
    const topN = top_n ? parseInt(top_n) : 4;
    
    // Get tournament rounds first
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT rounds FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    const totalRounds = tournament ? tournament.rounds : 7;
    
    const standings = await new Promise((resolve, reject) => {
      db.all(
        `WITH team_player_scores AS (
          SELECT 
            p.team_name,
            p.id as player_id,
            p.name as player_name,
            p.rating,
            COALESCE(SUM(r.points), 0) as player_total_points,
            COUNT(r.id) as player_games_played,
            ROW_NUMBER() OVER (PARTITION BY p.team_name ORDER BY COALESCE(SUM(r.points), 0) DESC, p.rating DESC) as player_rank
          FROM players p
          LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
          WHERE p.tournament_id = ? AND p.team_name IS NOT NULL AND p.team_name != '' AND p.status = 'active'
          GROUP BY p.team_name, p.id, p.name, p.rating
        ),
        team_top_scores AS (
          SELECT 
            team_name,
            SUM(CASE WHEN player_rank <= ? THEN player_total_points ELSE 0 END) as team_total_points,
            COUNT(CASE WHEN player_rank <= ? THEN 1 END) as counted_players,
            SUM(player_total_points) as all_players_total,
            COUNT(*) as total_members,
            MAX(CASE WHEN player_rank = 1 THEN player_total_points END) as top_player_score,
            SUM(CASE WHEN player_rank <= 2 THEN player_total_points ELSE 0 END) as top_2_sum,
            SUM(CASE WHEN player_rank <= 3 THEN player_total_points ELSE 0 END) as top_3_sum
          FROM team_player_scores
          GROUP BY team_name
        )
        SELECT 
          team_name,
          team_total_points,
          counted_players,
          all_players_total,
          total_members,
          top_player_score,
          top_2_sum,
          top_3_sum
        FROM team_top_scores
        WHERE team_total_points > 0 OR total_members > 0
        ORDER BY team_total_points DESC, top_3_sum DESC, top_2_sum DESC, top_player_score DESC`,
        [tournamentId, tournamentId, topN, topN],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    // Calculate progressive scores for each team and get player information
    const enhancedStandings = await Promise.all(standings.map(async (team) => {
      // Get player information for this team
      const teamPlayers = await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
            p.name,
            p.rating,
            p.section,
            COALESCE(SUM(r.points), 0) as player_points
          FROM players p
          LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
          WHERE p.tournament_id = ? AND p.team_name = ? AND p.status = 'active'
          GROUP BY p.id, p.name, p.rating, p.section
          ORDER BY COALESCE(SUM(r.points), 0) DESC, p.rating DESC`,
          [tournamentId, tournamentId, team.team_name],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const progressiveScores = await new Promise((resolve, reject) => {
        db.all(
          `WITH team_player_progressive AS (
            SELECT 
              p.team_name,
              p.id as player_id,
              r.round,
              COALESCE(r.points, 0) as round_points,
              ROW_NUMBER() OVER (PARTITION BY p.team_name, r.round ORDER BY COALESCE(r.points, 0) DESC, p.rating DESC) as player_rank
            FROM players p
            LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
            WHERE p.tournament_id = ? AND p.team_name = ? AND p.team_name IS NOT NULL AND p.team_name != '' AND p.status = 'active'
          )
          SELECT 
            round,
            SUM(CASE WHEN player_rank <= ? THEN round_points ELSE 0 END) as round_team_score
          FROM team_player_progressive
          GROUP BY round
          ORDER BY round`,
          [tournamentId, tournamentId, team.team_name, topN],
          (err, rows) => {
            if (err) reject(err);
            else {
              // Convert to array of cumulative scores
              const progressive = [];
              let cumulative = 0;
              for (let round = 1; round <= totalRounds; round++) {
                const roundData = rows.find(r => r.round === round);
                cumulative += (roundData ? roundData.round_team_score : 0);
                progressive.push(cumulative);
              }
              resolve(progressive);
            }
          }
        );
      });
      
      // Determine team section based on players' sections
      const teamSection = teamPlayers.length > 0 ? teamPlayers[0].section || 'Open' : 'Open';
      
      return {
        ...team,
        progressive_scores: progressiveScores,
        players: teamPlayers,
        section: teamSection
      };
    }));
    
    res.json({
      success: true,
      standings: enhancedStandings,
      type: 'individual',
      scoring_method,
      top_n: topN,
      total_rounds: totalRounds
    });
  } catch (error) {
    console.error('Error calculating team standings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate team standings'
    });
  }
});

// ============================================================================
// TEAM TOURNAMENT ENDPOINTS (team-tournament format)
// ============================================================================

// Create a new team for team-tournament format
router.post('/team-tournament/:tournamentId/create', async (req, res) => {
  const { tournamentId } = req.params;
  const { name, captain_id } = req.body;

  try {
    // Verify tournament format
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    if (tournament.format !== 'team-tournament') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for team-tournament format tournaments'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Team name is required'
      });
    }

    const teamId = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO teams (id, tournament_id, name, captain_id, status) VALUES (?, ?, ?, ?, ?)',
        [teamId, tournamentId, name.trim(), captain_id || null, 'active'],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint')) {
              reject(new Error('A team with this name already exists in this tournament'));
            } else {
              reject(err);
            }
          } else {
            resolve(teamId);
          }
        }
      );
    });

    // Get the created team
    const team = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM teams WHERE id = ?', [teamId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create team'
    });
  }
});

// Get all teams for a team-tournament format tournament
router.get('/team-tournament/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Verify tournament format
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    const teams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          t.*,
          COUNT(tm.id) as member_count,
          p.name as captain_name
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN players p ON t.captain_id = p.id
        WHERE t.tournament_id = ?
        GROUP BY t.id
        ORDER BY t.name`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await new Promise((resolve, reject) => {
          db.all(
            `SELECT 
              tm.id,
              tm.board_number,
              p.id as player_id,
              p.name as player_name,
              p.rating,
              p.uscf_id,
              p.fide_id
            FROM team_members tm
            JOIN players p ON tm.player_id = p.id
            WHERE tm.team_id = ?
            ORDER BY p.rating DESC, tm.board_number`,
            [team.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        return {
          ...team,
          members: members
        };
      })
    );

    res.json({
      success: true,
      teams: teamsWithMembers
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
});

// Add a player to a team (team-tournament format)
router.post('/team-tournament/:teamId/add-player', async (req, res) => {
  const { teamId } = req.params;
  const { player_id, board_number } = req.body;

  try {
    if (!player_id) {
      return res.status(400).json({
        success: false,
        error: 'player_id is required'
      });
    }

    // Verify team exists and get tournament format
    const team = await new Promise((resolve, reject) => {
      db.get(
        `SELECT t.*, tr.format as tournament_format 
         FROM teams t 
         JOIN tournaments tr ON t.tournament_id = tr.id 
         WHERE t.id = ?`,
        [teamId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    if (team.tournament_format !== 'team-tournament') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for team-tournament format'
      });
    }

    // Verify player exists and is in the same tournament
    const player = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM players WHERE id = ? AND tournament_id = ?', 
        [player_id, team.tournament_id], 
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found or not in this tournament'
      });
    }

    const memberId = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO team_members (id, team_id, player_id, board_number) VALUES (?, ?, ?, ?)',
        [memberId, teamId, player_id, board_number || null],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint')) {
              reject(new Error('Player is already a member of this team'));
            } else {
              reject(err);
            }
          } else {
            resolve(memberId);
          }
        }
      );
    });

    // Get the created team member
    const member = await new Promise((resolve, reject) => {
      db.get(
        `SELECT tm.*, p.name as player_name, p.rating, p.uscf_id, p.fide_id
         FROM team_members tm
         JOIN players p ON tm.player_id = p.id
         WHERE tm.id = ?`,
        [memberId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error adding player to team:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add player to team'
    });
  }
});

// Remove a player from a team (team-tournament format)
router.delete('/team-tournament/:teamId/remove-player/:playerId', async (req, res) => {
  const { teamId, playerId } = req.params;

  try {
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM team_members WHERE team_id = ? AND player_id = ?',
        [teamId, playerId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Player removed from team'
    });
  } catch (error) {
    console.error('Error removing player from team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove player from team'
    });
  }
});

// Delete a team (team-tournament format)
router.delete('/team-tournament/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM teams WHERE id = ?', [teamId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      success: true,
      message: 'Team deleted'
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete team'
    });
  }
});

// Update team (team-tournament format)
router.put('/team-tournament/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const { name, captain_id, status } = req.body;

  try {
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (captain_id !== undefined) {
      updates.push('captain_id = ?');
      params.push(captain_id || null);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    params.push(teamId);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Get the updated team
    const team = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM teams WHERE id = ?', [teamId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update team'
    });
  }
});

module.exports = router;
