/**
 * Team Tournament Management Service
 * Handles team creation, management, and team-based pairings
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Create a new team
 */
function createTeam(db, tournamentId, teamData) {
  return new Promise((resolve, reject) => {
    const teamId = uuidv4();
    const { name, captainId, boardCount = 4 } = teamData;
    
    db.run(
      'INSERT INTO teams (id, tournament_id, name, captain_id, board_count) VALUES (?, ?, ?, ?, ?)',
      [teamId, tournamentId, name, captainId, boardCount],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(teamId);
      }
    );
  });
}

/**
 * Add a player to a team
 */
function addTeamMember(db, teamId, playerId, boardNumber) {
  return new Promise((resolve, reject) => {
    const memberId = uuidv4();
    
    db.run(
      'INSERT INTO team_members (id, team_id, player_id, board_number) VALUES (?, ?, ?, ?)',
      [memberId, teamId, playerId, boardNumber],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(memberId);
      }
    );
  });
}

/**
 * Remove a player from a team
 */
function removeTeamMember(db, teamId, playerId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM team_members WHERE team_id = ? AND player_id = ?',
      [teamId, playerId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

/**
 * Get all teams for a tournament
 */
function getTournamentTeams(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        t.*,
        p.name as captain_name,
        COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN players p ON t.captain_id = p.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.tournament_id = ?
      GROUP BY t.id
      ORDER BY t.name
    `;
    
    db.all(query, [tournamentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Get team members for a specific team
 */
function getTeamMembers(db, teamId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        tm.*,
        p.name,
        p.rating,
        p.uscf_id,
        p.fide_id
      FROM team_members tm
      JOIN players p ON tm.player_id = p.id
      WHERE tm.team_id = ?
      ORDER BY tm.board_number
    `;
    
    db.all(query, [teamId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Generate team pairings for a round
 */
function generateTeamPairings(db, tournamentId, round) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get all active teams
      const teams = await getTournamentTeams(db, tournamentId);
      const activeTeams = teams.filter(team => team.status === 'active');
      
      if (activeTeams.length < 2) {
        resolve([]);
        return;
      }
      
      // Get team standings
      const teamStandings = await calculateTeamStandings(db, tournamentId);
      
      // Sort teams by score
      const sortedTeams = teamStandings.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        // Add tiebreakers here if needed
        return 0;
      });
      
      const pairings = [];
      const needsBye = sortedTeams.length % 2 === 1;
      
      if (needsBye) {
        // Give bye to lowest scoring team
        const byeTeam = sortedTeams.pop();
        pairings.push({
          team_id: byeTeam.team_id,
          opponent_team_id: null,
          is_bye: true,
          board: 1
        });
      }
      
      // Pair remaining teams
      for (let i = 0; i < sortedTeams.length; i += 2) {
        if (i + 1 < sortedTeams.length) {
          pairings.push({
            team_id: sortedTeams[i].team_id,
            opponent_team_id: sortedTeams[i + 1].team_id,
            is_bye: false,
            board: Math.floor(i / 2) + 1
          });
        }
      }
      
      resolve(pairings);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate team standings for team tournaments
 */
function calculateTeamStandings(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        t.id as team_id,
        t.name as team_name,
        COALESCE(SUM(tr.team_score), 0) as score,
        COUNT(tr.id) as matches_played,
        COALESCE(SUM(CASE WHEN tr.result = 'win' THEN 1 ELSE 0 END), 0) as wins,
        COALESCE(SUM(CASE WHEN tr.result = 'draw' THEN 1 ELSE 0 END), 0) as draws,
        COALESCE(SUM(CASE WHEN tr.result = 'loss' THEN 1 ELSE 0 END), 0) as losses
      FROM teams t
      LEFT JOIN team_results tr ON t.id = tr.team_id
      WHERE t.tournament_id = ? AND t.status = 'active'
      GROUP BY t.id, t.name
      ORDER BY score DESC, wins DESC, draws DESC
    `;
    
    db.all(query, [tournamentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Calculate team standings for individual tournaments with team scoring
 * Players play individually but their results contribute to team scores
 * Supports multiple scoring methods: all players, top N players, board-based
 */
async function calculateIndividualTournamentTeamStandings(db, tournamentId, scoringMethod = 'all_players', topN = null) {
  return new Promise((resolve, reject) => {
    let query;
    
    if (scoringMethod === 'top_players' && topN) {
      // Top N players scoring method
      query = `
        WITH team_player_scores AS (
          SELECT 
            t.id as team_id,
            t.name as team_name,
            tm.player_id,
            COALESCE(SUM(r.points), 0) as player_total_points,
            COUNT(r.id) as player_games_played,
            ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY COALESCE(SUM(r.points), 0) DESC, COUNT(r.id) DESC) as player_rank
          FROM teams t
          LEFT JOIN team_members tm ON t.id = tm.team_id
          LEFT JOIN results r ON tm.player_id = r.player_id AND r.tournament_id = ?
          WHERE t.tournament_id = ? AND t.status = 'active'
          GROUP BY t.id, t.name, tm.player_id
        ),
        team_top_scores AS (
          SELECT 
            team_id,
            team_name,
            SUM(player_total_points) as total_game_points,
            COUNT(*) as counted_players,
            SUM(player_games_played) as total_games_played
          FROM team_player_scores
          WHERE player_rank <= ?
          GROUP BY team_id, team_name
        )
        SELECT 
          tts.*,
          COUNT(tm.id) as total_member_count,
          COALESCE(tts.total_game_points / NULLIF(tts.counted_players, 0), 0) as avg_game_points
        FROM team_top_scores tts
        LEFT JOIN teams t ON tts.team_id = t.id
        LEFT JOIN team_members tm ON t.id = tm.team_id
        GROUP BY tts.team_id, tts.team_name, tts.total_game_points, tts.counted_players, tts.total_games_played
        ORDER BY tts.total_game_points DESC, avg_game_points DESC
      `;
      
      db.all(query, [tournamentId, tournamentId, topN], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    } else {
      // All players scoring method (default)
      query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          COUNT(tm.id) as member_count,
          COALESCE(SUM(r.points), 0) as total_game_points,
          COALESCE(AVG(r.points), 0) as avg_game_points,
          COUNT(r.id) as games_played,
          COALESCE(SUM(CASE WHEN r.points = 1 THEN 1 ELSE 0 END), 0) as wins,
          COALESCE(SUM(CASE WHEN r.points = 0.5 THEN 1 ELSE 0 END), 0) as draws,
          COALESCE(SUM(CASE WHEN r.points = 0 THEN 1 ELSE 0 END), 0) as losses
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN results r ON tm.player_id = r.player_id AND r.tournament_id = ?
        WHERE t.tournament_id = ? AND t.status = 'active'
        GROUP BY t.id, t.name
        ORDER BY total_game_points DESC, avg_game_points DESC, wins DESC
      `;
      
      db.all(query, [tournamentId, tournamentId], async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Add team-specific tiebreakers
        try {
          const enhancedRows = await addTeamTiebreakers(db, tournamentId, rows);
          resolve(enhancedRows);
        } catch (tiebreakerError) {
          console.error('Error calculating team tiebreakers:', tiebreakerError);
          resolve(rows); // Return basic standings if tiebreakers fail
        }
      });
    }
  });
}

/**
 * Add team-specific tiebreakers to team standings
 * Includes Buchholz, Sonneborn-Berger, and performance ratings for teams
 */
async function addTeamTiebreakers(db, tournamentId, teamStandings) {
  return new Promise((resolve, reject) => {
    // Calculate team Buchholz (sum of opponents' scores for all team members)
    const buchholzQuery = `
      SELECT 
        t.id as team_id,
        COALESCE(SUM(opponent_scores.opponent_total_points), 0) as team_buchholz
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN results r1 ON tm.player_id = r1.player_id AND r1.tournament_id = ?
      LEFT JOIN (
        SELECT 
          player_id,
          COALESCE(SUM(points), 0) as opponent_total_points
        FROM results 
        WHERE tournament_id = ?
        GROUP BY player_id
      ) opponent_scores ON r1.opponent_id = opponent_scores.player_id
      WHERE t.tournament_id = ? AND t.status = 'active'
      GROUP BY t.id
    `;
    
    db.all(buchholzQuery, [tournamentId, tournamentId, tournamentId], (err, buchholzRows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Create map of team Buchholz scores
      const buchholzMap = {};
      buchholzRows.forEach(row => {
        buchholzMap[row.team_id] = row.team_buchholz;
      });
      
      // Add tiebreakers to standings
      const enhancedStandings = teamStandings.map(team => ({
        ...team,
        team_buchholz: buchholzMap[team.team_id] || 0,
        team_performance_rating: calculateTeamPerformanceRating(team),
        team_sonneborn_berger: 0 // TODO: Implement team Sonneborn-Berger
      }));
      
      // Re-sort with tiebreakers
      enhancedStandings.sort((a, b) => {
        // Primary: Total game points
        if (a.total_game_points !== b.total_game_points) {
          return b.total_game_points - a.total_game_points;
        }
        
        // Secondary: Average game points
        if (a.avg_game_points !== b.avg_game_points) {
          return b.avg_game_points - a.avg_game_points;
        }
        
        // Tertiary: Team Buchholz
        if (a.team_buchholz !== b.team_buchholz) {
          return b.team_buchholz - a.team_buchholz;
        }
        
        // Quaternary: Wins
        if (a.wins !== b.wins) {
          return b.wins - a.wins;
        }
        
        // Quinary: Team performance rating
        if (a.team_performance_rating !== b.team_performance_rating) {
          return b.team_performance_rating - a.team_performance_rating;
        }
        
        // Final: Team name (alphabetical)
        return a.team_name.localeCompare(b.team_name);
      });
      
      resolve(enhancedStandings);
    });
  });
}

/**
 * Calculate team performance rating based on average team member performance
 */
function calculateTeamPerformanceRating(team) {
  if (!team.games_played || team.games_played === 0) {
    return 0;
  }
  
  // Simple performance rating calculation based on win percentage
  const winPercentage = team.total_game_points / team.games_played;
  
  // Base rating of 1200 + performance adjustment
  // This is a simplified calculation - in practice, you'd use actual opponent ratings
  const performanceRating = 1200 + (winPercentage - 0.5) * 400;
  
  return Math.round(performanceRating);
}

/**
 * Record team match result
 */
function recordTeamResult(db, tournamentId, round, teamId, opponentTeamId, teamScore, opponentScore) {
  return new Promise((resolve, reject) => {
    const resultId = uuidv4();
    let result = 'draw';
    
    if (teamScore > opponentScore) {
      result = 'win';
    } else if (teamScore < opponentScore) {
      result = 'loss';
    }
    
    db.run(
      'INSERT INTO team_results (id, tournament_id, team_id, round, opponent_team_id, team_score, opponent_score, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [resultId, tournamentId, teamId, round, opponentTeamId, teamScore, opponentScore, result],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(resultId);
      }
    );
  });
}

/**
 * Get team match results for a round
 */
function getTeamResults(db, tournamentId, round) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        tr.*,
        t1.name as team_name,
        t2.name as opponent_team_name
      FROM team_results tr
      JOIN teams t1 ON tr.team_id = t1.id
      LEFT JOIN teams t2 ON tr.opponent_team_id = t2.id
      WHERE tr.tournament_id = ? AND tr.round = ?
      ORDER BY tr.board
    `;
    
    db.all(query, [tournamentId, round], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  createTeam,
  addTeamMember,
  removeTeamMember,
  getTournamentTeams,
  getTeamMembers,
  generateTeamPairings,
  calculateTeamStandings,
  calculateIndividualTournamentTeamStandings,
  addTeamTiebreakers,
  calculateTeamPerformanceRating,
  recordTeamResult,
  getTeamResults
};
