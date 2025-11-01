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
    // Get tournament format to determine which calculation method to use
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT format, rounds FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
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

    const totalRounds = tournament.rounds || 7;

    // For team-tournament format, use team match-based standings
    if (tournament.format === 'team-tournament') {
      // Get all teams
      const teams = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, name, tournament_id 
           FROM teams 
           WHERE tournament_id = ? AND status = 'active'
           ORDER BY name`,
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (teams.length === 0) {
        return res.json({
          success: true,
          standings: [],
          type: 'team-match',
          scoring_method,
          total_rounds: totalRounds
        });
      }

      // Calculate standings from pairings (similar to calculateTeamScoresFromDB)
      const teamScores = {};
      
      // Initialize all teams
      teams.forEach(team => {
        teamScores[team.id] = {
          matchPoints: 0,
          gamePoints: 0,
          matchWins: 0,
          matchDraws: 0,
          matchLosses: 0,
          matchesPlayed: 0,
          progressive: Array(totalRounds).fill(0)
        };
      });

      // Get all completed pairings
      const allPairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
            p.round,
            p.white_player_id,
            p.black_player_id,
            p.result,
            p.is_bye,
            p.section,
            COALESCE(r1.points, 0) as white_points,
            COALESCE(r2.points, 0) as black_points,
            tm1.team_id as white_team_id,
            tm2.team_id as black_team_id
          FROM pairings p
          LEFT JOIN team_members tm1 ON p.white_player_id = tm1.player_id
          LEFT JOIN team_members tm2 ON p.black_player_id = tm2.player_id
          LEFT JOIN results r1 ON p.id = r1.pairing_id AND r1.player_id = p.white_player_id
          LEFT JOIN results r2 ON p.id = r2.pairing_id AND r2.player_id = p.black_player_id
          WHERE p.tournament_id = ?
            AND tm1.team_id IS NOT NULL
            AND (tm2.team_id IS NOT NULL OR p.is_bye = 1)
          ORDER BY p.round, p.section, p.board`,
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      // Group pairings by round and section (team match)
      const matchesByRound = {};
      allPairings.forEach(p => {
        if (p.is_bye && p.white_team_id) {
          // Handle bye - team gets 1 match point
          const key = `bye_${p.round}_${p.white_team_id}`;
          if (!matchesByRound[key]) {
            matchesByRound[key] = {
              round: p.round,
              team1Id: p.white_team_id,
              team2Id: null,
              isBye: true,
              games: []
            };
          }
        } else if (p.white_team_id && p.black_team_id) {
          const key = `${p.round}_${p.section}`;
          if (!matchesByRound[key]) {
            matchesByRound[key] = {
              round: p.round,
              section: p.section,
              team1Id: p.white_team_id,
              team2Id: p.black_team_id,
              isBye: false,
              games: []
            };
          }
          
          // Calculate points from result or results table
          let whitePoints = p.white_points || 0;
          let blackPoints = p.black_points || 0;
          
          // If points not in results table, calculate from pairing result
          if (whitePoints === 0 && blackPoints === 0 && p.result) {
            if (p.result === '1-0' || p.result === '1-0F') {
              whitePoints = 1;
              blackPoints = 0;
            } else if (p.result === '0-1' || p.result === '0-1F') {
              whitePoints = 0;
              blackPoints = 1;
            } else if (p.result === '1/2-1/2' || p.result === '1/2-1/2F') {
              whitePoints = 0.5;
              blackPoints = 0.5;
            }
          }
          
          matchesByRound[key].games.push({
            whiteTeam: p.white_team_id,
            blackTeam: p.black_team_id,
            whitePoints: whitePoints,
            blackPoints: blackPoints,
            result: p.result
          });
        }
      });

      // Process matches by round to build progressive scores correctly
      const rounds = [...new Set(Object.values(matchesByRound).map(m => m.round))].sort((a, b) => a - b);
      
      rounds.forEach(round => {
        const roundMatches = Object.values(matchesByRound).filter(m => m.round === round);
        
        roundMatches.forEach(match => {
          if (match.isBye) {
            // Bye: team gets 1 match point
            if (teamScores[match.team1Id]) {
              teamScores[match.team1Id].matchPoints += 1;
              teamScores[match.team1Id].matchWins++;
              teamScores[match.team1Id].matchesPlayed++;
            }
          } else {
            let team1Points = 0;
            let team2Points = 0;
            
            match.games.forEach(game => {
              if (game.whiteTeam === match.team1Id) {
                team1Points += game.whitePoints;
                team2Points += game.blackPoints;
              } else {
                team1Points += game.blackPoints;
                team2Points += game.whitePoints;
              }
            });

            // Determine match result
            let team1MatchPoints = 0;
            let team2MatchPoints = 0;
            let team1Result = 'loss';
            let team2Result = 'loss';

            if (team1Points > team2Points) {
              team1MatchPoints = 1;
              team2MatchPoints = 0;
              team1Result = 'win';
              team2Result = 'loss';
            } else if (team1Points < team2Points) {
              team1MatchPoints = 0;
              team2MatchPoints = 1;
              team1Result = 'loss';
              team2Result = 'win';
            } else {
              team1MatchPoints = 0.5;
              team2MatchPoints = 0.5;
              team1Result = 'draw';
              team2Result = 'draw';
            }

            // Update team scores
            if (teamScores[match.team1Id]) {
              teamScores[match.team1Id].matchPoints += team1MatchPoints;
              teamScores[match.team1Id].gamePoints += team1Points;
              teamScores[match.team1Id].matchesPlayed++;
              if (team1Result === 'win') teamScores[match.team1Id].matchWins++;
              else if (team1Result === 'draw') teamScores[match.team1Id].matchDraws++;
              else teamScores[match.team1Id].matchLosses++;
            }

            if (match.team2Id && teamScores[match.team2Id]) {
              teamScores[match.team2Id].matchPoints += team2MatchPoints;
              teamScores[match.team2Id].gamePoints += team2Points;
              teamScores[match.team2Id].matchesPlayed++;
              if (team2Result === 'win') teamScores[match.team2Id].matchWins++;
              else if (team2Result === 'draw') teamScores[match.team2Id].matchDraws++;
              else teamScores[match.team2Id].matchLosses++;
            }
          }
        });
        
        // After processing all matches in this round, update progressive scores
        Object.keys(teamScores).forEach(teamId => {
          teamScores[teamId].progressive[round - 1] = teamScores[teamId].matchPoints;
        });
      });

      // Get team members for each team
      const enhancedStandings = await Promise.all(teams.map(async (team) => {
        const members = await new Promise((resolve, reject) => {
          db.all(
            `SELECT 
              p.id,
              p.name,
              p.rating,
              COALESCE(SUM(r.points), 0) as player_points,
              COUNT(r.id) as games_played
            FROM team_members tm
            JOIN players p ON tm.player_id = p.id
            LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
            WHERE tm.team_id = ? AND p.status = 'active'
            GROUP BY p.id, p.name, p.rating
            ORDER BY COALESCE(SUM(r.points), 0) DESC, p.rating DESC`,
            [tournamentId, team.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });

        const score = teamScores[team.id] || {
          matchPoints: 0,
          gamePoints: 0,
          matchWins: 0,
          matchDraws: 0,
          matchLosses: 0,
          matchesPlayed: 0,
          progressive: Array(totalRounds).fill(0)
        };

        return {
          team_id: team.id,
          team_name: team.name,
          match_points: score.matchPoints,
          game_points: score.gamePoints,
          match_wins: score.matchWins,
          match_draws: score.matchDraws,
          match_losses: score.matchLosses,
          matches_played: score.matchesPlayed,
          progressive_scores: score.progressive,
          total_members: members.length,
          players: members.map(m => ({
            name: m.name,
            rating: m.rating,
            points: m.player_points,
            games_played: m.games_played
          }))
        };
      }));

      // Sort by match points, then game points
      enhancedStandings.sort((a, b) => {
        if (b.match_points !== a.match_points) {
          return b.match_points - a.match_points;
        }
        return b.game_points - a.game_points;
      });

      // Add rank
      enhancedStandings.forEach((standing, index) => {
        standing.rank = index + 1;
      });

      return res.json({
        success: true,
        standings: enhancedStandings,
        type: 'team-match',
        scoring_method: 'match_points',
        total_rounds: totalRounds
      });
    }

    // For team-swiss format, use the original individual player-based calculation
    const topN = top_n ? parseInt(top_n) : 4;
    
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
